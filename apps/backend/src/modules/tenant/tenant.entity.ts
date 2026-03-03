import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ type: [String], enum: CampaignModuleType, default: [CampaignModuleType.AI_CALL] })
  enabledModules: CampaignModuleType[];

  // Populated by Mongoose timestamps — typed here for lean() access
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Virtual 'id' so existing code using .id still works
TenantSchema.virtual('id').get(function () {
  return this._id;
});
TenantSchema.set('toJSON', { virtuals: true });
TenantSchema.set('toObject', { virtuals: true });
