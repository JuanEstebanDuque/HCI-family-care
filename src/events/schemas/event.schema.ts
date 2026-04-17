import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  elder_id: Types.ObjectId;

  @Prop({ required: true, enum: ['MEDICACION', 'SEDENTARISMO', 'RITUAL', 'ACTIVIDAD'] })
  modulo: string;

  @Prop({ type: Object, required: true })
  data: any; // Sub-documento libre para aceptar cualquier JSON dinámico
}

export const EventSchema = SchemaFactory.createForClass(Event);
