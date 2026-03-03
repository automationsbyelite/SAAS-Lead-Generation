import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@shared/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, default: null })
  firstName: string;

  @Prop({ type: String, default: null })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  // Populated by Mongoose timestamps — typed here for lean() access
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound unique index: one email per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

UserSchema.virtual('id').get(function () {
  return this._id;
});
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
