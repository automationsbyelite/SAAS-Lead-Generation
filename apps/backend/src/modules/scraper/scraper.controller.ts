import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { CreateScraperJobDto } from './dto/create-scraper-job.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';
import { TenantRequest } from '../../common/types/request.types';

@Controller('scraper')
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Roles(Role.MEMBER, Role.TENANT_OWNER, Role.SUPER_ADMIN)
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @Get('quota')
    async getQuota(@Req() req: TenantRequest) {
        return this.scraperService.getQuota(
            req.tenantId || '',
            req.user?.role,
        );
    }

    @Post('jobs')
    async createJob(
        @Req() req: TenantRequest,
        @Body() dto: CreateScraperJobDto,
    ) {
        return this.scraperService.createScrapeJob(
            req.tenantId || '',
            req.user?.userId || '',
            dto,
            req.user?.role,
        );
    }
}
