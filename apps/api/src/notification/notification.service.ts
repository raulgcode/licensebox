import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import {
  AuditAction,
  AuditEntity,
  type AuditLogEvent,
} from '../audit/audit.types';
import type {
  NotificationTriggerResponseDto,
  NotificationLogDto,
} from '@licensebox/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getThresholds(): number[] {
    const raw = this.configService.get<string>('NOTIFICATION_DAYS', '30,15,7,1');
    return raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);
  }

  private getGlobalRecipients(): string[] {
    const raw = this.configService.get<string>('NOTIFICATION_RECIPIENTS', '');
    if (!raw.trim()) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async checkExpiringLicenses(): Promise<NotificationTriggerResponseDto> {
    const thresholds = this.getThresholds();
    const globalRecipients = this.getGlobalRecipients();

    if (thresholds.length === 0) {
      this.logger.warn('No valid notification thresholds configured');
      return { licensesChecked: 0, notificationsSent: 0, notificationsFailed: 0 };
    }

    const maxDays = Math.max(...thresholds);
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxDays + 1); // +1 to include the boundary day

    // Single query: all active licenses expiring within the max threshold window
    const licenses = await this.prisma.license.findMany({
      where: {
        isActive: true,
        expiresAt: {
          not: null,
          gt: now,
          lte: maxDate,
        },
      },
      include: {
        client: {
          select: { name: true, contactEmail: true },
        },
        notificationLogs: {
          select: { daysBeforeExpiry: true, recipientEmail: true },
        },
      },
    });

    let notificationsSent = 0;
    let notificationsFailed = 0;

    for (const license of licenses) {
      const expiresAt = license.expiresAt!;
      const diffMs = expiresAt.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Find the matching threshold (the largest threshold <= daysUntilExpiry)
      const matchingThreshold = thresholds.find((t) => daysUntilExpiry <= t);
      if (!matchingThreshold) continue;

      // Determine recipients
      const recipients = new Set<string>(globalRecipients);
      if (license.client.contactEmail) {
        recipients.add(license.client.contactEmail);
      }

      if (recipients.size === 0) continue;

      // Check which recipients have already been notified at this threshold
      const alreadyNotified = new Set(
        license.notificationLogs
          .filter((log) => log.daysBeforeExpiry === matchingThreshold)
          .map((log) => log.recipientEmail),
      );

      for (const recipientEmail of recipients) {
        if (alreadyNotified.has(recipientEmail)) continue;

        try {
          await this.mailService.sendLicenseExpirationEmail(recipientEmail, {
            key: license.key,
            product: license.product,
            clientName: license.client.name,
            expiresAt,
            daysRemaining: daysUntilExpiry,
          });

          await this.createNotificationLog(
            license.id,
            recipientEmail,
            matchingThreshold,
            'SENT',
          );

          this.eventEmitter.emit('audit.log', {
            action: AuditAction.NOTIFICATION_SENT,
            entity: AuditEntity.NOTIFICATION,
            entityId: license.id,
            metadata: {
              licenseKey: license.key,
              recipientEmail,
              daysBeforeExpiry: matchingThreshold,
              product: license.product,
              clientName: license.client.name,
            },
          } satisfies AuditLogEvent);

          notificationsSent++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          await this.createNotificationLog(
            license.id,
            recipientEmail,
            matchingThreshold,
            'FAILED',
            errorMessage,
          );

          this.eventEmitter.emit('audit.log', {
            action: AuditAction.NOTIFICATION_FAILED,
            entity: AuditEntity.NOTIFICATION,
            entityId: license.id,
            metadata: {
              licenseKey: license.key,
              recipientEmail,
              daysBeforeExpiry: matchingThreshold,
              error: errorMessage,
            },
          } satisfies AuditLogEvent);

          notificationsFailed++;
        }
      }
    }

    // Emit summary audit event
    const summary: NotificationTriggerResponseDto = {
      licensesChecked: licenses.length,
      notificationsSent,
      notificationsFailed,
    };

    this.eventEmitter.emit('audit.log', {
      action: AuditAction.NOTIFICATION_RUN,
      entity: AuditEntity.NOTIFICATION,
      metadata: { ...summary },
    } satisfies AuditLogEvent);

    this.logger.log(
      `Notification check complete: ${licenses.length} licenses checked, ${notificationsSent} sent, ${notificationsFailed} failed`,
    );

    return summary;
  }

  private async createNotificationLog(
    licenseId: string,
    recipientEmail: string,
    daysBeforeExpiry: number,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          licenseId,
          recipientEmail,
          daysBeforeExpiry,
          status,
          errorMessage: errorMessage ?? null,
        },
      });
    } catch (error: unknown) {
      // P2002 = unique constraint violation (already sent)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        this.logger.debug(
          `Notification already sent for license ${licenseId} to ${recipientEmail} at ${daysBeforeExpiry} days`,
        );
        return;
      }
      this.logger.error('Failed to create notification log', error);
    }
  }

  async findLogs(filters: {
    licenseId?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: NotificationLogDto[]; total: number }> {
    const { licenseId, status, from, to, limit = 50, offset = 0 } = filters;

    const where: Record<string, unknown> = {};
    if (licenseId) where['licenseId'] = licenseId;
    if (status) where['status'] = status;
    if (from || to) {
      where['sentAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        include: {
          license: {
            select: {
              key: true,
              product: true,
              expiresAt: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { items: items as NotificationLogDto[], total };
  }
}
