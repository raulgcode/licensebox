// Client DTOs
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ClientDto {
  id: string;
  name: string;
  description: string | null;
  secret: string; // Secret key for API authentication
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
  @ApiProperty({ description: 'Client name', example: 'Acme Corporation', type: String })
  name!: string;

  @ApiPropertyOptional({ description: 'Client description', example: 'Enterprise customer', type: String })
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the client is active', default: true, type: Boolean })
  isActive?: boolean;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ description: 'Client name', type: String })
  name?: string;

  @ApiPropertyOptional({ description: 'Client description', type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Whether the client is active', type: Boolean })
  isActive?: boolean;
}
