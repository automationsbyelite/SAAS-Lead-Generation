import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { GetCampaignsQueryDto } from './dto/get-campaigns-query.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(req.tenantId!, req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: TenantRequest, @Query() query: GetCampaignsQueryDto) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    // Pass null if Super Admin to trigger a global search, otherwise enforce tenant bound
    return this.campaignsService.getCampaigns(isSuperAdmin ? null : req.tenantId!, query);
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.campaignsService.getCampaignDetails(req.tenantId!, id);
  }

  @Post(':id/start')
  start(@Req() req: TenantRequest, @Param('id') id: string) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.campaignsService.startCampaign(isSuperAdmin ? null : req.tenantId!, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    return this.campaignsService.updateCampaignStatus(req.tenantId!, id, dto.status);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.campaignsService.softDeleteCampaign(isSuperAdmin ? null : req.tenantId!, id);
  }
}
