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
  schedule: string; // Ej: Con comida / Descripción libre

  @Prop({ required: true, match: /^\d{2}:\d{2}$/ })
  hora: string; // Hora de toma en formato HH:mm — Ej: "11:00"

  @Prop({ type: Object, default: { frequency: 'none' } })
  repetition: {
    frequency: string; // 'none', 'daily', 'weekly', 'monthly', 'yearly'
    interval?: number; // Cada cuantos días/semanas (ej: 1 = cada semana)
    daysOfWeek?: number[]; // [0, 1, 2, 3, 4, 5, 6] para frequency = 'weekly'
  };
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);
