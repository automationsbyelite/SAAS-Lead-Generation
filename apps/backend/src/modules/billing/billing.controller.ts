import { Controller, Post, Body, Req, UseGuards, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Post('checkout')
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.TENANT_OWNER)
    async createCheckoutSession(
        @Req() req: TenantRequest,
        @Body('moduleType') moduleType: CampaignModuleType,
    ) {
        if (!moduleType) {
            throw new Error('moduleType is required');
        }
        return this.billingService.createCheckoutSession(req.tenantId!, moduleType);
    }

    @Post('webhook')
    async handleWebhook(@Req() req: RawBodyRequest<Request>) {
        const signature = req.headers['stripe-signature'] as string;
        if (!signature || !req.rawBody) {
            throw new Error('Missing stripe-signature or raw body');
        }

        await this.billingService.handleWebhook(signature, req.rawBody);
        return { received: true };
    }
}
