import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true, collection: 'campaigns' })
export class Campaign {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  customPrompt: string;

  @Prop({ type: Object, default: null })
  emailConfig: Record<string, any>;

  @Prop({ type: String, enum: CampaignModuleType, required: true })
  moduleType: CampaignModuleType;

  @Prop({ type: String, enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Prop({ default: 0 }) totalItems: number;
  @Prop({ default: 0 }) processedItems: number;
  @Prop({ default: 0 }) successCount: number;
  @Prop({ default: 0 }) failureCount: number;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.virtual('id').get(function () { return this._id; });
CampaignSchema.set('toJSON', { virtuals: true });
CampaignSchema.set('toObject', { virtuals: true });
