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
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
