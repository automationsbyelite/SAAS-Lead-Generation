import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { CampaignItem, CampaignItemSchema } from '../campaigns/campaign-item.entity';
import { Campaign, CampaignSchema } from '../campaigns/campaign.entity';
import { Lead, LeadSchema } from '../leads/lead.entity';
import { AICallService } from './ai-call.service';
import { WebhookService } from './webhook.service';
import { AICallController } from './ai-call.controller';
import { WebhookController } from './webhook.controller';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CampaignItem.name, schema: CampaignItemSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
    QuotaModule,
  ],
  controllers: [AICallController, WebhookController],
  providers: [AICallService, WebhookService],
  exports: [AICallService],
})
export class AICallModule {}
