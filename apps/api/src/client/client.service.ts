import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ClientDto,
  ClientWithLicensesDto,
  CreateClientDto,
  UpdateClientDto,
} from '@licensebox/shared';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  /**
   * Deactivate all licenses that have expired
   */
  private async deactivateExpiredLicenses(): Promise<void> {
    await this.prisma.license.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  async findAll(): Promise<ClientDto[]> {
    const clients = await this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return clients as ClientDto[];
  }

  async findAllWithLicenses(): Promise<ClientWithLicensesDto[]> {
    // Auto-deactivate expired licenses before fetching
    await this.deactivateExpiredLicenses();

    const clients = await this.prisma.client.findMany({
      include: {
        licenses: {
          select: {
            id: true,
            key: true,
            product: true,
            machineId: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return clients as ClientWithLicensesDto[];
  }

  async findOne(id: string): Promise<ClientDto> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    return client as ClientDto;
  }

  async findOneWithLicenses(id: string): Promise<ClientWithLicensesDto> {
    // Auto-deactivate expired licenses for this client before fetching
    await this.prisma.license.updateMany({
      where: {
        clientId: id,
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        licenses: {
          select: {
            id: true,
            key: true,
            product: true,
            machineId: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    return client as ClientWithLicensesDto;
  }

  async create(data: CreateClientDto): Promise<ClientDto> {
    const client = await this.prisma.client.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });

    return client as ClientDto;
  }

  async update(id: string, data: UpdateClientDto): Promise<ClientDto> {
    // Check if client exists
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
    });

    return client as ClientDto;
  }

  async delete(id: string): Promise<ClientDto> {
    // Check if client exists
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    // Check if client has licenses
    const licensesCount = await this.prisma.license.count({
      where: { clientId: id },
    });

    if (licensesCount > 0) {
      throw new ConflictException(
        `Cannot delete client with ${licensesCount} associated license(s). Delete the licenses first or reassign them.`,
      );
    }

    const client = await this.prisma.client.delete({
      where: { id },
    });

    return client as ClientDto;
  }

  async toggleActive(id: string): Promise<ClientDto> {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        isActive: !existingClient.isActive,
      },
    });

    return client as ClientDto;
  }
}
