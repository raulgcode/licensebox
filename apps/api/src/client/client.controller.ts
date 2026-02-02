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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import {
  ClientDto,
  ClientWithLicensesDto,
  CreateClientDto,
  UpdateClientDto,
} from '@licensebox/shared';

@ApiTags('clients')
@ApiBearerAuth('JWT-auth')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * Get all clients
   */
  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiQuery({ name: 'includeLicenses', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of all clients' })
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
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiQuery({ name: 'includeLicenses', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Client details' })
  @ApiResponse({ status: 404, description: 'Client not found' })
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
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  async create(@Body() data: CreateClientDto): Promise<ClientDto> {
    return this.clientService.create(data);
  }

  /**
   * Update a client
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, description: 'Client updated successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
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
  @ApiOperation({ summary: 'Delete a client' })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 409, description: 'Client has associated licenses' })
  async delete(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.delete(id);
  }

  /**
   * Toggle client active status
   */
  @Post(':id/toggle-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle client active status' })
  @ApiResponse({ status: 200, description: 'Client status toggled' })
  async toggleActive(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.toggleActive(id);
  }

  /**
   * Regenerate the secret key for a client
   */
  @Post(':id/regenerate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate client secret',
    description:
      'Generate a new secret key for the client. The old secret will be invalidated.',
  })
  @ApiResponse({ status: 200, description: 'Secret regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async regenerateSecret(@Param('id') id: string): Promise<ClientDto> {
    return this.clientService.regenerateSecret(id);
  }
}
