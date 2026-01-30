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
