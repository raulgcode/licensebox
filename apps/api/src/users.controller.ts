import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  getAllUsers() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (this.prisma as any).user.findMany({
      include: {
        licenses: true,
      },
    });
  }

  @Post()
  createUser(@Body() data: { email: string; name?: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (this.prisma as any).user.create({
      data,
    });
  }
}
