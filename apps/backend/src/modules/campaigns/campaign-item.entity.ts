import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';

export type CampaignItemDocument = CampaignItem & Document;

@Schema({ timestamps: true, collection: 'campaign_items' })
export class CampaignItem {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true, index: true })
  campaignId: string;

  @Prop({ type: String, required: true, index: true })
  leadId: string;

  @Prop({ type: String, enum: CampaignItemStatus, default: CampaignItemStatus.PENDING })
  status: CampaignItemStatus;

  @Prop({ default: 0 })
  attemptCount: number;

  @Prop({ type: String, default: null })
  externalRefId: string | null;

  @Prop({ type: Date, default: null })
  lastAttemptAt: Date | null;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CampaignItemSchema = SchemaFactory.createForClass(CampaignItem);

// Compound unique: one lead per campaign
CampaignItemSchema.index({ campaignId: 1, leadId: 1 }, { unique: true });
CampaignItemSchema.index({ tenantId: 1, campaignId: 1 });
CampaignItemSchema.index({ tenantId: 1, status: 1 });

CampaignItemSchema.virtual('id').get(function () {
  return this._id;
});
CampaignItemSchema.set('toJSON', { virtuals: true });
CampaignItemSchema.set('toObject', { virtuals: true });
