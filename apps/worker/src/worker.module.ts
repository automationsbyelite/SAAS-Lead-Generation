import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CampaignProcessor } from './campaign/campaign.processor';
import { Campaign } from './entities/campaign.entity';
import { CampaignItem } from './entities/campaign-item.entity';
import { Lead } from './entities/lead.entity';
import { redisConfig } from './config/redis.config';
import { WorkerScraperModule } from './modules/scraper/scraper.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'saas',
      entities: [Campaign, CampaignItem, Lead],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Campaign, CampaignItem, Lead]),
    BullModule.forRoot({
      connection: redisConfig,
    }),
    BullModule.registerQueue({
      name: 'campaign-execution',
    }),
    BullModule.registerQueue({
      name: 'scraper-jobs',
    }),
    WorkerScraperModule,
  ],
  providers: [CampaignProcessor],
})
export class WorkerModule { }
