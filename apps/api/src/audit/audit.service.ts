import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Prisma } from '@licensebox/database';
import { PrismaService } from '../prisma.service';
import type { AuditLogEvent } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handles audit log events emitted by the interceptor.
   * Fire-and-forget: errors are caught and logged, never re-thrown.
   */
  private toCreateInput(event: AuditLogEvent): Prisma.AuditLogCreateInput {
    return {
      ...event,
      metadata: event.metadata as Prisma.InputJsonValue | undefined,
    };
  }

  @OnEvent('audit.log')
  async handleAuditLog(event: AuditLogEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: this.toCreateInput(event) });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  /**
   * Manual fire-and-forget logging (e.g., for login events in AuthService).
   * Errors are swallowed — audit must never break the main flow.
   */
  log(event: AuditLogEvent): void {
    this.prisma.auditLog
      .create({ data: this.toCreateInput(event) })
      .catch((err) => this.logger.error('Failed to write audit log', err));
  }

  async findAll(filters: {
    entity?: string;
    action?: string;
    entityId?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const { entity, action, entityId, userId, from, to, limit = 50, offset = 0 } = filters;

    const where: Record<string, unknown> = {};
    if (entity) where['entity'] = entity;
    if (action) where['action'] = action;
    if (entityId) where['entityId'] = entityId;
    if (userId) where['userId'] = userId;
    if (from || to) {
      where['createdAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
