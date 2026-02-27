import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { Lead } from '../leads/lead.entity';
import { TenantModule } from '../tenant/tenant.module';
import { LeadsModule } from '../leads/leads.module';
import { redisConfig } from '../../config/redis.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Lead]),
        BullModule.registerQueue({
            name: 'scraper-jobs',
            connection: redisConfig,
        }),
        TenantModule,
        LeadsModule,
    ],
    controllers: [ScraperController],
    providers: [ScraperService],
})
export class ScraperModule { }
