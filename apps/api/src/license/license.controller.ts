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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LicenseService } from './license.service';
import { Public } from '../auth/decorators/public.decorator';
import {
  LicenseDto,
  LicenseWithClientDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  ValidateLicenseDto,
  ValidateLicenseResponseDto,
  ActivateLicenseDto,
  ActivateLicenseResponseDto,
} from '@licensebox/shared';

@ApiTags('licenses')
@ApiBearerAuth('JWT-auth')
@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  /**
   * Get all licenses
   */
  @Get()
  @ApiOperation({ summary: 'Get all licenses' })
  @ApiResponse({ status: 200, description: 'List of all licenses' })
  async findAll(): Promise<LicenseWithClientDto[]> {
    return this.licenseService.findAll();
  }

  /**
   * Get licenses by client ID
   */
  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get licenses by client ID' })
  @ApiResponse({ status: 200, description: 'List of licenses for the client' })
  async findByClientId(
    @Param('clientId') clientId: string,
  ): Promise<LicenseDto[]> {
    return this.licenseService.findByClientId(clientId);
  }

  /**
   * Validate a license (public endpoint for license validation)
   */
  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a license',
    description:
      'Public endpoint to validate a license. Requires license key and client secret.',
  })
  @ApiResponse({
    status: 200,
    description: 'License validation result',
  })
  async validate(
    @Body() data: ValidateLicenseDto,
  ): Promise<ValidateLicenseResponseDto> {
    return this.licenseService.validate(
      data.key,
      data.clientSecret,
      data.machineId,
    );
  }

  /**
   * Activate a license on a machine (public endpoint)
   */
  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a license on a machine',
    description:
      'Public endpoint to bind a license to a specific machine. Requires license key, client secret, and machine ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'License activation result',
  })
  async activate(
    @Body() data: ActivateLicenseDto,
  ): Promise<ActivateLicenseResponseDto> {
    return this.licenseService.activate(
      data.key,
      data.clientSecret,
      data.machineId,
    );
  }

  /**
   * Deactivate a license (remove machine binding) - requires auth
   */
  @Post(':key/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate a license',
    description:
      'Remove machine binding from a license. Requires authentication.',
  })
  @ApiResponse({ status: 200, description: 'License deactivated successfully' })
  async deactivate(
    @Param('key') key: string,
  ): Promise<ActivateLicenseResponseDto> {
    return this.licenseService.deactivate(key);
  }

  /**
   * Get a single license by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a license by ID' })
  @ApiResponse({ status: 200, description: 'License details' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async findOne(@Param('id') id: string): Promise<LicenseWithClientDto> {
    return this.licenseService.findOne(id);
  }

  /**
   * Create a new license
   */
  @Post()
  @ApiOperation({ summary: 'Create a new license' })
  @ApiResponse({ status: 201, description: 'License created successfully' })
  @ApiResponse({ status: 409, description: 'License key already exists' })
  async create(@Body() data: CreateLicenseDto): Promise<LicenseDto> {
    return this.licenseService.create(data);
  }

  /**
   * Update a license
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a license' })
  @ApiResponse({ status: 200, description: 'License updated successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateLicenseDto,
  ): Promise<LicenseDto> {
    return this.licenseService.update(id, data);
  }

  /**
   * Delete a license
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a license' })
  @ApiResponse({ status: 200, description: 'License deleted successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async delete(@Param('id') id: string): Promise<LicenseDto> {
    return this.licenseService.delete(id);
  }
}
