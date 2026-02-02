// Client DTOs

export interface ClientDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWithLicensesDto extends ClientDto {
  licenses: {
    id: string;
    key: string;
    product: string;
    machineId: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export class CreateClientDto {
  name!: string;
  description?: string;
  isActive?: boolean;
}

export class UpdateClientDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}
