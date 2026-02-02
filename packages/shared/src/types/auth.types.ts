// Authentication DTOs
export class LoginDto {
  email!: string;
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
  currentPassword!: string;
  newPassword!: string;
}

/**
 * Response for password change
 */
export interface ChangePasswordResponseDto {
  message: string;
}
