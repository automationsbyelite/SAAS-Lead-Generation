import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Tenant, TenantSchema } from '../tenant/tenant.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule { }
