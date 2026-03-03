import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { SocialPlatform } from './social-account.entity';

export enum PostStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  POSTED = 'posted',
  FAILED = 'failed',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  REELS = 'REELS',
}

export type SocialPostDocument = SocialPost & Document;

@Schema({ timestamps: true, collection: 'social_posts' })
export class SocialPost {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  socialAccountId: string;

  @Prop({ type: String, enum: SocialPlatform, required: true })
  platform: SocialPlatform;

  @Prop({ required: true })
  caption: string;

  @Prop({ required: true })
  mediaUrl: string;

  @Prop({ type: String, enum: MediaType, default: MediaType.IMAGE })
  mediaType: MediaType;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ type: String, enum: PostStatus, default: PostStatus.PENDING })
  status: PostStatus;

  @Prop({ type: String, default: null })
  platformPostId: string;

  @Prop({ type: String, default: null })
  errorMessage: string;

  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SocialPostSchema = SchemaFactory.createForClass(SocialPost);

SocialPostSchema.index({ tenantId: 1, status: 1 });
SocialPostSchema.index({ tenantId: 1, userId: 1 });

SocialPostSchema.virtual('id').get(function () {
  return this._id;
});
SocialPostSchema.set('toJSON', { virtuals: true });
SocialPostSchema.set('toObject', { virtuals: true });
