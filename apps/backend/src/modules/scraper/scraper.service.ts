import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateScraperJobDto } from './dto/create-scraper-job.dto';
import { TenantService } from '../tenant/tenant.service';
import { LeadsService } from '../leads/leads.service';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { Role } from '@shared/enums/role.enum';

const FREE_TIER_TOTAL_LEAD_LIMIT = 10;

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);

    constructor(
        @InjectQueue('scraper-jobs')
        private scraperQueue: Queue,
        private tenantService: TenantService,
        private leadsService: LeadsService,
    ) { }

    /**
     * Returns the lead quota status for a tenant.
     */
    async getQuota(tenantId: string, userRole?: string) {
        const tenant = await this.tenantService.findById(tenantId);
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const isSuperAdmin = userRole === Role.SUPER_ADMIN;
        const hasProScraper = isSuperAdmin || (tenant.enabledModules && tenant.enabledModules.includes(CampaignModuleType.SCRAPER_PRO));

        if (hasProScraper) {
            return {
                isPro: true,
                totalLimit: -1, // unlimited
                used: 0,
                remaining: -1,
            };
        }

        const { total } = await this.leadsService.getLeads(tenantId, { page: 1, limit: 1 });

        return {
            isPro: false,
            totalLimit: FREE_TIER_TOTAL_LEAD_LIMIT,
            used: total,
            remaining: Math.max(0, FREE_TIER_TOTAL_LEAD_LIMIT - total),
        };
    }

    async createScrapeJob(
        tenantId: string,
        userId: string,
        dto: CreateScraperJobDto,
        userRole?: string,
    ) {
        const tenant = await this.tenantService.findById(tenantId);
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        if (!dto.query) {
            throw new BadRequestException('A search query is required');
        }

        // SuperAdmin always gets Pro tier access
        const isSuperAdmin = userRole === Role.SUPER_ADMIN;
        const hasProScraper = isSuperAdmin || (tenant.enabledModules && tenant.enabledModules.includes(CampaignModuleType.SCRAPER_PRO));

        let limit: number;

        if (hasProScraper) {
            // Pro users: use requested limit or default to 10
            limit = dto.limit || 10;
        } else {
            // Free users: enforce total lead quota
            const { total } = await this.leadsService.getLeads(tenantId, { page: 1, limit: 1 });
            const remaining = FREE_TIER_TOTAL_LEAD_LIMIT - total;

            if (remaining <= 0) {
                throw new ForbiddenException(
                    `You've reached the free tier limit of ${FREE_TIER_TOTAL_LEAD_LIMIT} leads. Upgrade to Pro for unlimited access.`
                );
            }

            // Clamp to remaining quota
            const requestedLimit = dto.limit || 10;
            limit = Math.min(requestedLimit, remaining, FREE_TIER_TOTAL_LEAD_LIMIT);

            if (requestedLimit > remaining) {
                this.logger.warn(
                    `Tenant ${tenantId} requested ${requestedLimit} leads but only has ${remaining} remaining in free quota. Clamping to ${limit}.`
                );
            }
        }

        const finalQuery = dto.location
            ? `${dto.query.trim()} in ${dto.location.trim()}`
            : dto.query.trim();

        // Push to processing queue — let the worker do the heavy lifting
        const job = await this.scraperQueue.add('scrape-keywords', {
            tenantId,
            userId,
            query: finalQuery,
            limit,
            isPro: hasProScraper,
        });

        this.logger.log(`Created scraper job ${job.id} for tenant ${tenantId} (limit: ${limit})`);

        return {
            message: 'Scraper job queued successfully',
            jobId: job.id,
            query: dto.query,
            expectedLeads: limit,
            status: 'QUEUED',
        };
    }
}

