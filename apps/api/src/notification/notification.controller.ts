import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { NotificationService } from './notification.service';
import type {
  NotificationTriggerResponseDto,
  NotificationLogQueryDto,
} from '@licensebox/shared';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger notification check for expiring licenses',
    description:
      'Checks all active licenses for upcoming expirations and sends email notifications. Authenticated via x-notification-secret header.',
  })
  @ApiHeader({
    name: 'x-notification-secret',
    description: 'Secret key for authenticating notification triggers',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification check completed',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing secret' })
  async trigger(
    @Headers('x-notification-secret') secret: string,
  ): Promise<NotificationTriggerResponseDto> {
    const expectedSecret = this.configService.get<string>('NOTIFICATION_SECRET');

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing notification secret');
    }

    return this.notificationService.checkExpiringLicenses();
  }

  @Get('logs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get notification logs' })
  @ApiResponse({
    status: 200,
    description: 'List of notification logs',
  })
  async getLogs(
    @Query() query: NotificationLogQueryDto,
  ) {
    return this.notificationService.findLogs({
      licenseId: query.licenseId,
      status: query.status,
      from: query.from,
      to: query.to,
      limit: query.limit ? +query.limit : undefined,
      offset: query.offset ? +query.offset : undefined,
    });
  }
}
