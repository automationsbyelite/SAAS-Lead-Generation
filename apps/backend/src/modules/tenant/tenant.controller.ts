import {
    Controller,
    Patch,
    Get,
    Post,
    Param,
    Body,
    Req,
    UseGuards,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { IsArray, IsEnum } from 'class-validator';
import { TenantService } from './tenant.service';
import { UserService } from '../user/user.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { TenantRequest } from '../../common/types/request.types';
import * as bcrypt from 'bcryptjs';

class UpdateModulesDto {
    @IsArray()
    @IsEnum(CampaignModuleType, { each: true })
    enabledModules: CampaignModuleType[];
}

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
export class TenantController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly userService: UserService,
    ) { }

    @Get('me')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_OWNER, Role.MEMBER)
    async getMyTenant(@Req() req: TenantRequest) {
        const tenant = await this.tenantService.findById(req.tenantId!);
        if (!tenant) throw new NotFoundException('Tenant not found');

        // SuperAdmin gets all modules automatically
        if (req.user?.role === Role.SUPER_ADMIN) {
            tenant.enabledModules = [
                CampaignModuleType.SCRAPER_PRO,
                CampaignModuleType.AI_CALL,
                CampaignModuleType.EMAIL,
                CampaignModuleType.SOCIAL_PUBLISHER,
            ];
        }

        return tenant;
    }

    @Get()
    @Roles(Role.SUPER_ADMIN)
    async getAllTenants() {
        return this.tenantService.findAll();
    }

    @Get('me/users')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_OWNER)
    async getMyUsers(@Req() req: TenantRequest) {
        return this.userService.findByTenantId(req.tenantId!);
    }

    @Get(':id/users')
    @Roles(Role.SUPER_ADMIN)
    async getTenantUsers(@Param('id') tenantId: string) {
        return this.userService.findByTenantId(tenantId);
    }

    @Post('me/users')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_OWNER)
    async inviteUser(
        @Req() req: TenantRequest,
        @Body() dto: { email: string; firstName: string; lastName: string; role?: Role }
    ) {
        const existingUser = await this.userService.findByEmail(dto.email);
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const salt = await bcrypt.genSalt(10);
        // Default temp password for MVP purposes
        const passwordHash = await bcrypt.hash('welcome123', salt);

        const newUser = await this.userService.create({
            tenantId: req.tenantId!,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash,
            role: dto.role || Role.MEMBER,
        });

        return {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            createdAt: newUser.createdAt,
        };
    }

    @Patch(':id/modules')
    @Roles(Role.SUPER_ADMIN)
    async updateModules(
        @Param('id') id: string,
        @Body() dto: UpdateModulesDto,
    ) {
        try {
            return await this.tenantService.updateModules(id, dto.enabledModules);
        } catch (error) {
            throw new NotFoundException((error as Error).message);
        }
    }
}
