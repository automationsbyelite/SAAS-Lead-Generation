import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { SocialAccount, SocialAccountSchema } from './entities/social-account.entity';
import { SocialPost, SocialPostSchema } from './entities/social-post.entity';
import { SocialAccountService } from './social-account.service';
import { SocialPublisherService } from './social-publisher.service';
import { AiGeneratorService } from './ai-generator.service';
import { SocialAccountController } from './social-account.controller';
import { SocialPublisherController } from './social-publisher.controller';
import { TenantModule } from '../tenant/tenant.module';
import { redisConfig } from '../../config/redis.config';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SocialAccount.name, schema: SocialAccountSchema },
            { name: SocialPost.name, schema: SocialPostSchema },
        ]),
        BullModule.registerQueue({ name: 'social-publisher', connection: redisConfig }),
        TenantModule,
    ],
    controllers: [SocialAccountController, SocialPublisherController],
    providers: [SocialAccountService, SocialPublisherService, AiGeneratorService],
    exports: [MongooseModule, SocialAccountService, SocialPublisherService, AiGeneratorService],
})
export class SocialPublisherModule { }
