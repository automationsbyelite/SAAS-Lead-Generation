import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignItem } from '../campaigns/campaign-item.entity';
import { Campaign } from '../campaigns/campaign.entity';
import { Lead } from '../leads/lead.entity';
import { AICallService } from './ai-call.service';
import { WebhookService } from './webhook.service';
import { AICallController } from './ai-call.controller';
import { WebhookController } from './webhook.controller';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignItem, Campaign, Lead]),
    QuotaModule,
  ],
  controllers: [AICallController, WebhookController],
  providers: [AICallService, WebhookService],
  exports: [AICallService],
})
export class AICallModule {}
