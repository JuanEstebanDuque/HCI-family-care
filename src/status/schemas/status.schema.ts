import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StatusDocument = Status & Document;

@Schema({ timestamps: true })
export class Status {
  @Prop({ required: true, unique: true })
  sensor_id: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  module: string;

  @Prop()
  timestamp: string;
}

export const StatusSchema = SchemaFactory.createForClass(Status);
