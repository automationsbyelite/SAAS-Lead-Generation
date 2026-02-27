import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignItem } from '../campaigns/campaign-item.entity';
import { Campaign } from '../campaigns/campaign.entity';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { VapiWebhookDto, VapiCallStatus } from './dto/vapi-webhook.dto';
import { QuotaService } from '../quota/quota.service';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(CampaignItem)
    private campaignItemRepository: Repository<CampaignItem>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private quotaService: QuotaService,
  ) {}

  async handleVapiWebhook(dto: VapiWebhookDto): Promise<void> {
    const campaignItem = await this.campaignItemRepository.findOne({
      where: { externalRefId: dto.callId },
      select: ['id', 'tenantId', 'campaignId'],
    });

    if (!campaignItem) {
      return;
    }

    const tenantId = campaignItem.tenantId;
    const campaignId = campaignItem.campaignId;

    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId },
      select: ['id', 'moduleType', 'processedItems', 'totalItems'],
    });

    if (!campaign) {
      return;
    }

    if (dto.status === VapiCallStatus.COMPLETED) {
      const updateResult = await this.campaignItemRepository
        .createQueryBuilder()
        .update(CampaignItem)
        .set({ status: CampaignItemStatus.SUCCESS })
        .where('externalRefId = :callId', { callId: dto.callId })
        .andWhere('status = :status', { status: CampaignItemStatus.PROCESSING })
        .execute();

      if (updateResult.affected === 0) {
        return;
      }

      await this.campaignRepository
        .createQueryBuilder()
        .update(Campaign)
        .set({
          processedItems: () => 'processedItems + 1',
          successCount: () => 'successCount + 1',
        })
        .where('id = :campaignId', { campaignId })
        .andWhere('tenantId = :tenantId', { tenantId })
        .execute();

      await this.quotaService.incrementUsage(tenantId, campaign.moduleType, 1);

      const updatedCampaign = await this.campaignRepository.findOne({
        where: { id: campaignId, tenantId },
        select: ['id', 'processedItems', 'totalItems'],
      });

      if (updatedCampaign && updatedCampaign.processedItems >= updatedCampaign.totalItems) {
        await this.campaignRepository.update(
          { id: campaignId, tenantId },
          { status: CampaignStatus.COMPLETED },
        );
      }
    } else if (dto.status === VapiCallStatus.FAILED) {
      const updateResult = await this.campaignItemRepository
        .createQueryBuilder()
        .update(CampaignItem)
        .set({ status: CampaignItemStatus.FAILED })
        .where('externalRefId = :callId', { callId: dto.callId })
        .andWhere('status = :status', { status: CampaignItemStatus.PROCESSING })
        .execute();

      if (updateResult.affected === 0) {
        return;
      }

      await this.campaignRepository
        .createQueryBuilder()
        .update(Campaign)
        .set({
          processedItems: () => 'processedItems + 1',
          failureCount: () => 'failureCount + 1',
        })
        .where('id = :campaignId', { campaignId })
        .andWhere('tenantId = :tenantId', { tenantId })
        .execute();

      await this.quotaService.incrementUsage(tenantId, campaign.moduleType, 1);

      const updatedCampaign = await this.campaignRepository.findOne({
        where: { id: campaignId, tenantId },
        select: ['id', 'processedItems', 'totalItems'],
      });

      if (updatedCampaign && updatedCampaign.processedItems >= updatedCampaign.totalItems) {
        await this.campaignRepository.update(
          { id: campaignId, tenantId },
          { status: CampaignStatus.COMPLETED },
        );
      }
    }
  }
}
