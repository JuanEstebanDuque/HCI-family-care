import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MedicationDocument = Medication & Document;

@Schema({ timestamps: true })
export class Medication {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  elder_id: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Ej: Omega 3

  @Prop({ required: true })
  dose: string; // Ej: 1 capsula/ 300mg

  @Prop({ required: true })
  schedule: string; // Ej: Con comida 11:00
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);
