import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import {
  ClientDto,
  ClientWithLicensesDto,
  CreateClientDto,
  UpdateClientDto,
  RegenerateSecretResponseDto,
} from '@licensebox/shared';
import {
  AuditAction,
  AuditEntity,
  type AuditLogEvent,
} from '../audit/audit.types';

@Injectable()
export class ClientService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

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
            maxUsers: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            offlineToken: true,
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
            maxUsers: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            offlineToken: true,
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

  async create(data: CreateClientDto): Promise<RegenerateSecretResponseDto> {
    const secret = crypto.randomUUID();

    const client = await this.prisma.client.create({
      data: {
        name: data.name,
        description: data.description,
        contactEmail: data.contactEmail,
        isActive: data.isActive ?? true,
        secret,
      },
    });

    return {
      id: client.id,
      name: client.name,
      secret,
      message:
        'Client created successfully. Please save the secret securely as it will not be shown again.',
    };
  }

  async update(
    id: string,
    data: UpdateClientDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<ClientDto> {
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
        contactEmail: data.contactEmail,
        isActive: data.isActive,
      },
    });

    // Compute diff and emit audit event (fire-and-forget)
    const trackedFields = ['name', 'description', 'contactEmail', 'isActive'] as const;
    const changes: Record<string, { previous: unknown; updated: unknown }> = {};
    for (const field of trackedFields) {
      if (data[field] !== undefined && data[field] !== existingClient[field]) {
        changes[field] = {
          previous: existingClient[field],
          updated: data[field],
        };
      }
    }

    this.eventEmitter.emit('audit.log', {
      action: AuditAction.UPDATE,
      entity: AuditEntity.CLIENT,
      entityId: id,
      userId: actorId,
      userEmail: actorEmail,
      metadata: { name: existingClient.name, changes },
    } satisfies AuditLogEvent);

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

  /**
   * Find a client by their secret key
   */
  async findBySecret(secret: string): Promise<ClientDto | null> {
    const client = await this.prisma.client.findUnique({
      where: { secret },
    });

    return client as ClientDto | null;
  }

  /**
   * Regenerate the secret for a client
   */
  async regenerateSecret(id: string): Promise<RegenerateSecretResponseDto> {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    const newSecret = crypto.randomUUID();

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        secret: newSecret,
      },
    });

    return {
      id: client.id,
      name: client.name,
      secret: newSecret,
      message:
        'Secret regenerada con éxito. Por favor guárdela de forma segura ya que no se mostrará de nuevo.',
    };
  }
}
