import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    Res,
    UseGuards,
    Req,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SocialAccountService } from './social-account.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';

@Controller('social-publisher/accounts')
export class SocialAccountController {
    private readonly logger = new Logger(SocialAccountController.name);

    constructor(private readonly accountService: SocialAccountService) { }

    // ─── FACEBOOK OAUTH ─────────────────────────────────────

    @Get('facebook/connect')
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
    async connectFacebook(@Req() req: TenantRequest, @Res() res: Response) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        const url = this.accountService.getFacebookAuthUrl(
            req.tenantId || '',
            req.user?.userId || '',
        );
        res.json({ url });
    }

    @Get('facebook/callback')
    async facebookCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        try {
            const { tenantId } = await this.accountService.handleFacebookCallback(code, state);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?connected=facebook`);
        } catch (err) {
            this.logger.error('Facebook OAuth error:', err);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?error=facebook_connection_failed`);
        }
    }

    // ─── INSTAGRAM OAUTH ────────────────────────────────────

    @Get('instagram/connect')
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
    async connectInstagram(@Req() req: TenantRequest, @Res() res: Response) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        const url = this.accountService.getInstagramAuthUrl(
            req.tenantId || '',
            req.user?.userId || '',
        );
        res.json({ url });
    }

    @Get('instagram/callback')
    async instagramCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        try {
            await this.accountService.handleInstagramCallback(code, state);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?connected=instagram`);
        } catch (err) {
            this.logger.error('Instagram OAuth error:', err);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?error=instagram_connection_failed`);
        }
    }

    // ─── LINKEDIN OAUTH ─────────────────────────────────────

    @Get('linkedin/connect')
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
    async connectLinkedin(@Req() req: TenantRequest, @Res() res: Response) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        const url = this.accountService.getLinkedinAuthUrl(
            req.tenantId || '',
            req.user?.userId || '',
        );
        res.json({ url });
    }

    @Get('linkedin/callback')
    async linkedinCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        try {
            await this.accountService.handleLinkedinCallback(code, state);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?connected=linkedin`);
        } catch (err) {
            this.logger.error('LinkedIn OAuth error:', err);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            res.redirect(`${frontendUrl}/dashboard/social-publisher?error=linkedin_connection_failed`);
        }
    }

    // ─── ACCOUNT MANAGEMENT ─────────────────────────────────

    @Get()
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
    async getAccounts(@Req() req: TenantRequest) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        return this.accountService.getAccounts(req.tenantId || '', req.user?.userId || '');
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
    @Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
    async disconnectAccount(@Req() req: TenantRequest, @Param('id') id: string) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        await this.accountService.disconnectAccount(req.tenantId || '', req.user?.userId || '', id);
        return { message: 'Account disconnected' };
    }
}
