import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantRequest } from '../../../common/types/request.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }

        // Passport sets request.user to whatever JwtStrategy returns.
        // TenantGuard expects request.tenantId directly.
        const request = context.switchToHttp().getRequest<TenantRequest>();
        request.user = user;
        if (user.tenantId) {
            request.tenantId = user.tenantId;
        }

        return user;
    }
}
