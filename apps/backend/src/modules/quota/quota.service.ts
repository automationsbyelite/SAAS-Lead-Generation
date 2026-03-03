import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantQuota, TenantQuotaDocument } from './tenant-quota.entity';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Injectable()
export class QuotaService {
  constructor(
    @InjectModel(TenantQuota.name)
    private quotaModel: Model<TenantQuotaDocument>,
  ) {}

  async checkQuotaForCampaignStart(
    tenantId: string,
    moduleType: CampaignModuleType,
    requiredCount: number,
  ): Promise<void> {
    await this.resetIfNeeded(tenantId, moduleType);

    const quota = await this.quotaModel.findOne({ tenantId, moduleType }).lean<TenantQuota>();

    if (!quota) {
      throw new BadRequestException(`Quota not configured for module ${moduleType}`);
    }

    if (quota.usedThisMonth + requiredCount > quota.monthlyLimit) {
      throw new BadRequestException(
        `Quota exceeded. Available: ${quota.monthlyLimit - quota.usedThisMonth}, Required: ${requiredCount}`,
      );
    }
  }

  async incrementUsage(tenantId: string, moduleType: CampaignModuleType, count: number): Promise<void> {
    await this.resetIfNeeded(tenantId, moduleType);

    await this.quotaModel.findOneAndUpdate(
      { tenantId, moduleType },
      { $inc: { usedThisMonth: count } },
    );
  }

  async resetIfNeeded(tenantId: string, moduleType: CampaignModuleType): Promise<void> {
    const quota = await this.quotaModel.findOne({ tenantId, moduleType }).lean<TenantQuota>();

    if (!quota) return;

    const now = new Date();
    if (quota.resetAt < now) {
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      await this.quotaModel.findOneAndUpdate(
        { _id: (quota as any)._id },
        { usedThisMonth: 0, resetAt: nextReset },
      );
    }
  }
}
