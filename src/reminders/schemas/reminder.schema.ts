import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ required: true })
  elder_id: string;

  @Prop({ required: true })
  actividad: string;

  @Prop({ required: true })
  recordatorio_dia: number;

  @Prop({ required: true })
  hora: string;

  @Prop({ type: Object, default: { frequency: 'none' } })
  repetition: {
    frequency: string; // 'none', 'daily', 'weekly', 'monthly', 'yearly'
    interval?: number; // Cada cuantos días/semanas (ej: 1 = cada semana)
    daysOfWeek?: number[]; // [0, 1, 2, 3, 4, 5, 6] para frequency = 'weekly'
  };
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
