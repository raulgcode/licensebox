import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAllUsers() {
    return (this.prisma as any).user.findMany({
      include: {
        licenses: true,
      },
    });
  }

  @Post()
  async createUser(@Body() data: { email: string; name?: string }) {
    return (this.prisma as any).user.create({
      data,
    });
  }
}
