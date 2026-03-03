import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from '../entities/campaign.entity';
import { CampaignItem, CampaignItemDocument } from '../entities/campaign-item.entity';
import { Lead, LeadDocument } from '../entities/lead.entity';
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
const EMAIL_DELAY_MS = 5000;

@Processor('campaign-execution', { concurrency: 3 })
@Injectable()
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);
  private readonly aiCallClient: AICallClient;
  private readonly emailClient: EmailClient;
  private readonly groqEmailService: GroqEmailService;
  private readonly researchAgent: ResearchAgent;

  constructor(
    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,
    @InjectModel(CampaignItem.name)
    private campaignItemModel: Model<CampaignItemDocument>,
    @InjectModel(Lead.name)
    private leadModel: Model<LeadDocument>,
  ) {
    super();
    this.aiCallClient = new AICallClient();
    this.emailClient = new EmailClient();
    this.groqEmailService = new GroqEmailService();
    const cheerioScraper = new CheerioScraperService();
    const searchAggregator = new SearchAggregatorService();
    this.researchAgent = new ResearchAgent(cheerioScraper, searchAggregator);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, tenantId } = job.data;

    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, tenantId, deletedAt: null })
      .lean<Campaign>();

    if (!campaign) return;

    if (campaign.status === CampaignStatus.READY) {
      // Atomic: READY → RUNNING
      const updated = await this.campaignModel.findOneAndUpdate(
        { _id: campaignId, tenantId, status: CampaignStatus.READY, deletedAt: null },
        { status: CampaignStatus.RUNNING },
      );
      if (!updated) return;
    } else if (campaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    const BATCH_SIZE = 25;
    let hasMore = true;

    while (hasMore) {
      const currentProcessingCount = await this.campaignItemModel.countDocuments({
        tenantId,
        status: CampaignItemStatus.PROCESSING,
      });

      const remainingSlots = MAX_CONCURRENT_CALLS_PER_TENANT - currentProcessingCount;
      if (remainingSlots <= 0) { hasMore = false; break; }

      const fetchLimit = Math.min(BATCH_SIZE, remainingSlots);

      // Fetch pending item IDs
      const pendingItems = await this.campaignItemModel
        .find({ tenantId, campaignId, status: CampaignItemStatus.PENDING })
        .select('_id')
        .sort({ createdAt: 1 })
        .limit(fetchLimit)
        .lean<CampaignItem[]>();

      if (pendingItems.length === 0) { hasMore = false; break; }

      const itemIds = pendingItems.map((item: any) => item._id);

      // Atomic lock: PENDING → PROCESSING
      const lockResult = await this.campaignItemModel.updateMany(
        { _id: { $in: itemIds }, tenantId, campaignId, status: CampaignItemStatus.PENDING },
        {
          status: CampaignItemStatus.PROCESSING,
          $inc: { attemptCount: 1 },
          lastAttemptAt: new Date(),
        },
      );

      if (lockResult.modifiedCount === 0) continue;

      const lockedItems = await this.campaignItemModel
        .find({ _id: { $in: itemIds }, tenantId, campaignId, status: CampaignItemStatus.PROCESSING })
        .lean<CampaignItem[]>();

      let failureCount = 0;
      let successCount = 0;

      for (let i = 0; i < lockedItems.length; i++) {
        const item = lockedItems[i];
        const itemId = (item as any)._id;
        try {
          const lead = await this.leadModel
            .findOne({ _id: item.leadId, tenantId, deletedAt: null })
            .lean<Lead>();

          let externalRefId: string | null = null;

          if (!lead) throw new Error('Lead not found in database');

          if (campaign.moduleType === CampaignModuleType.AI_CALL) {
            if (!lead.phone) throw new Error('Lead phone number is required for AI calls');

            this.logger.log(`📞 [VAPI] Dispatching call to ${lead.phone} for Lead ${itemId}...`);
            const result = await this.aiCallClient.initiateCall({
              phone: lead.phone,
              contactName: lead.contactName || undefined,
              companyName: lead.companyName || undefined,
              customPrompt: campaign.customPrompt || undefined,
            });
            this.logger.log(`✅ [VAPI] Call dispatched. Call ID: ${result.callId}`);
            externalRefId = result.callId;

          } else if (campaign.moduleType === CampaignModuleType.EMAIL) {
            if (!lead.email) {
              this.logger.warn(`Skipping lead ${itemId} (${lead.companyName}) — no email`);
              await this.campaignItemModel.findByIdAndUpdate(itemId, {
                status: CampaignItemStatus.FAILED,
                lastAttemptAt: new Date(),
              });
              failureCount++;
              continue;
            }

            const emailConfig = campaign.emailConfig as any;

            let companyProfile = null;
            if (lead.website) {
              this.logger.log(`🕵️ [Pipeline] Researching ${lead.companyName} at ${lead.website}`);
              companyProfile = await this.researchAgent.investigate(lead.website, lead.companyName || 'Unknown');
            }

            this.logger.log(`✍️ [Pipeline] Drafting email for ${lead.email}`);
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
              companyProfile,
            });

            this.logger.log(`📧 [Pipeline] Dispatching email to ${lead.email} | Subject: "${generated.subject}"`);
            const result = await this.emailClient.sendEmail({
              to: lead.email,
              subject: generated.subject,
              body: generated.body,
              html: generated.htmlBody,
            });
            externalRefId = result.messageId;

            if (i < lockedItems.length - 1) {
              this.logger.debug(`Waiting ${EMAIL_DELAY_MS / 1000}s before next email...`);
              await this.sleep(EMAIL_DELAY_MS);
            }
          } else {
            throw new Error(`Unsupported module type: ${campaign.moduleType}`);
          }

          // Mark success
          await this.campaignItemModel.findByIdAndUpdate(itemId, {
            status: CampaignItemStatus.SUCCESS,
            externalRefId,
            lastAttemptAt: new Date(),
          });
          successCount++;

          // Emit progress via Redis pub/sub
          const freshCampaign = await this.campaignModel.findById(campaignId).lean<Campaign>();
          await redisPublisher.publish('tenant-events', JSON.stringify({
            tenantId,
            event: 'campaign.progress',
            data: {
              campaignId,
              processed: freshCampaign ? freshCampaign.processedItems + successCount + failureCount : 0,
              total: campaign.totalItems,
              lastLead: lead.companyName,
            },
          }));

        } catch (error: any) {
          this.logger.error(`Item ${itemId} failed: ${error.message}`);
          if (error.stack) this.logger.error(`[Stack] ${error.stack}`);

          await this.campaignItemModel.findByIdAndUpdate(itemId, {
            status: CampaignItemStatus.FAILED,
          });
          failureCount++;
        }
      }

      // Update campaign counters atomically
      if (successCount > 0 || failureCount > 0) {
        await this.campaignModel.findByIdAndUpdate(campaignId, {
          $inc: {
            processedItems: successCount + failureCount,
            successCount,
            failureCount,
          },
        });
      }
    }

    // Fetch final stats and determine completion status
    const updatedCampaign = await this.campaignModel.findById(campaignId).lean<Campaign>();
    const finalStatus = updatedCampaign && updatedCampaign.failureCount > 0
      ? CampaignStatus.FAILED
      : CampaignStatus.COMPLETED;

    // Atomic: RUNNING → final status
    await this.campaignModel.findOneAndUpdate(
      { _id: campaignId, tenantId, status: CampaignStatus.RUNNING },
      { status: finalStatus },
    );
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, returnvalue: any) {
    this.logger.log(`Campaign job ${job.id} completed`);
    await redisPublisher.publish('tenant-events', JSON.stringify({
      tenantId: job.data.tenantId,
      event: 'campaign.completed',
      data: { jobId: job.id, campaignId: job.data.campaignId },
    }));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Campaign job ${job.id} failed: ${error.message}`);
    await redisPublisher.publish('tenant-events', JSON.stringify({
      tenantId: job.data.tenantId,
      event: 'campaign.failed',
      data: { jobId: job.id, campaignId: job.data.campaignId, error: error.message },
    }));
  }
}
