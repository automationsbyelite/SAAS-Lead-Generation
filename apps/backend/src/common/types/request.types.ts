import { Request } from 'express';
import { JwtPayload } from '@shared/types/jwt-payload.interface';

export interface TenantRequest extends Request {
  tenantId?: string;
  user: JwtPayload;
}
