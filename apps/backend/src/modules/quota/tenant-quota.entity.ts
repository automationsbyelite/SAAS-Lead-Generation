import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

export type TenantQuotaDocument = TenantQuota & Document;

@Schema({ timestamps: true, collection: 'tenant_quotas' })
export class TenantQuota {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, enum: CampaignModuleType, required: true })
  moduleType: CampaignModuleType;

  @Prop({ required: true })
  monthlyLimit: number;

  @Prop({ default: 0 })
  usedThisMonth: number;

  @Prop({ type: Date, required: true })
  resetAt: Date;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantQuotaSchema = SchemaFactory.createForClass(TenantQuota);

// Compound unique: one quota per tenant per module
TenantQuotaSchema.index({ tenantId: 1, moduleType: 1 }, { unique: true });

TenantQuotaSchema.virtual('id').get(function () {
  return this._id;
});
TenantQuotaSchema.set('toJSON', { virtuals: true });
TenantQuotaSchema.set('toObject', { virtuals: true });
