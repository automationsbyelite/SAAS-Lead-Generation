import { Module } from '@nestjs/common';
import { TenantGuard } from './guards/tenant.guard';
import { RoleGuard } from './guards/role.guard';
import { TenantModule } from '../modules/tenant/tenant.module';
import { UserModule } from '../modules/user/user.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
  imports: [TenantModule, UserModule],
  providers: [TenantGuard, RoleGuard, TenantMiddleware],
  exports: [TenantGuard, RoleGuard],
})
export class CommonModule {}
