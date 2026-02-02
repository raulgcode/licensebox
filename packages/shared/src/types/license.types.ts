// License DTOs
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface LicenseDto {
  id: string;
  key: string;
  product: string;
  clientId: string;
  machineId: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseWithClientDto extends LicenseDto {
  client: {
    id: string;
    name: string;
    description: string | null;
    secret: string;
    isActive: boolean;
  };
}

export class CreateLicenseDto {
  @ApiProperty({ description: 'Unique license key', example: 'XXXX-XXXX-XXXX-XXXX', type: String })
  key!: string;

  @ApiProperty({ description: 'Product name', example: 'Professional Plan', type: String })
  product!: string;

  @ApiProperty({ description: 'Client ID', example: 'uuid-of-client', type: String })
  clientId!: string;

  @ApiPropertyOptional({ description: 'Machine ID for binding', example: 'machine-fingerprint', type: String })
  machineId?: string;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2026-12-31T00:00:00.000Z', type: String })
  expiresAt?: Date | string;

  @ApiPropertyOptional({ description: 'Whether the license is active', default: true, type: Boolean })
  isActive?: boolean;
}

export class UpdateLicenseDto {
  @ApiPropertyOptional({ description: 'Unique license key', type: String })
  key?: string;

  @ApiPropertyOptional({ description: 'Product name', type: String })
  product?: string;

  @ApiPropertyOptional({ description: 'Client ID', type: String })
  clientId?: string;

  @ApiPropertyOptional({ description: 'Machine ID for binding', type: String, nullable: true })
  machineId?: string | null;

  @ApiPropertyOptional({ description: 'Expiration date', type: String, nullable: true })
  expiresAt?: Date | string | null;

  @ApiPropertyOptional({ description: 'Whether the license is active', type: Boolean })
  isActive?: boolean;
}

export class ValidateLicenseDto {
  @ApiProperty({
    description: 'The license key to validate',
    example: '7525a653-cc97-4014-bf65-7123b137275e',
    type: String,
  })
  key!: string;

  @ApiProperty({
    description: 'The client secret for authentication',
    example: 'cfe8f5f1-89d9-4848-b52e-f47bfb4c08da',
    type: String,
  })
  clientSecret!: string;

  @ApiPropertyOptional({
    description: 'Machine ID to verify binding',
    example: 'machine-fingerprint-hash',
    type: String,
  })
  machineId?: string;
}

export interface ValidateLicenseResponseDto {
  valid: boolean;
  license?: LicenseWithClientDto;
  message?: string;
}

export class ActivateLicenseDto {
  @ApiProperty({
    description: 'The license key to activate',
    example: '7525a653-cc97-4014-bf65-7123b137275e',
    type: String,
  })
  key!: string;

  @ApiProperty({
    description: 'The client secret for authentication',
    example: 'cfe8f5f1-89d9-4848-b52e-f47bfb4c08da',
    type: String,
  })
  clientSecret!: string;

  @ApiProperty({
    description: 'Machine ID to bind the license to',
    example: 'machine-fingerprint-hash',
    type: String,
  })
  machineId!: string;
}

export interface ActivateLicenseResponseDto {
  success: boolean;
  license?: LicenseDto;
  message?: string;
}
