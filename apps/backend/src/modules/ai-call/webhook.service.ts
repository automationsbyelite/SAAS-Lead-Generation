import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignItem, CampaignItemDocument } from '../campaigns/campaign-item.entity';
import { Campaign, CampaignDocument } from '../campaigns/campaign.entity';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { VapiWebhookDto, VapiCallStatus } from './dto/vapi-webhook.dto';
import { QuotaService } from '../quota/quota.service';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(CampaignItem.name)
    private campaignItemModel: Model<CampaignItemDocument>,
    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,
    private quotaService: QuotaService,
  ) {}

  async handleVapiWebhook(dto: VapiWebhookDto): Promise<void> {
    const campaignItem = await this.campaignItemModel
      .findOne({ externalRefId: dto.callId })
      .select('_id tenantId campaignId')
      .lean<CampaignItem>();

    if (!campaignItem) return;

    const { tenantId, campaignId } = campaignItem;

    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, tenantId })
      .select('_id moduleType processedItems totalItems')
      .lean<Campaign>();

    if (!campaign) return;

    if (dto.status === VapiCallStatus.COMPLETED) {
      // Atomic: only update if currently PROCESSING
      const updated = await this.campaignItemModel.findOneAndUpdate(
        { externalRefId: dto.callId, status: CampaignItemStatus.PROCESSING },
        { status: CampaignItemStatus.SUCCESS },
        { new: true },
      );
      if (!updated) return;

      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { processedItems: 1, successCount: 1 },
      });

      await this.quotaService.incrementUsage(tenantId, campaign.moduleType, 1);
      await this.checkAndCompleateCampaign(campaignId, tenantId);

    } else if (dto.status === VapiCallStatus.FAILED) {
      const updated = await this.campaignItemModel.findOneAndUpdate(
        { externalRefId: dto.callId, status: CampaignItemStatus.PROCESSING },
        { status: CampaignItemStatus.FAILED },
        { new: true },
      );
      if (!updated) return;

      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { processedItems: 1, failureCount: 1 },
      });

      await this.quotaService.incrementUsage(tenantId, campaign.moduleType, 1);
      await this.checkAndCompleateCampaign(campaignId, tenantId);
    }
  }

  private async checkAndCompleateCampaign(campaignId: string, tenantId: string): Promise<void> {
    const updated = await this.campaignModel
      .findOne({ _id: campaignId, tenantId })
      .select('processedItems totalItems')
      .lean<Campaign>();

    if (updated && updated.processedItems >= updated.totalItems) {
      await this.campaignModel.findByIdAndUpdate(campaignId, { status: CampaignStatus.COMPLETED });
    }
  }
}
