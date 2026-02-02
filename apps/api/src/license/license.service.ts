import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  LicenseDto,
  LicenseWithClientDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  ValidateLicenseResponseDto,
  ActivateLicenseResponseDto,
} from '@licensebox/shared';

@Injectable()
export class LicenseService {
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

  async findAll(): Promise<LicenseWithClientDto[]> {
    // Auto-deactivate expired licenses
    await this.deactivateExpiredLicenses();

    const licenses = await this.prisma.license.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return licenses as LicenseWithClientDto[];
  }

  async findOne(id: string): Promise<LicenseWithClientDto> {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    if (!license) {
      throw new NotFoundException(`License with ID "${id}" not found`);
    }

    return license as LicenseWithClientDto;
  }

  async findByKey(key: string): Promise<LicenseWithClientDto | null> {
    const license = await this.prisma.license.findUnique({
      where: { key },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            description: true,
            secret: true,
            isActive: true,
          },
        },
      },
    });

    return license as LicenseWithClientDto | null;
  }

  async findByClientId(clientId: string): Promise<LicenseDto[]> {
    // Auto-deactivate expired licenses for this client
    await this.prisma.license.updateMany({
      where: {
        clientId,
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const licenses = await this.prisma.license.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
    return licenses as LicenseDto[];
  }

  async create(data: CreateLicenseDto): Promise<LicenseDto> {
    // Check if key already exists
    const existingLicense = await this.prisma.license.findUnique({
      where: { key: data.key },
    });

    if (existingLicense) {
      throw new ConflictException(
        `License with key "${data.key}" already exists`,
      );
    }

    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new NotFoundException(
        `Client with ID "${data.clientId}" not found`,
      );
    }

    // Check if the expiration date is in the past - if so, force isActive to false
    let isActive = data.isActive ?? true;
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        isActive = false;
      }
    }

    const license = await this.prisma.license.create({
      data: {
        key: data.key,
        product: data.product,
        clientId: data.clientId,
        machineId: data.machineId || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive,
      },
    });

    return license as LicenseDto;
  }

  async update(id: string, data: UpdateLicenseDto): Promise<LicenseDto> {
    // Check if license exists
    const existingLicense = await this.prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      throw new NotFoundException(`License with ID "${id}" not found`);
    }

    // If updating key, check it's not already in use
    if (data.key && data.key !== existingLicense.key) {
      const licenseWithKey = await this.prisma.license.findUnique({
        where: { key: data.key },
      });

      if (licenseWithKey) {
        throw new ConflictException(
          `License with key "${data.key}" already exists`,
        );
      }
    }

    // If updating clientId, verify client exists
    if (data.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: data.clientId },
      });

      if (!client) {
        throw new NotFoundException(
          `Client with ID "${data.clientId}" not found`,
        );
      }
    }

    // Check if the new expiration date is in the past - if so, force isActive to false
    let isActive = data.isActive;
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        isActive = false;
      }
    }

    const license = await this.prisma.license.update({
      where: { id },
      data: {
        ...(data.key !== undefined && { key: data.key }),
        ...(data.product !== undefined && { product: data.product }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.machineId !== undefined && { machineId: data.machineId }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return license as LicenseDto;
  }

  async delete(id: string): Promise<LicenseDto> {
    const existingLicense = await this.prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      throw new NotFoundException(`License with ID "${id}" not found`);
    }

    const license = await this.prisma.license.delete({
      where: { id },
    });

    return license as LicenseDto;
  }

  async validate(
    key: string,
    clientSecret: string,
    machineId?: string,
  ): Promise<ValidateLicenseResponseDto> {
    const license = await this.findByKey(key);

    if (!license) {
      return {
        valid: false,
        message: 'License not found',
      };
    }

    // Validate clientSecret matches the license's client
    if (license.client.secret !== clientSecret) {
      return {
        valid: false,
        message: 'Invalid client credentials',
      };
    }

    if (!license.isActive) {
      return {
        valid: false,
        message: 'License is inactive',
        license,
      };
    }

    if (!license.client.isActive) {
      return {
        valid: false,
        message: 'Client is inactive',
        license,
      };
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return {
        valid: false,
        message: 'License has expired',
        license,
      };
    }

    // Check machine ID if provided and license has one
    if (license.machineId && machineId && license.machineId !== machineId) {
      return {
        valid: false,
        message: 'License is bound to a different machine',
        license,
      };
    }

    return {
      valid: true,
      license,
    };
  }

  async activate(
    key: string,
    clientSecret: string,
    machineId: string,
  ): Promise<ActivateLicenseResponseDto> {
    const license = await this.findByKey(key);

    if (!license) {
      return {
        success: false,
        message: 'License not found',
      };
    }

    // Validate clientSecret matches the license's client
    if (license.client.secret !== clientSecret) {
      return {
        success: false,
        message: 'Invalid client credentials',
      };
    }

    if (!license.isActive) {
      return {
        success: false,
        message: 'License is inactive',
      };
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return {
        success: false,
        message: 'License has expired',
      };
    }

    // Check if already bound to another machine
    if (license.machineId && license.machineId !== machineId) {
      return {
        success: false,
        message: 'License is already bound to a different machine',
      };
    }

    // If already bound to the same machine, just return success
    if (license.machineId === machineId) {
      return {
        success: true,
        license,
        message: 'License already activated on this machine',
      };
    }

    // Bind the license to this machine
    const updatedLicense = await this.prisma.license.update({
      where: { key },
      data: { machineId },
    });

    return {
      success: true,
      license: updatedLicense as LicenseDto,
      message: 'License successfully activated',
    };
  }

  async deactivate(key: string): Promise<ActivateLicenseResponseDto> {
    const license = await this.findByKey(key);

    if (!license) {
      return {
        success: false,
        message: 'License not found',
      };
    }

    // Remove machine binding
    const updatedLicense = await this.prisma.license.update({
      where: { key },
      data: { machineId: null },
    });

    return {
      success: true,
      license: updatedLicense as LicenseDto,
      message: 'License successfully deactivated',
    };
  }
}
