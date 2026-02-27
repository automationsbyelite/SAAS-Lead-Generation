import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { Role } from '@shared/enums/role.enum';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tenantService: TenantService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. Check if user exists
        const existingUser = await this.userService.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(dto.password, salt);

        // 3. Create a Tenant workspace (Base Tier: No paid modules enabled)
        const tenant = await this.tenantService.create({
            name: dto.tenantName,
            enabledModules: []
        });

        // 4. Create the User (Tenant Owner)
        const user = await this.userService.create({
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            tenantId: tenant.id,
            role: Role.TENANT_OWNER,
        });

        // 5. Generate Token
        const payload = {
            userId: user.id,
            tenantId: tenant.id,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                tenantId: user.tenantId,
                role: user.role,
            }
        };
    }

    async login(dto: LoginDto) {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                tenantId: user.tenantId,
                role: user.role,
            }
        };
    }
}
