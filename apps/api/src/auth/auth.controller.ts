import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import {
  LoginDto,
  LoginResponseDto,
  UserProfileDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from '@licensebox/shared';
import type { JwtPayload } from '@licensebox/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Get('profile')
  getProfile(@Request() req: Request & { user: JwtPayload }): JwtPayload {
    return req.user;
  }

  @Get('me')
  async getCurrentUser(
    @Request() req: Request & { user: JwtPayload },
  ): Promise<UserProfileDto> {
    return this.authService.validateUser(req.user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: Request & { user: JwtPayload },
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return await this.authService.changePassword(
      req.user.sub,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
