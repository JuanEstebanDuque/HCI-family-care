import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestDocument = Test & Document;

@Schema({ timestamps: true })
export class Test {
  @Prop({ required: true })
  message: string;
}

export const TestSchema = SchemaFactory.createForClass(Test);
