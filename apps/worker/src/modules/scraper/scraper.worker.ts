import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../../entities/lead.entity';
import { LeadSource } from '@shared/enums/lead-source.enum';
import { LeadStatus } from '@shared/enums/lead-status.enum';
import Redis from 'ioredis';
import { SearchAggregatorService } from './search-aggregator.service';
import { CheerioScraperService } from './cheerio-scraper.service';

const redisPublisher = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

@Processor('scraper-jobs')
export class ScraperWorker extends WorkerHost {
    private readonly logger = new Logger(ScraperWorker.name);

    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: Repository<Lead>,
        private readonly searchService: SearchAggregatorService,
        private readonly cheerioScraper: CheerioScraperService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { tenantId, query, limit, isPro } = job.data;
        const tier = isPro ? 'PRO' : 'FREE';
        this.logger.log(`[${tier}] Processing job ${job.id} for tenant ${tenantId}. Query: "${query}"`);

        try {
            // Stage 1: Search — route by tier
            const rawResults = isPro
                ? await this.searchService.searchPro(query, limit)
                : await this.searchService.searchFree(query, limit);

            this.logger.log(`Stage 1 returned ${rawResults.length} candidates. Commencing extraction & quality gate...`);

            const validLeads: Partial<Lead>[] = [];

            // Stage 2: Extract contact data & apply quality gate
            for (let i = 0; i < rawResults.length; i++) {
                if (validLeads.length >= limit) break;
                const result = rawResults[i];

                // Emit progress to frontend via Redis
                const progressPct = Math.min(Math.round(((i + 1) / Math.min(rawResults.length, limit * 2)) * 95), 95);
                await redisPublisher.publish('tenant-events', JSON.stringify({
                    tenantId,
                    event: 'scraper.progress',
                    data: { jobId: job.id, progress: progressPct, found: validLeads.length, status: `Analyzing ${result.title}...` }
                }));

                // Phone may already come from the Search API (Google Maps listings)
                let phone = result.phone;
                let email: string | undefined;
                let facebook: string | undefined;
                let linkedin: string | undefined;
                let instagram: string | undefined;

                // Deep extraction from the actual website
                if (result.url) {
                    let extracted;
                    if (isPro) {
                        // Pro: Use Oxylabs to render JS-heavy sites
                        const renderedHtml = await this.searchService.fetchRenderedHtml(result.url);
                        extracted = renderedHtml
                            ? this.cheerioScraper.extractFromHtml(renderedHtml)
                            : await this.cheerioScraper.extractFromWebsite(result.url);
                    } else {
                        // Free: Direct Axios + Cheerio (no JS rendering)
                        extracted = await this.cheerioScraper.extractFromWebsite(result.url);
                    }

                    phone = phone || extracted.phone;
                    email = extracted.email;
                    facebook = extracted.facebook;
                    linkedin = extracted.linkedin;
                    instagram = extracted.instagram;
                }

                // Quality Gate: Must have at least a phone number
                if (!phone) {
                    this.logger.debug(`Skipped "${result.title}" — no phone number found`);
                    continue;
                }

                validLeads.push({
                    tenantId,
                    companyName: result.title,
                    category: query,
                    phone,
                    website: result.url || null,
                    email: email || null,
                    facebook: facebook || null,
                    linkedin: linkedin || null,
                    instagram: instagram || null,
                    rawData: { address: result.address },
                    source: LeadSource.SCRAPER,
                    status: LeadStatus.NEW,
                });
            }

            if (validLeads.length === 0) {
                this.logger.warn(`No verified leads found for query: "${query}"`);
                return { success: true, leadsGenerated: 0 };
            }

            await this.leadRepository.save(validLeads);
            this.logger.log(`Saved ${validLeads.length} verified leads for tenant ${tenantId}`);

            return { success: true, leadsGenerated: validLeads.length };
        } catch (error: any) {
            this.logger.error(`Job ${job.id} failed: ${error?.message}`);
            throw error;
        }
    }

    @OnWorkerEvent('completed')
    async onCompleted(job: Job, returnvalue: any) {
        this.logger.log(`Job ${job.id} completed`);
        await redisPublisher.publish('tenant-events', JSON.stringify({
            tenantId: job.data.tenantId,
            event: 'scraper.completed',
            data: { jobId: job.id, result: returnvalue }
        }));
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed`);
        await redisPublisher.publish('tenant-events', JSON.stringify({
            tenantId: job.data.tenantId,
            event: 'scraper.failed',
            data: { jobId: job.id, error: error.message }
        }));
    }
}
