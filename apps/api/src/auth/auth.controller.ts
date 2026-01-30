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
import { LoginDto, LoginResponseDto, UserProfileDto } from '@licensebox/shared';
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
}
