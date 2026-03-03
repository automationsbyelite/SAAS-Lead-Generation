// MongoDB Migration — Mongoose v10 compat
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { CampaignProcessor } from './campaign/campaign.processor';
import { Campaign, CampaignSchema } from './entities/campaign.entity';
import { CampaignItem, CampaignItemSchema } from './entities/campaign-item.entity';
import { Lead, LeadSchema } from './entities/lead.entity';
import { SocialAccount, SocialAccountSchema } from './entities/social-account.entity';
import { SocialPost, SocialPostSchema } from './entities/social-post.entity';
import { redisConfig } from './config/redis.config';
import { WorkerScraperModule } from './modules/scraper/scraper.module';
import { SocialPublisherProcessor } from './social-publisher/social-publisher.processor';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/saas_db'),
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignItem.name, schema: CampaignItemSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: SocialAccount.name, schema: SocialAccountSchema },
      { name: SocialPost.name, schema: SocialPostSchema },
    ]),
    BullModule.forRoot({ connection: redisConfig }),
    BullModule.registerQueue({ name: 'campaign-execution' }),
    BullModule.registerQueue({ name: 'scraper-jobs' }),
    BullModule.registerQueue({ name: 'social-publisher' }),
    WorkerScraperModule,
  ],
  providers: [CampaignProcessor, SocialPublisherProcessor],
})
export class WorkerModule { }
