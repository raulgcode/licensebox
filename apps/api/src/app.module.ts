import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
    // Rate limiting: Only apply in production
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return [
          {
            name: 'short',
            ttl: 60000, // 60 seconds
            limit: isProduction ? 10 : 1000, // 10 in prod, 1000 in dev
          },
          {
            name: 'long',
            ttl: 60000 * 60, // 1 hour
            limit: isProduction ? 100 : 10000, // 100 in prod, 10000 in dev
          },
        ];
      },
    }),
    AuthModule,
    LicenseModule,
    ClientModule,
  ],
  controllers: [AppController, UsersController],
  providers: [
    AppService,
    PrismaService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
