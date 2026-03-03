import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignItem, CampaignItemDocument } from '../campaigns/campaign-item.entity';
import { Lead, LeadDocument } from '../leads/lead.entity';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { AICallClient } from '@ai-call/ai-call-client';

@Injectable()
export class AICallService {
  private readonly aiCallClient: AICallClient;

  constructor(
    @InjectModel(CampaignItem.name)
    private campaignItemModel: Model<CampaignItemDocument>,
    @InjectModel(Lead.name)
    private leadModel: Model<LeadDocument>,
  ) {
    this.aiCallClient = new AICallClient();
  }

  async initiateCall(tenantId: string, campaignItemId: string): Promise<string> {
    const campaignItem = await this.campaignItemModel
      .findOne({ _id: campaignItemId, tenantId })
      .lean<CampaignItem>();

    if (!campaignItem) throw new NotFoundException('Campaign item not found');

    const lead = await this.leadModel
      .findOne({ _id: campaignItem.leadId, tenantId, deletedAt: null })
      .lean<Lead>();

    if (!lead) throw new NotFoundException('Lead not found');
    if (!lead.phone) throw new BadRequestException('Lead phone number is required');

    try {
      const result = await this.aiCallClient.initiateCall({
        phone: lead.phone,
        contactName: lead.contactName || undefined,
        companyName: lead.companyName || undefined,
      });

      await this.campaignItemModel.findByIdAndUpdate(campaignItemId, {
        externalRefId: result.callId,
        status: CampaignItemStatus.PROCESSING,
        lastAttemptAt: new Date(),
      });

      return result.callId;
    } catch (error: any) {
      throw new BadRequestException(`Failed to initiate call: ${error.message}`);
    }
  }
}
