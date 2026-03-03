import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Campaign, CampaignSchema } from './campaign.entity';
import { CampaignItem, CampaignItemSchema } from './campaign-item.entity';
import { Lead, LeadSchema } from '../leads/lead.entity';
import { Tenant, TenantSchema } from '../tenant/tenant.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { QuotaModule } from '../quota/quota.module';
import { redisConfig } from '../../config/redis.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignItem.name, schema: CampaignItemSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    BullModule.registerQueue({ name: 'campaign-execution', connection: redisConfig }),
    QuotaModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [MongooseModule, CampaignsService],
})
export class CampaignsModule { }
