import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantQuota } from './tenant-quota.entity';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(TenantQuota)
    private quotaRepository: Repository<TenantQuota>,
  ) {}

  async checkQuotaForCampaignStart(
    tenantId: string,
    moduleType: CampaignModuleType,
    requiredCount: number,
  ): Promise<void> {
    await this.resetIfNeeded(tenantId, moduleType);

    const quota = await this.quotaRepository.findOne({
      where: { tenantId, moduleType },
    });

    if (!quota) {
      throw new BadRequestException(`Quota not configured for module ${moduleType}`);
    }

    if (quota.usedThisMonth + requiredCount > quota.monthlyLimit) {
      throw new BadRequestException(
        `Quota exceeded. Available: ${quota.monthlyLimit - quota.usedThisMonth}, Required: ${requiredCount}`,
      );
    }
  }

  async incrementUsage(
    tenantId: string,
    moduleType: CampaignModuleType,
    count: number,
  ): Promise<void> {
    await this.resetIfNeeded(tenantId, moduleType);

    await this.quotaRepository
      .createQueryBuilder()
      .update(TenantQuota)
      .set({
        usedThisMonth: () => `usedThisMonth + ${count}`,
      })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('moduleType = :moduleType', { moduleType })
      .execute();
  }

  async resetIfNeeded(tenantId: string, moduleType: CampaignModuleType): Promise<void> {
    const quota = await this.quotaRepository.findOne({
      where: { tenantId, moduleType },
    });

    if (!quota) {
      return;
    }

    const now = new Date();
    if (quota.resetAt < now) {
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      await this.quotaRepository.update(
        { id: quota.id },
        {
          usedThisMonth: 0,
          resetAt: nextReset,
        },
      );
    }
  }
}
