import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from './campaign.entity';
import { CampaignItem, CampaignItemDocument } from './campaign-item.entity';
import { Lead, LeadDocument } from '../leads/lead.entity';
import { Tenant, TenantDocument } from '../tenant/tenant.entity';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QuotaService } from '../quota/quota.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,
    @InjectModel(CampaignItem.name)
    private campaignItemModel: Model<CampaignItemDocument>,
    @InjectModel(Lead.name)
    private leadModel: Model<LeadDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    @InjectQueue('campaign-execution')
    private campaignQueue: Queue,
    private quotaService: QuotaService,
  ) { }

  async createCampaign(tenantId: string, userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const tenant = await this.tenantModel.findOne({ _id: tenantId, isActive: true }).lean<Tenant>();
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (!tenant.enabledModules || !tenant.enabledModules.includes(dto.moduleType)) {
      throw new BadRequestException(`Tenant does not have access to module: ${dto.moduleType}`);
    }

    const uniqueLeadIds = [...new Set(dto.leadIds)];

    const leads = await this.leadModel.find({
      _id: { $in: uniqueLeadIds },
      tenantId,
      deletedAt: null,
    }).lean<Lead[]>();

    if (leads.length !== uniqueLeadIds.length) {
      throw new BadRequestException('Some leads not found or do not belong to tenant');
    }

    const campaign = new this.campaignModel({
      tenantId,
      name: dto.name,
      moduleType: dto.moduleType,
      customPrompt: dto.customPrompt,
      emailConfig: dto.emailConfig ?? null,
      status: CampaignStatus.DRAFT,
      totalItems: uniqueLeadIds.length,
      createdBy: userId,
    });
    const savedCampaign = await campaign.save();

    const items = uniqueLeadIds.map(leadId => ({
      tenantId,
      campaignId: savedCampaign._id,
      leadId,
      status: CampaignItemStatus.PENDING,
    }));
    await this.campaignItemModel.insertMany(items);

    return savedCampaign.toObject();
  }

  async getCampaigns(
    tenantId: string | null,
    filters?: { status?: CampaignStatus; page?: number; limit?: number },
  ): Promise<{ data: Campaign[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const query: any = { deletedAt: null };
    if (tenantId) query.tenantId = tenantId;
    if (filters?.status) query.status = filters.status;

    const [data, total] = await Promise.all([
      this.campaignModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Campaign[]>(),
      this.campaignModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async getCampaignDetails(tenantId: string, campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, tenantId, deletedAt: null })
      .lean<Campaign>();

    if (!campaign) throw new NotFoundException('Campaign not found');

    const itemCounts = await this.campaignItemModel.aggregate([
      { $match: { tenantId, campaignId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = new Map(itemCounts.map((r: any) => [r._id, r.count]));
    (campaign as any).successCount = statusMap.get(CampaignItemStatus.SUCCESS) || 0;
    (campaign as any).failureCount = statusMap.get(CampaignItemStatus.FAILED) || 0;
    (campaign as any).processedItems =
      (statusMap.get(CampaignItemStatus.PROCESSING) || 0) +
      (campaign as any).successCount +
      (campaign as any).failureCount;

    return campaign;
  }

  async updateCampaignStatus(tenantId: string, campaignId: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, tenantId, deletedAt: null })
      .lean<Campaign>();

    if (!campaign) throw new NotFoundException('Campaign not found');

    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [CampaignStatus.READY],
      [CampaignStatus.READY]: [CampaignStatus.RUNNING],
      [CampaignStatus.RUNNING]: [CampaignStatus.COMPLETED, CampaignStatus.FAILED],
      [CampaignStatus.COMPLETED]: [],
      [CampaignStatus.FAILED]: [],
    };

    if (!validTransitions[campaign.status].includes(status)) {
      throw new BadRequestException(`Invalid status transition from ${campaign.status} to ${status}`);
    }

    const updated = await this.campaignModel
      .findOneAndUpdate({ _id: campaignId, tenantId, deletedAt: null }, { status }, { new: true })
      .lean<Campaign>();

    if (!updated) throw new NotFoundException('Campaign not found');
    return updated;
  }

  async startCampaign(tenantId: string | null, campaignId: string): Promise<Campaign> {
    const query: any = { _id: campaignId, deletedAt: null };
    if (tenantId) query.tenantId = tenantId;

    const campaign = await this.campaignModel.findOne(query).lean<Campaign>();
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Campaign must be in DRAFT status to start');
    }
    if (campaign.totalItems === 0) {
      throw new BadRequestException('Campaign must have at least one item to start');
    }

    if (tenantId) {
      await this.quotaService.checkQuotaForCampaignStart(campaign.tenantId, campaign.moduleType, campaign.totalItems);
    }

    // Atomic status transition: DRAFT → READY
    const atomicQuery: any = { _id: campaignId, status: CampaignStatus.DRAFT, deletedAt: null };
    if (tenantId) atomicQuery.tenantId = tenantId;

    const result = await this.campaignModel.findOneAndUpdate(
      atomicQuery,
      { status: CampaignStatus.READY },
      { new: true },
    );

    if (!result) {
      throw new BadRequestException('Failed to start campaign. Campaign may have been modified.');
    }

    await this.campaignQueue.add(
      'process-campaign',
      { campaignId, tenantId: campaign.tenantId },
      { jobId: campaignId },
    );

    const freshQuery: any = { _id: campaignId, deletedAt: null };
    if (tenantId) freshQuery.tenantId = tenantId;
    const freshCampaign = await this.campaignModel.findOne(freshQuery).lean<Campaign>();

    if (!freshCampaign) throw new NotFoundException('Campaign not found');
    return freshCampaign;
  }

  async softDeleteCampaign(tenantId: string | null, campaignId: string): Promise<void> {
    const query: any = { _id: campaignId, deletedAt: null };
    if (tenantId) query.tenantId = tenantId;

    const result = await this.campaignModel.findOneAndUpdate(query, { deletedAt: new Date() });
    if (!result) throw new NotFoundException('Campaign not found');
  }
}
