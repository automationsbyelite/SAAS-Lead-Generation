import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SocialAccount } from './entities/social-account.entity';
import { SocialPost } from './entities/social-post.entity';
import { SocialAccountService } from './social-account.service';
import { SocialPublisherService } from './social-publisher.service';
import { SocialAccountController } from './social-account.controller';
import { SocialPublisherController } from './social-publisher.controller';
import { TenantModule } from '../tenant/tenant.module';
import { redisConfig } from '../../config/redis.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([SocialAccount, SocialPost]),
        BullModule.registerQueue({
            name: 'social-publisher',
            connection: redisConfig,
        }),
        TenantModule,
    ],
    controllers: [SocialAccountController, SocialPublisherController],
    providers: [SocialAccountService, SocialPublisherService],
    exports: [SocialAccountService, SocialPublisherService],
})
export class SocialPublisherModule { }
