import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
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
import { AuditLog } from '../audit/audit-log.decorator';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import type {
  LicenseDto,
  LicenseWithClientDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  ValidateLicenseDto,
  ValidateLicenseResponseDto,
  ActivateLicenseDto,
  ActivateLicenseResponseDto,
  GenerateOfflineTokenDto,
  GenerateOfflineTokenResponseDto,
  VerifyOfflineTokenDto,
  VerifyOfflineTokenResponseDto,
} from '@licensebox/shared';
import type { PublicKeyResponseDto } from '@licensebox/shared';

@ApiTags('licenses')
@ApiBearerAuth('JWT-auth')
@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // ============================================
  // Static routes MUST come before dynamic routes
  // ============================================

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
  @AuditLog({
    action: AuditAction.LICENSE_ACTIVATE,
    entity: AuditEntity.LICENSE,
    entityIdFromResponse: 'id',
    metadataFromResponse: [
      'license.key',
      'license.product',
      'license.machineId',
    ],
  })
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

  // ============================================
  // Offline License Endpoints (static paths - before dynamic)
  // ============================================

  /**
   * Generate an offline license token for a license
   * This token can be validated client-side without server connection
   */
  @AuditLog({
    action: AuditAction.GENERATE_OFFLINE_TOKEN,
    entity: AuditEntity.LICENSE,
    entityIdFromResponse: 'licenseId',
    metadataFromResponse: ['licenseKey', 'product', 'clientName'],
  })
  @Post('offline/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate offline license token',
    description:
      'Generate a self-contained license token that can be validated offline using the public key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Offline token generated successfully',
  })
  @ApiResponse({ status: 404, description: 'License not found' })
  async generateOfflineToken(
    @Body() data: GenerateOfflineTokenDto,
  ): Promise<GenerateOfflineTokenResponseDto> {
    return this.licenseService.generateOfflineToken(data.licenseId);
  }

  /**
   * Verify an offline license token (public endpoint)
   * Clients can also do this locally with just the public key
   */
  @Public()
  @Post('offline/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify offline license token',
    description:
      'Verify a self-contained license token. This can also be done client-side with the public key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token verification result',
  })
  verifyOfflineToken(
    @Body() data: VerifyOfflineTokenDto,
  ): VerifyOfflineTokenResponseDto {
    return this.licenseService.verifyOfflineToken(data.token);
  }

  /**
   * Get the public key for client-side offline verification
   */
  @Public()
  @Get('offline/public-key')
  @ApiOperation({
    summary: 'Get public key for offline verification',
    description:
      'Get the public key needed to verify offline license tokens client-side. Embed this in your .NET application.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public key for verification',
  })
  getPublicKey(): PublicKeyResponseDto {
    return this.licenseService.getPublicKey();
  }

  // ============================================
  // Dynamic routes (with :id or :key parameters)
  // ============================================

  /**
   * Create a new license
   */
  @AuditLog({
    action: AuditAction.CREATE,
    entity: AuditEntity.LICENSE,
    metadataFromResponse: ['key', 'product', 'clientId', 'isActive'],
  })
  @Post()
  @ApiOperation({ summary: 'Create a new license' })
  @ApiResponse({ status: 201, description: 'License created successfully' })
  @ApiResponse({ status: 409, description: 'License key already exists' })
  async create(@Body() data: CreateLicenseDto): Promise<LicenseDto> {
    return this.licenseService.create(data);
  }

  /**
   * Deactivate a license (remove machine binding) - requires auth
   */
  @AuditLog({
    action: AuditAction.LICENSE_DEACTIVATE,
    entity: AuditEntity.LICENSE,
    entityIdFromParam: 'key',
    metadataFromResponse: ['license.key', 'license.product'],
  })
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
   * Update a license
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a license' })
  @ApiResponse({ status: 200, description: 'License updated successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateLicenseDto,
    @Req() req: { user?: { sub?: string; email?: string } },
  ): Promise<LicenseDto> {
    return this.licenseService.update(id, data, req.user?.sub, req.user?.email);
  }

  /**
   * Delete a license
   */
  @AuditLog({
    action: AuditAction.DELETE,
    entity: AuditEntity.LICENSE,
    entityIdFromParam: 'id',
    metadataFromResponse: ['key', 'product', 'clientId'],
  })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a license' })
  @ApiResponse({ status: 200, description: 'License deleted successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async delete(@Param('id') id: string): Promise<LicenseDto> {
    return this.licenseService.delete(id);
  }
}
