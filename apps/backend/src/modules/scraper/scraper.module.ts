import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { Lead, LeadSchema } from '../leads/lead.entity';
import { TenantModule } from '../tenant/tenant.module';
import { LeadsModule } from '../leads/leads.module';
import { redisConfig } from '../../config/redis.config';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
        BullModule.registerQueue({ name: 'scraper-jobs', connection: redisConfig }),
        TenantModule,
        LeadsModule,
    ],
    controllers: [ScraperController],
    providers: [ScraperService],
})
export class ScraperModule { }
