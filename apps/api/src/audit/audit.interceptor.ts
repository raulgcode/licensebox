import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { tap } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import { AUDIT_LOG_KEY } from './audit-log.decorator';
import type { AuditLogEvent, AuditLogOptions } from './audit.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string; email?: string };
      params?: Record<string, string>;
      ip?: string;
    }>();

    const user = request.user;

    return next.handle().pipe(
      tap((responseBody: Record<string, unknown> | null | undefined) => {
        let entityId: string | undefined;

        if (auditMeta.entityIdFromParam) {
          entityId = request.params?.[auditMeta.entityIdFromParam];
        } else {
          const field = auditMeta.entityIdFromResponse ?? 'id';
          entityId =
            (responseBody?.[field] as string | undefined) ??
            request.params?.['id'];
        }

        // Extract context fields from response body (supports dot notation: 'license.key')
        const context: Record<string, unknown> = { ip: request.ip };
        if (auditMeta.metadataFromResponse && responseBody) {
          for (const path of auditMeta.metadataFromResponse) {
            const parts = path.split('.');
            let value: unknown = responseBody;
            for (const part of parts) {
              value = (value as Record<string, unknown> | null)?.[part];
              if (value === undefined || value === null) break;
            }
            if (value !== undefined && value !== null) {
              context[parts[parts.length - 1]] = value;
            }
          }
        }

        const event: AuditLogEvent = {
          action: auditMeta.action,
          entity: auditMeta.entity,
          entityId,
          userId: user?.sub,
          userEmail: user?.email,
          metadata: context,
        };

        // Fire-and-forget: do not await, do not block the response
        this.eventEmitter.emit('audit.log', event);
      }),
    );
  }
}
