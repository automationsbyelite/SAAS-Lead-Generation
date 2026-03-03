import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum SocialPlatform {
    FACEBOOK = 'facebook',
    INSTAGRAM = 'instagram',
    LINKEDIN = 'linkedin',
}

export type SocialAccountDocument = SocialAccount & Document;

@Schema({ timestamps: true, collection: 'social_accounts' })
export class SocialAccount {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true }) tenantId: string;
  @Prop({ type: String, required: true }) userId: string;
  @Prop({ type: String, enum: SocialPlatform, required: true }) platform: SocialPlatform;
  @Prop({ required: true }) platformId: string;
  @Prop({ required: true }) username: string;
  @Prop({ required: true }) accessToken: string;
  @Prop({ type: String, default: null }) pageId: string;
  @Prop({ type: String, default: null }) profilePicture: string;
  @Prop({ default: true }) isActive: boolean;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SocialAccountSchema = SchemaFactory.createForClass(SocialAccount);
SocialAccountSchema.virtual('id').get(function () { return this._id; });
SocialAccountSchema.set('toJSON', { virtuals: true });
SocialAccountSchema.set('toObject', { virtuals: true });
