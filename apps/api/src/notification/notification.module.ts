import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ConfigModule, MailModule],
  providers: [NotificationService, PrismaService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
