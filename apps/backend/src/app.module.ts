// MongoDB Migration — Mongoose v10 compat
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
import { BillingModule } from './modules/billing/billing.module';
import { EventsModule } from './events/events.module';
import { SocialPublisherModule } from './modules/social-publisher/social-publisher.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/saas_db'),
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
