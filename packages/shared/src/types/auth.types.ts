// Authentication DTOs
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'User email', example: 'admin@example.com', type: String })
  email!: string;

  @ApiProperty({ description: 'User password', example: 'password123', type: String })
  password!: string;
}

export interface LoginResponseDto {
  access_token: string;
  user: UserProfileDto;
}

export interface UserProfileDto {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user data available in middleware context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

/**
 * DTO for changing password
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', type: String })
  currentPassword!: string;

  @ApiProperty({ description: 'New password', minLength: 6, type: String })
  newPassword!: string;
}

/**
 * Response for password change
 */
export interface ChangePasswordResponseDto {
  message: string;
}
