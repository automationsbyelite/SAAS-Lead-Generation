import { Role } from '../enums/role.enum';

export interface JwtPayload {
    userId: string;
    tenantId: string;
    role: Role;
}
