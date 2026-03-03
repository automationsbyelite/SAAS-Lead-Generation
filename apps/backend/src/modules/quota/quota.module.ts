import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantQuota, TenantQuotaSchema } from './tenant-quota.entity';
import { QuotaService } from './quota.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: TenantQuota.name, schema: TenantQuotaSchema }])],
  providers: [QuotaService],
  exports: [MongooseModule, QuotaService],
})
export class QuotaModule {}
