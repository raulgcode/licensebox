export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  LICENSE_ACTIVATE = 'LICENSE_ACTIVATE',
  LICENSE_DEACTIVATE = 'LICENSE_DEACTIVATE',
  GENERATE_OFFLINE_TOKEN = 'GENERATE_OFFLINE_TOKEN',
  REGENERATE_SECRET = 'REGENERATE_SECRET',
  TOGGLE_ACTIVE = 'TOGGLE_ACTIVE',
}

export enum AuditEntity {
  LICENSE = 'LICENSE',
  CLIENT = 'CLIENT',
  USER = 'USER',
}

export interface AuditLogEvent {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogOptions {
  action: AuditAction;
  entity: AuditEntity;
  /** Extract entityId from response body field (default: 'id') */
  entityIdFromResponse?: string;
  /** Extract entityId from route param instead of response */
  entityIdFromParam?: string;
  /**
   * Fields to extract from the response body and store as context metadata.
   * Supports dot notation for nested fields, e.g. 'license.key'.
   */
  metadataFromResponse?: string[];
}
