import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { LeadsModule } from './modules/leads/leads.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AICallModule } from './modules/ai-call/ai-call.module';
import { QuotaModule } from './modules/quota/quota.module';
import { CommonModule } from './common/common.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { AuthModule } from './modules/auth/auth.module';
import { redisConfig } from './config/redis.config';
import { Tenant } from './modules/tenant/tenant.entity';
import { User } from './modules/user/user.entity';
import { Lead } from './modules/leads/lead.entity';
import { Campaign } from './modules/campaigns/campaign.entity';
import { CampaignItem } from './modules/campaigns/campaign-item.entity';
import { TenantQuota } from './modules/quota/tenant-quota.entity';
import { BillingModule } from './modules/billing/billing.module';
import { EventsModule } from './events/events.module';
import { SocialPublisherModule } from './modules/social-publisher/social-publisher.module';
import { SocialAccount } from './modules/social-publisher/entities/social-account.entity';
import { SocialPost } from './modules/social-publisher/entities/social-post.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'saas',
      entities: [Tenant, User, Lead, Campaign, CampaignItem, TenantQuota, SocialAccount, SocialPost],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    BullModule.forRoot({
      connection: redisConfig,
    }),
    TenantModule,
    UserModule,
    LeadsModule,
    CampaignsModule,
    AICallModule,
    QuotaModule,
    CommonModule,
    ScraperModule,
    AuthModule,
    BillingModule,
    EventsModule,
    SocialPublisherModule,
  ],
})
export class AppModule { }
