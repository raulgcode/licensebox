import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UsersController } from './users.controller';
import { AuthModule } from './auth/auth.module';
import { LicenseModule } from './license/license.module';
import { ClientModule } from './client/client.module';
import { join } from 'path';
import { existsSync } from 'fs';

// In production, use system environment variables
// In development, use .env file from project root
const rootEnvPath = join(__dirname, '../../../.env');
const envFilePath = existsSync(rootEnvPath) ? rootEnvPath : undefined;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      // Always allow system environment variables to override
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    AuthModule,
    LicenseModule,
    ClientModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
