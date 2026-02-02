import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ClientService } from './client.service';
import {
  ClientDto,
  ClientWithLicensesDto,
  CreateClientDto,
  UpdateClientDto,
} from '@licensebox/shared';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * Get all clients
   */
  @Get()
  async findAll(
    @Query('includeLicenses') includeLicenses?: string,
  ): Promise<ClientDto[] | ClientWithLicensesDto[]> {
    if (includeLicenses === 'true') {
      return this.clientService.findAllWithLicenses();
    }
    return this.clientService.findAll();
  }

  /**
   * Get a single client by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('includeLicenses') includeLicenses?: string,
  ): Promise<ClientDto | ClientWithLicensesDto> {
    if (includeLicenses === 'true') {
      return this.clientService.findOneWithLicenses(id);
    }
    return this.clientService.findOne(id);
  }

  /**
   * Create a new client
   */
  @Post()
  async create(@Body() data: CreateClientDto): Promise<ClientDto> {
    return this.clientService.create(data);
  }

  /**
   * Update a client
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateClientDto,
  ): Promise<ClientDto> {
    return this.clientService.update(id, data);
  }

  /**
   * Delete a client
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.delete(id);
  }

  /**
   * Toggle client active status
   */
  @Post(':id/toggle-active')
  @HttpCode(HttpStatus.OK)
  async toggleActive(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.toggleActive(id);
  }

  /**
   * Regenerate the secret key for a client
   */
  @Post(':id/regenerate-secret')
  @HttpCode(HttpStatus.OK)
  async regenerateSecret(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.regenerateSecret(id);
  }
}
