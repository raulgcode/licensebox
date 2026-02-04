import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { CryptoService } from './crypto.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LicenseController],
  providers: [LicenseService, CryptoService, PrismaService],
  exports: [LicenseService, CryptoService],
})
export class LicenseModule {}
