import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { AICallService } from './ai-call.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';

@Controller('ai-call')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Roles(Role.MEMBER, Role.TENANT_OWNER)
export class AICallController {
  constructor(private readonly aiCallService: AICallService) { }

  @Post('initiate/:campaignItemId')
  initiateCall(@Req() req: TenantRequest, @Param('campaignItemId') campaignItemId: string) {
    return this.aiCallService.initiateCall(req.tenantId!, campaignItemId);
  }
}
