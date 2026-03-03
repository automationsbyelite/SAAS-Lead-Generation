import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Campaign } from '../entities/campaign.entity';
import { CampaignItem } from '../entities/campaign-item.entity';
import { Lead } from '../entities/lead.entity';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { AICallClient } from '@ai-call/ai-call-client';
import { EmailClient } from './email-client';
import { GroqEmailService } from './groq-email.service';
import { ResearchAgent } from './agents/research.agent';
import { CheerioScraperService } from '../modules/scraper/cheerio-scraper.service';
import { SearchAggregatorService } from '../modules/scraper/search-aggregator.service';
import Redis from 'ioredis';

const redisPublisher = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

interface CampaignJobData {
  campaignId: string;
  tenantId: string;
}

const MAX_CONCURRENT_CALLS_PER_TENANT = 2;
const EMAIL_DELAY_MS = 5000; // 5 seconds between each email

@Processor('campaign-execution', {
  concurrency: 3,
})
@Injectable()
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);
  private readonly aiCallClient: AICallClient;
  private readonly emailClient: EmailClient;
  private readonly groqEmailService: GroqEmailService;
  private readonly researchAgent: ResearchAgent;

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignItem)
    private campaignItemRepository: Repository<CampaignItem>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {
    super();
    this.aiCallClient = new AICallClient();
    this.emailClient = new EmailClient();
    this.groqEmailService = new GroqEmailService();

    // In a full DI setup, these would be injected. We manually instantiate here for simplicity as the worker is standalone.
    const cheerioScraper = new CheerioScraperService();
    const searchAggregator = new SearchAggregatorService();
    this.researchAgent = new ResearchAgent(cheerioScraper, searchAggregator);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, tenantId } = job.data;

    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId, deletedAt: IsNull() },
    });

    if (!campaign) {
      return;
    }

    if (campaign.status === CampaignStatus.READY) {
      const updateResult = await this.campaignRepository
        .createQueryBuilder()
        .update(Campaign)
        .set({ status: CampaignStatus.RUNNING })
        .where('id = :campaignId', { campaignId })
        .andWhere('tenantId = :tenantId', { tenantId })
        .andWhere('status = :status', { status: CampaignStatus.READY })
        .andWhere('deletedAt IS NULL')
        .execute();

      if (updateResult.affected === 0) {
        return;
      }
    } else if (campaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    const BATCH_SIZE = 25;
    let hasMore = true;

    while (hasMore) {
      const currentProcessingCount = await this.campaignItemRepository.count({
        where: {
          tenantId,
          status: CampaignItemStatus.PROCESSING,
        },
      });

      const remainingSlots = MAX_CONCURRENT_CALLS_PER_TENANT - currentProcessingCount;

      if (remainingSlots <= 0) {
        hasMore = false;
        break;
      }

      const fetchLimit = Math.min(BATCH_SIZE, remainingSlots);

      const pendingItemIds = await this.campaignItemRepository
        .createQueryBuilder('item')
        .select('item.id', 'id')
        .where('item.tenantId = :tenantId', { tenantId })
        .andWhere('item.campaignId = :campaignId', { campaignId })
        .andWhere('item.status = :status', { status: CampaignItemStatus.PENDING })
        .orderBy('item.createdAt', 'ASC')
        .limit(fetchLimit)
        .getRawMany();

      if (pendingItemIds.length === 0) {
        hasMore = false;
        break;
      }

      const itemIds = pendingItemIds.map((row: any) => row.id);

      const lockResult = await this.campaignItemRepository
        .createQueryBuilder()
        .update(CampaignItem)
        .set({
          status: CampaignItemStatus.PROCESSING,
          attemptCount: () => 'attemptCount + 1',
          lastAttemptAt: new Date(),
        })
        .where('id IN (:...itemIds)', { itemIds })
        .andWhere('tenantId = :tenantId', { tenantId })
        .andWhere('campaignId = :campaignId', { campaignId })
        .andWhere('status = :status', { status: CampaignItemStatus.PENDING })
        .execute();

      if (lockResult.affected === 0) {
        continue;
      }

      const lockedItems = await this.campaignItemRepository.find({
        where: {
          id: In(itemIds),
          tenantId,
          campaignId,
          status: CampaignItemStatus.PROCESSING,
        },
      });

      let failureCount = 0;
      let successCount = 0;

      for (let i = 0; i < lockedItems.length; i++) {
        const item = lockedItems[i];
        try {
          const lead = await this.leadRepository.findOne({
            where: { id: item.leadId, tenantId, deletedAt: IsNull() },
          });

          let externalRefId: string | null = null;

          if (!lead) {
            throw new Error('Lead not found in database');
          }

          if (campaign.moduleType === CampaignModuleType.AI_CALL) {
            // ─── AI CALL BRANCH ───
            if (!lead.phone) {
              throw new Error('Lead phone number is required for AI calls');
            }

            this.logger.log(`📞 [VAPI] Dispatching call to ${lead.phone} for Lead ${lead.id}...`);
            const result = await this.aiCallClient.initiateCall({
              phone: lead.phone,
              contactName: lead.contactName || undefined,
              companyName: lead.companyName || undefined,
              customPrompt: campaign.customPrompt || undefined,
            });
            this.logger.log(`✅ [VAPI] Call dispatched successfully. Call ID: ${result.callId}`);
            externalRefId = result.callId;

          } else if (campaign.moduleType === CampaignModuleType.EMAIL) {
            // ─── EMAIL BRANCH (AI-Generated) ───
            if (!lead.email) {
              this.logger.warn(`Skipping lead ${lead.id} (${lead.companyName}) — no email address`);
              await this.campaignItemRepository.update(
                { id: item.id, tenantId },
                { status: CampaignItemStatus.FAILED, lastAttemptAt: new Date() },
              );
              failureCount++;
              continue;
            }

            const emailConfig = campaign.emailConfig as any;

            // ─── AGENT 1: THE RESEARCHER ───
            let companyProfile = null;
            if (lead.website) {
              this.logger.log(`🕵️ [Pipeline] Agent 1 -> Researching ${lead.companyName} at ${lead.website}`);
              companyProfile = await this.researchAgent.investigate(lead.website, lead.companyName || 'Unknown');
            }

            // ─── AGENT 2: THE COPYWRITER ───
            this.logger.log(`✍️ [Pipeline] Agent 2 -> Drafting hyper-personalized email for ${lead.email}`);
            const generated = await this.groqEmailService.generateEmail({
              companyName: lead.companyName || 'your company',
              contactName: lead.contactName || undefined,
              website: lead.website || undefined,
              category: (lead as any).category || undefined,
              senderName: emailConfig?.senderName || 'The Team',
              senderRole: emailConfig?.senderRole || '',
              senderCompany: emailConfig?.senderCompany || 'Our Company',
              offering: emailConfig?.offering || 'our services',
              painPoint: emailConfig?.painPoint || '',
              ctaText: emailConfig?.ctaText || 'Would love to connect.',
              ctaLink: emailConfig?.ctaLink || undefined,
              tone: emailConfig?.tone || 'PROFESSIONAL',
              companyProfile: companyProfile, // Injected context
            });

            this.logger.log(`📧 [Pipeline] Dispatching email to ${lead.email} | Subject: "${generated.subject}"`);

            const result = await this.emailClient.sendEmail({
              to: lead.email,
              subject: generated.subject,
              body: generated.body,
              html: generated.htmlBody,
            });
            externalRefId = result.messageId;

            // 5-second delay between emails to avoid spam triggers
            if (i < lockedItems.length - 1) {
              this.logger.debug(`Waiting ${EMAIL_DELAY_MS / 1000}s before next email...`);
              await this.sleep(EMAIL_DELAY_MS);
            }

          } else {
            throw new Error(`Unsupported module type: ${campaign.moduleType}`);
          }

          // Mark as success
          await this.campaignItemRepository.update(
            { id: item.id, tenantId },
            {
              status: CampaignItemStatus.SUCCESS,
              externalRefId,
              lastAttemptAt: new Date(),
            },
          );
          successCount++;

          // Emit progress
          await redisPublisher.publish('tenant-events', JSON.stringify({
            tenantId,
            event: 'campaign.progress',
            data: {
              campaignId,
              processed: campaign.processedItems + successCount + failureCount,
              total: campaign.totalItems,
              lastLead: lead.companyName,
            },
          }));

        } catch (error: any) {
          this.logger.error(`Item ${item.id} failed: ${error.message}`);

          if (error.response?.data) {
            this.logger.error(`[VAPI Response] ${JSON.stringify(error.response.data)}`);
          } else if (error.stack) {
            this.logger.error(`[Stack Trace] ${error.stack}`);
          }

          await this.campaignItemRepository.update(
            { id: item.id, tenantId },
            { status: CampaignItemStatus.FAILED },
          );
          failureCount++;
        }
      }

      // Update campaign counters
      if (successCount > 0 || failureCount > 0) {
        await this.campaignRepository
          .createQueryBuilder()
          .update(Campaign)
          .set({
            processedItems: () => `"processedItems" + ${successCount + failureCount}`,
            successCount: () => `"successCount" + ${successCount}`,
            failureCount: () => `"failureCount" + ${failureCount}`,
          })
          .where('id = :campaignId', { campaignId })
          .andWhere('tenantId = :tenantId', { tenantId })
          .execute();
      }
    }

    // Fetch up-to-date campaign stats to determine final status
    const updatedCampaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId }
    });

    const finalStatus = updatedCampaign && updatedCampaign.failureCount > 0
      ? CampaignStatus.FAILED
      : CampaignStatus.COMPLETED;

    // Mark campaign with final status
    await this.campaignRepository
      .createQueryBuilder()
      .update(Campaign)
      .set({ status: finalStatus })
      .where('id = :campaignId', { campaignId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('status = :status', { status: CampaignStatus.RUNNING })
      .execute();
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, returnvalue: any) {
    this.logger.log(`Campaign job ${job.id} completed`);
    await redisPublisher.publish('tenant-events', JSON.stringify({
      tenantId: job.data.tenantId,
      event: 'campaign.completed',
      data: { jobId: job.id, campaignId: job.data.campaignId }
    }));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Campaign job ${job.id} failed: ${error.message}`);
    await redisPublisher.publish('tenant-events', JSON.stringify({
      tenantId: job.data.tenantId,
      event: 'campaign.failed',
      data: { jobId: job.id, campaignId: job.data.campaignId, error: error.message }
    }));
  }
}
