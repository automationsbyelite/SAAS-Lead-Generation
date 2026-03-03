import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
  ) { }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ _id: id, isActive: true, deletedAt: null }).lean<Tenant>();
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel
      .find({ isActive: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean<Tenant[]>();
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const created = new this.tenantModel(data);
    const saved = await created.save();
    return saved.toObject();
  }

  async updateModules(id: string, enabledModules: string[]): Promise<Tenant> {
    const tenant = await this.tenantModel.findOneAndUpdate(
      { _id: id, isActive: true, deletedAt: null },
      { enabledModules },
      { new: true },
    ).lean<Tenant>();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }
}
