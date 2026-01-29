import { Injectable } from '@nestjs/common';
import { PrismaService as BasePrismaService } from '@licensebox/database';

@Injectable()
export class PrismaService extends BasePrismaService {}
