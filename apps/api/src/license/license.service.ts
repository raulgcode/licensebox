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
  GenerateOfflineTokenResponseDto,
  VerifyOfflineTokenResponseDto,
  PublicKeyResponseDto,
  OfflineLicensePayload,
} from '@licensebox/shared';
import { CryptoService } from './crypto.service';

@Injectable()
export class LicenseService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
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
    const expiresAtDate = data.expiresAt ? new Date(data.expiresAt) : null;
    if (expiresAtDate && expiresAtDate < new Date()) {
      isActive = false;
    }

    // Create the license first
    const license = await this.prisma.license.create({
      data: {
        key: data.key,
        product: data.product,
        clientId: data.clientId,
        machineId: data.machineId || null,
        maxUsers: data.maxUsers ?? 1,
        expiresAt: expiresAtDate,
        isActive,
      },
    });

    // Generate offline token if requested
    if (data.generateOfflineToken) {
      const offlineToken = this.generateOfflineTokenForLicense(
        license.id,
        license.key,
        data.product,
        client.id,
        client.name,
        data.maxUsers ?? 1,
        expiresAtDate,
      );

      // Update license with the token
      const updatedLicense = await this.prisma.license.update({
        where: { id: license.id },
        data: { offlineToken },
      });

      return updatedLicense as LicenseDto;
    }

    return license as LicenseDto;
  }

  /**
   * Generate an offline license token for a given license
   */
  private generateOfflineTokenForLicense(
    licenseId: string,
    licenseKey: string,
    product: string,
    clientCode: string,
    companyName: string,
    maxUsers: number,
    expiresAt: Date | null,
  ): string {
    const payload: OfflineLicensePayload = {
      code: clientCode,
      companyName,
      product,
      maxUsers,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      issuedAt: new Date().toISOString(),
      licenseId,
      licenseKey,
    };

    return this.cryptoService.generateOfflineLicenseToken(payload);
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
        ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Regenerate offline token if requested
    if (data.regenerateOfflineToken) {
      const client = await this.prisma.client.findUnique({
        where: { id: license.clientId },
      });

      if (client) {
        const offlineToken = this.generateOfflineTokenForLicense(
          license.id,
          license.key,
          license.product,
          client.id,
          client.name,
          license.maxUsers,
          license.expiresAt,
        );

        const updatedLicense = await this.prisma.license.update({
          where: { id: license.id },
          data: { offlineToken },
        });

        return updatedLicense as LicenseDto;
      }
    }

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

  // ============================================
  // Offline License Methods
  // ============================================

  /**
   * Generate an offline token for an existing license
   */
  async generateOfflineToken(
    licenseId: string,
  ): Promise<GenerateOfflineTokenResponseDto> {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        client: true,
      },
    });

    if (!license) {
      return {
        success: false,
        message: 'License not found',
      };
    }

    if (!license.isActive) {
      return {
        success: false,
        message: 'License is inactive',
      };
    }

    const offlineToken = this.generateOfflineTokenForLicense(
      license.id,
      license.key,
      license.product,
      license.client.id,
      license.client.name,
      license.maxUsers,
      license.expiresAt,
    );

    // Update license with the token
    await this.prisma.license.update({
      where: { id: licenseId },
      data: { offlineToken },
    });

    return {
      success: true,
      token: offlineToken,
      message: 'Offline token generated successfully',
    };
  }

  /**
   * Verify an offline license token (public endpoint)
   * This can also be done client-side with just the public key
   */
  verifyOfflineToken(token: string): VerifyOfflineTokenResponseDto {
    try {
      const payload = this.cryptoService.verifyOfflineLicenseToken(token);
      const validation = this.cryptoService.validateLicensePayload(payload);

      return {
        valid: validation.valid,
        expired: validation.expired,
        payload,
        message: validation.message,
      };
    } catch (error) {
      return {
        valid: false,
        expired: false,
        message: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get the public key for client-side verification
   */
  getPublicKey(): PublicKeyResponseDto {
    return {
      publicKey: this.cryptoService.getPublicKey(),
      algorithm: 'RSA-SHA256',
      format: 'PEM (SPKI)',
    };
  }
}
