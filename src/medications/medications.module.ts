import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { Medication, MedicationSchema } from './schemas/medication.schema';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Medication.name, schema: MedicationSchema }]),
    UsersModule,
    EventsModule,
  ],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MongooseModule, MedicationsService],
})
export class MedicationsModule {}
