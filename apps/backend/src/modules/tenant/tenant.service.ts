import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) { }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { id, isActive: true, deletedAt: IsNull() },
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { createdAt: 'DESC' }
    });
  }

  async create(tenant: Partial<Tenant>): Promise<Tenant> {
    const newTenant = this.tenantRepository.create(tenant);
    return this.tenantRepository.save(newTenant);
  }

  async updateModules(id: string, enabledModules: string[]): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id, isActive: true, deletedAt: IsNull() },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.enabledModules = enabledModules as any;
    return this.tenantRepository.save(tenant);
  }
}
