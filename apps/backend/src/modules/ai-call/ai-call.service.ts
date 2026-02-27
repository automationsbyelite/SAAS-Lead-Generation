import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CampaignItem } from '../campaigns/campaign-item.entity';
import { Lead } from '../leads/lead.entity';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { AICallClient } from '@ai-call/ai-call-client';

@Injectable()
export class AICallService {
  private readonly aiCallClient: AICallClient;

  constructor(
    @InjectRepository(CampaignItem)
    private campaignItemRepository: Repository<CampaignItem>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {
    this.aiCallClient = new AICallClient();
  }

  async initiateCall(tenantId: string, campaignItemId: string): Promise<string> {
    const campaignItem = await this.campaignItemRepository.findOne({
      where: { id: campaignItemId, tenantId },
      relations: ['lead'],
    });

    if (!campaignItem) {
      throw new NotFoundException('Campaign item not found');
    }

    const lead = await this.leadRepository.findOne({
      where: { id: campaignItem.leadId, tenantId, deletedAt: IsNull() },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.phone) {
      throw new BadRequestException('Lead phone number is required');
    }

    try {
      const result = await this.aiCallClient.initiateCall({
        phone: lead.phone,
        contactName: lead.contactName || undefined,
        companyName: lead.companyName || undefined,
      });

      await this.campaignItemRepository.update(
        { id: campaignItemId, tenantId },
        {
          externalRefId: result.callId,
          status: CampaignItemStatus.PROCESSING,
          lastAttemptAt: new Date(),
        },
      );

      return result.callId;
    } catch (error: any) {
      throw new BadRequestException(`Failed to initiate call: ${error.message}`);
    }
  }
}
