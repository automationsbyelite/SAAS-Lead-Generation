import { BullModule } from '@nestjs/bullmq';

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const campaignExecutionQueue = BullModule.registerQueue({
  name: 'campaign-execution',
  connection: redisConfig,
});
