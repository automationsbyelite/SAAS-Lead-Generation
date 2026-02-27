import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantRequest } from '../types/request.types';
import { Role } from '@shared/enums/role.enum';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    
    if (request.user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!request.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    return true;
  }
}
