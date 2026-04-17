import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PairingDocument = Pairing & Document;

@Schema({ timestamps: true })
export class Pairing {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  caregiver_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  elder_id: Types.ObjectId;
}

export const PairingSchema = SchemaFactory.createForClass(Pairing);
