import { ApiPropertyOptional } from '@nestjs/swagger';

export interface NotificationLogDto {
  id: string;
  licenseId: string;
  recipientEmail: string;
  daysBeforeExpiry: number;
  sentAt: Date;
  status: string;
  errorMessage: string | null;
  license?: {
    key: string;
    product: string;
    expiresAt: Date | null;
    client: { name: string };
  };
}

export interface NotificationTriggerResponseDto {
  licensesChecked: number;
  notificationsSent: number;
  notificationsFailed: number;
}

export class NotificationLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter by license ID', type: String })
  licenseId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (SENT | FAILED)', type: String })
  status?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)', type: String })
  from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO string)', type: String })
  to?: string;

  @ApiPropertyOptional({ description: 'Number of records to return', type: Number })
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of records to skip', type: Number })
  offset?: number;
}
