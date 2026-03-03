import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) { }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ _id: id, isActive: true, deletedAt: null }).lean<User>();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email, isActive: true, deletedAt: null }).lean<User>();
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    return this.userModel
      .find({ tenantId, isActive: true, deletedAt: null })
      .select('_id email firstName lastName role createdAt')
      .lean<User[]>();
  }

  async create(data: Partial<User>): Promise<User> {
    const created = new this.userModel(data);
    const saved = await created.save();
    return saved.toObject();
  }
}
