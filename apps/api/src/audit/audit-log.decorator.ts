import { SetMetadata } from '@nestjs/common';
import type { AuditLogOptions } from './audit.types';

export const AUDIT_LOG_KEY = 'audit_log';

export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
