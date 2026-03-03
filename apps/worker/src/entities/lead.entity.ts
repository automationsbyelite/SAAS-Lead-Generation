import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { LeadSource } from '@shared/enums/lead-source.enum';
import { LeadStatus } from '@shared/enums/lead-status.enum';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, default: null }) category: string | null;
  @Prop({ type: String, default: null }) companyName: string | null;
  @Prop({ type: String, default: null }) contactName: string | null;
  @Prop({ type: String, default: null }) phone: string | null;
  @Prop({ type: String, default: null }) email: string | null;
  @Prop({ type: String, default: null }) website: string | null;
  @Prop({ type: String, default: null }) facebook: string | null;
  @Prop({ type: String, default: null }) linkedin: string | null;
  @Prop({ type: String, default: null }) instagram: string | null;

  @Prop({ type: String, enum: LeadSource, required: true })
  source: LeadSource;

  @Prop({ type: String, enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Prop({ type: Object, default: null })
  rawData: Record<string, any> | null;

  @Prop({ type: Date, default: null }) lastContactedAt: Date | null;
  @Prop({ type: Date, default: null }) deletedAt: Date | null;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ tenantId: 1, status: 1 });
LeadSchema.virtual('id').get(function () { return this._id; });
LeadSchema.set('toJSON', { virtuals: true });
LeadSchema.set('toObject', { virtuals: true });
