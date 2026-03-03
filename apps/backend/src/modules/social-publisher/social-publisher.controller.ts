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
import { SocialPublisherService } from './social-publisher.service';
import { SocialAccountService } from './social-account.service';
import { AiGeneratorService, GenerateImageDto } from './ai-generator.service';
import { CreatePostDto } from './dto/create-post.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';

@Controller('social-publisher/posts')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
export class SocialPublisherController {
    constructor(
        private readonly publisherService: SocialPublisherService,
        private readonly accountService: SocialAccountService,
        private readonly aiGeneratorService: AiGeneratorService,
    ) { }

    @Post('ai/generate-image')
    async generateImage(@Req() req: TenantRequest, @Body() dto: GenerateImageDto) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        return this.aiGeneratorService.generateImage(dto);
    }

    @Post()
    async createPost(@Req() req: TenantRequest, @Body() dto: CreatePostDto) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        return this.publisherService.createPost(
            req.tenantId || '',
            req.user?.userId || '',
            dto,
        );
    }

    @Get()
    async getPosts(
        @Req() req: TenantRequest,
        @Query('platform') platform?: string,
        @Query('status') status?: string,
    ) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        return this.publisherService.getPosts(
            req.tenantId || '',
            req.user?.userId || '',
            { platform, status },
        );
    }

    @Delete(':id')
    async deletePost(@Req() req: TenantRequest, @Param('id') id: string) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        await this.publisherService.deletePost(req.tenantId || '', req.user?.userId || '', id);
        return { message: 'Post deleted' };
    }

    @Patch(':id/reschedule')
    async reschedulePost(
        @Req() req: TenantRequest,
        @Param('id') id: string,
        @Body('scheduledAt') scheduledAt: string,
    ) {
        await this.accountService.ensureModuleAccess(req.tenantId || '', req.user?.role);
        return this.publisherService.reschedulePost(
            req.tenantId || '',
            req.user?.userId || '',
            id,
            new Date(scheduledAt),
        );
    }
}
