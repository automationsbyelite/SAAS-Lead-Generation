import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), UserModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TypeOrmModule, TenantService],
})
export class TenantModule { }
