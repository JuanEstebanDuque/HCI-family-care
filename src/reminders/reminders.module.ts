import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { MedicationsModule } from '../medications/medications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reminder.name, schema: ReminderSchema }]),
    MedicationsModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService, MongooseModule],
})
export class RemindersModule { }
