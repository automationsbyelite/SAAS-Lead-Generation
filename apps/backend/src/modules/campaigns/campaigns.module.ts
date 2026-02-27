import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Campaign } from './campaign.entity';
import { CampaignItem } from './campaign-item.entity';
import { Lead } from '../leads/lead.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { QuotaModule } from '../quota/quota.module';
import { TenantModule } from '../tenant/tenant.module';
import { redisConfig } from '../../config/redis.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignItem, Lead]),
    BullModule.registerQueue({
      name: 'campaign-execution',
      connection: redisConfig,
    }),
    QuotaModule,
    TenantModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule { }
