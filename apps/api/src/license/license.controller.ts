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

@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  /**
   * Get all licenses
   */
  @Get()
  async findAll(): Promise<LicenseWithClientDto[]> {
    return this.licenseService.findAll();
  }

  /**
   * Get licenses by client ID
   */
  @Get('client/:clientId')
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
  async deactivate(
    @Param('key') key: string,
  ): Promise<ActivateLicenseResponseDto> {
    return this.licenseService.deactivate(key);
  }

  /**
   * Get a single license by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<LicenseWithClientDto> {
    return this.licenseService.findOne(id);
  }

  /**
   * Create a new license
   */
  @Post()
  async create(@Body() data: CreateLicenseDto): Promise<LicenseDto> {
    return this.licenseService.create(data);
  }

  /**
   * Update a license
   */
  @Put(':id')
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
  async delete(@Param('id') id: string): Promise<LicenseDto> {
    return this.licenseService.delete(id);
  }
}
