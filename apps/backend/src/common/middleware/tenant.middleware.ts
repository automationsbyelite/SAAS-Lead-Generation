import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../types/request.types';
import { JwtPayload } from '@shared/types/jwt-payload.interface';
import { Role } from '@shared/enums/role.enum';
import { TenantService } from '../../modules/tenant/tenant.service';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private tenantService: TenantService,
    private userService: UserService,
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantRequest = req as TenantRequest;

    const user = (req as any).user as JwtPayload | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const dbUser = await this.userService.findById(user.userId);
    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    if (user.role === Role.SUPER_ADMIN) {
      tenantRequest.user = user;
      next();
      return;
    }

    if (!user.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    const tenant = await this.tenantService.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    tenantRequest.tenantId = user.tenantId;
    tenantRequest.user = user;

    next();
  }
}
