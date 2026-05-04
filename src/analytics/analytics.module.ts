import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { MedicationsModule } from '../medications/medications.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [EventsModule, UsersModule, MedicationsModule, RemindersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
