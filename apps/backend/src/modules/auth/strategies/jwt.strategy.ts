import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { TenantService } from '../../tenant/tenant.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
        private tenantService: TenantService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-default-key-for-dev',
        });
    }

    async validate(payload: any) {
        // payload should contain userId, tenantId, role
        const user = await this.userService.findById(payload.userId);
        if (!user || (!user.isActive && payload.role !== 'SUPER_ADMIN')) {
            throw new UnauthorizedException('User is not active or does not exist');
        }

        if (payload.role !== 'SUPER_ADMIN') {
            const tenant = await this.tenantService.findById(payload.tenantId);
            if (!tenant || !tenant.isActive) {
                throw new UnauthorizedException('Tenant is inactive');
            }
        }

        // This return object gets attached to req.user automatically by Passport
        return {
            userId: payload.userId,
            tenantId: payload.tenantId,
            role: payload.role
        };
    }
}
