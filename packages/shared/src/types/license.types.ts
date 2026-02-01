// License DTOs

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
    isActive: boolean;
  };
}

export class CreateLicenseDto {
  key!: string;
  product!: string;
  clientId!: string;
  machineId?: string;
  expiresAt?: Date | string;
  isActive?: boolean;
}

export class UpdateLicenseDto {
  key?: string;
  product?: string;
  clientId?: string;
  machineId?: string | null;
  expiresAt?: Date | string | null;
  isActive?: boolean;
}

export class ValidateLicenseDto {
  key!: string;
  machineId?: string;
}

export interface ValidateLicenseResponseDto {
  valid: boolean;
  license?: LicenseWithClientDto;
  message?: string;
}

export class ActivateLicenseDto {
  key!: string;
  machineId!: string;
}

export interface ActivateLicenseResponseDto {
  success: boolean;
  license?: LicenseDto;
  message?: string;
}
