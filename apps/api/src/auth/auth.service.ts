import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditAction, AuditEntity, type AuditLogEvent } from '../audit/audit.types';
import {
  JwtPayload,
  LoginResponseDto,
  UserProfileDto,
  ChangePasswordResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from '@licensebox/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async signIn(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.eventEmitter.emit('audit.log', {
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        userEmail: email,
        metadata: { reason: 'User not found' },
      } satisfies AuditLogEvent);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.eventEmitter.emit('audit.log', {
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        entityId: user.id,
        userEmail: email,
        metadata: { reason: 'Account inactive' },
      } satisfies AuditLogEvent);
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.eventEmitter.emit('audit.log', {
        action: AuditAction.LOGIN_FAILED,
        entity: AuditEntity.USER,
        entityId: user.id,
        userEmail: email,
        metadata: { reason: 'Invalid password' },
      } satisfies AuditLogEvent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const userWithoutPassword: UserProfileDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
    };

    this.eventEmitter.emit('audit.log', {
      action: AuditAction.LOGIN,
      entity: AuditEntity.USER,
      entityId: user.id,
      userEmail: user.email,
      userId: user.id,
    } satisfies AuditLogEvent);

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: userWithoutPassword,
    };
  }

  async validateUser(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const hashedNewPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to avoid revealing if an email exists
    if (!user || !user.isActive) {
      return {
        message:
          'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
      };
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await this.mailService.sendPasswordResetEmail(email, resetUrl);

    return {
      message:
        'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResponseDto> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o ha expirado.',
      );
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return {
      message:
        'Contraseña restablecida correctamente. Ahora puedes iniciar sesión.',
    };
  }
}
