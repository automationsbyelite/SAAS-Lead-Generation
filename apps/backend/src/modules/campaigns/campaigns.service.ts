import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, In, IsNull } from 'typeorm';
import { Campaign } from './campaign.entity';
import { CampaignItem } from './campaign-item.entity';
import { Lead } from '../leads/lead.entity';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QuotaService } from '../quota/quota.service';
import { Tenant } from '../tenant/tenant.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignItem)
    private campaignItemRepository: Repository<CampaignItem>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectQueue('campaign-execution')
    private campaignQueue: Queue,
    private quotaService: QuotaService,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) { }

  async createCampaign(
    tenantId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId, isActive: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (!tenant.enabledModules || !tenant.enabledModules.includes(dto.moduleType)) {
      throw new BadRequestException(`Tenant does not have access to module: ${dto.moduleType}`);
    }

    const uniqueLeadIds = [...new Set(dto.leadIds)];

    const leads = await this.leadRepository.find({
      where: {
        id: In(uniqueLeadIds),
        tenantId,
        deletedAt: IsNull(),
      },
    });

    if (leads.length !== uniqueLeadIds.length) {
      throw new BadRequestException('Some leads not found or do not belong to tenant');
    }

    const campaign = this.campaignRepository.create({
      tenantId,
      name: dto.name,
      moduleType: dto.moduleType,
      customPrompt: dto.customPrompt,
      emailConfig: dto.emailConfig ? dto.emailConfig as any : null,
      status: CampaignStatus.DRAFT,
      totalItems: uniqueLeadIds.length,
      createdBy: userId,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    const campaignItems = uniqueLeadIds.map(leadId =>
      this.campaignItemRepository.create({
        tenantId,
        campaignId: savedCampaign.id,
        leadId,
        status: CampaignItemStatus.PENDING,
      }),
    );

    await this.campaignItemRepository.save(campaignItems);

    return savedCampaign;
  }

  async getCampaigns(
    tenantId: string | null,
    filters?: { status?: CampaignStatus; page?: number; limit?: number },
  ): Promise<{ data: Campaign[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: IsNull(),
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [data, total] = await this.campaignRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getCampaignDetails(tenantId: string, campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId, deletedAt: IsNull() },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const itemCounts = await this.campaignItemRepository
      .createQueryBuilder('item')
      .select('item.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.campaignId = :campaignId', { campaignId })
      .groupBy('item.status')
      .getRawMany();

    const statusMap = new Map(itemCounts.map((r: any) => [r.status, parseInt(r.count, 10)]));

    campaign.successCount = statusMap.get(CampaignItemStatus.SUCCESS) || 0;
    campaign.failureCount = statusMap.get(CampaignItemStatus.FAILED) || 0;
    campaign.processedItems =
      (statusMap.get(CampaignItemStatus.PROCESSING) || 0) +
      campaign.successCount +
      campaign.failureCount;

    return campaign;
  }

  async updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    status: CampaignStatus,
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId, deletedAt: IsNull() },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [CampaignStatus.READY],
      [CampaignStatus.READY]: [CampaignStatus.RUNNING],
      [CampaignStatus.RUNNING]: [CampaignStatus.COMPLETED, CampaignStatus.FAILED],
      [CampaignStatus.COMPLETED]: [],
      [CampaignStatus.FAILED]: [],
    };

    const allowedStatuses = validTransitions[campaign.status];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${campaign.status} to ${status}`,
      );
    }

    const result = await this.campaignRepository.update(
      {
        id: campaignId,
        tenantId,
        deletedAt: IsNull(),
      },
      { status },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Campaign not found');
    }

    const updatedCampaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId, deletedAt: IsNull() },
    });

    if (!updatedCampaign) {
      throw new NotFoundException('Campaign not found');
    }

    return updatedCampaign;
  }

  async startCampaign(tenantId: string | null, campaignId: string): Promise<Campaign> {
    const whereClause: any = { id: campaignId, deletedAt: IsNull() };
    if (tenantId) whereClause.tenantId = tenantId;

    const campaign = await this.campaignRepository.findOne({
      where: whereClause,
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(`Campaign must be in DRAFT status to start`);
    }

    if (campaign.totalItems === 0) {
      throw new BadRequestException('Campaign must have at least one item to start');
    }

    // Skip quota check for SuperAdmin (tenantId is null)
    if (tenantId) {
      await this.quotaService.checkQuotaForCampaignStart(
        campaign.tenantId,
        campaign.moduleType,
        campaign.totalItems,
      );
    }

    const qb = this.campaignRepository
      .createQueryBuilder()
      .update(Campaign)
      .set({ status: CampaignStatus.READY })
      .where('id = :campaignId', { campaignId })
      .andWhere('status = :status', { status: CampaignStatus.DRAFT })
      .andWhere('deletedAt IS NULL');
    if (tenantId) qb.andWhere('tenantId = :tenantId', { tenantId });
    const result = await qb.execute();

    if (result.affected === 0) {
      throw new BadRequestException('Failed to start campaign. Campaign may have been modified.');
    }

    await this.campaignQueue.add(
      'process-campaign',
      {
        campaignId,
        tenantId: campaign.tenantId, // Always use campaign's actual tenantId, not the caller's
      },
      {
        jobId: campaignId,
      },
    );

    const freshWhereClause: any = { id: campaignId, deletedAt: IsNull() };
    if (tenantId) freshWhereClause.tenantId = tenantId;
    const freshCampaign = await this.campaignRepository.findOne({
      where: freshWhereClause,
    });

    if (!freshCampaign) {
      throw new NotFoundException('Campaign not found');
    }

    return freshCampaign;
  }

  async softDeleteCampaign(tenantId: string | null, campaignId: string): Promise<void> {
    const whereClause: any = { id: campaignId, deletedAt: IsNull() };
    if (tenantId) whereClause.tenantId = tenantId;

    const campaign = await this.campaignRepository.findOne({
      where: whereClause,
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.deletedAt = new Date();
    await this.campaignRepository.save(campaign);
  }
}
