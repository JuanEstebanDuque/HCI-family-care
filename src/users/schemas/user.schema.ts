import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, enum: ['CAREGIVER', 'ELDER'] })
  rol: string;

  @Prop()
  email?: string;

  @Prop()
  pin_vinculacion?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
