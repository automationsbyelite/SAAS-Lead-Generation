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
import { LeadsService } from './leads.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateManyLeadsDto } from './dto/create-many-leads.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(req.tenantId!, dto);
  }

  @Post('bulk')
  createMany(@Req() req: TenantRequest, @Body() dto: CreateManyLeadsDto) {
    return this.leadsService.createManyLeads(req.tenantId!, dto.leads);
  }

  @Get()
  findAll(@Req() req: TenantRequest, @Query() query: GetLeadsQueryDto) {
    return this.leadsService.getLeads(req.tenantId!, query);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateLeadStatus(req.tenantId!, id, dto.status);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.leadsService.softDeleteLead(req.tenantId!, id);
  }
}
