// License DTOs
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface LicenseDto {
  id: string;
  key: string;
  product: string;
  clientId: string;
  machineId: string | null;
  maxUsers: number;
  expiresAt: Date | null;
  isActive: boolean;
  offlineToken: string | null;
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

  @ApiPropertyOptional({
    description: 'Machine ID for binding',
    example: 'machine-fingerprint',
    type: String,
  })
  machineId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of users',
    example: 10,
    default: 1,
    type: Number,
  })
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'Expiration date',
    example: '2026-12-31T00:00:00.000Z',
    type: String,
  })
  expiresAt?: Date | string;

  @ApiPropertyOptional({
    description: 'Whether the license is active',
    default: true,
    type: Boolean,
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Generate offline token for self-contained validation',
    default: false,
    type: Boolean,
  })
  generateOfflineToken?: boolean;
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

  @ApiPropertyOptional({ description: 'Maximum number of users', type: Number })
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Expiration date', type: String, nullable: true })
  expiresAt?: Date | string | null;

  @ApiPropertyOptional({ description: 'Whether the license is active', type: Boolean })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Regenerate offline token', default: false, type: Boolean })
  regenerateOfflineToken?: boolean;
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

// ============================================
// Offline License Types (Self-Contained)
// ============================================

/**
 * Payload structure for offline license validation
 * This data is signed and can be verified without server connection
 */
export interface OfflineLicensePayload {
  /** Client code identifier */
  code: string;
  /** Company/Client name */
  companyName: string;
  /** Product name */
  product: string;
  /** Maximum number of users allowed */
  maxUsers: number;
  /** License expiration date (ISO 8601 string) */
  expiresAt: string | null;
  /** License issue date (ISO 8601 string) */
  issuedAt: string;
  /** Unique license identifier */
  licenseId: string;
  /** License key */
  licenseKey: string;
  /** Machine ID bound to this license (null if not bound) */
  machineId: string | null;
}

/**
 * Complete offline license token structure
 */
export interface OfflineLicenseToken {
  /** License data payload */
  data: OfflineLicensePayload;
  /** RSA signature of the data (base64) */
  signature: string;
  /** Algorithm used for signing */
  algorithm: string;
  /** Version of the token format */
  version: number;
}

export class GenerateOfflineTokenDto {
  @ApiProperty({
    description: 'The license ID to generate offline token for',
    example: 'uuid-of-license',
    type: String,
  })
  licenseId!: string;
}

export class VerifyOfflineTokenDto {
  @ApiProperty({
    description: 'The offline license token (base64 encoded)',
    example: 'eyJkYXRhIjp7ImNvZGUiOiJDTEkwMDEiLC...',
    type: String,
  })
  token!: string;
}

export interface VerifyOfflineTokenResponseDto {
  valid: boolean;
  expired: boolean;
  payload?: OfflineLicensePayload;
  message: string;
}

export interface GenerateOfflineTokenResponseDto {
  success: boolean;
  token?: string;
  licenseId?: string;
  licenseKey?: string;
  product?: string;
  clientName?: string;
  message?: string;
}

export interface PublicKeyResponseDto {
  publicKey: string;
  algorithm: string;
  format: string;
}
