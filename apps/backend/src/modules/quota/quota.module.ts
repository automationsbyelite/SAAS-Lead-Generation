import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantQuota } from './tenant-quota.entity';
import { QuotaService } from './quota.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantQuota])],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
