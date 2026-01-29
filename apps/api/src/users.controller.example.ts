// Example of using shared types and validations in NestJS

import { Controller, Post, Body, Get } from '@nestjs/common';
import type { User, ApiResponse } from '@licensebox/shared/types';
import {
  createUserSchema,
  type CreateUserInput,
} from '@licensebox/shared/validations';

@Controller('users')
export class UsersController {
  @Post()
  async createUser(@Body() body: CreateUserInput): Promise<ApiResponse<User>> {
    // Validate the request body
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    // Create user logic here
    const user: User = {
      id: 'user-123',
      email: result.data.email,
      name: result.data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: user,
    };
  }

  @Get()
  async getUsers(): Promise<ApiResponse<User[]>> {
    // Example response
    return {
      success: true,
      data: [],
    };
  }
}
