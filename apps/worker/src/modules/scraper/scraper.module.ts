import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { ScraperWorker } from './scraper.worker';
import { SearchAggregatorService } from './search-aggregator.service';
import { CheerioScraperService } from './cheerio-scraper.service';

@Module({
    imports: [TypeOrmModule.forFeature([Lead])],
    providers: [ScraperWorker, SearchAggregatorService, CheerioScraperService],
})
export class WorkerScraperModule { }
