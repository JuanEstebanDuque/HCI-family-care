import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestModule } from './test/test.module';
import { UsersModule } from './users/users.module';
import { PairingsModule } from './pairings/pairings.module';
import { EventsModule } from './events/events.module';
import { MedicationsModule } from './medications/medications.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://juanestebanduque875_db_user:crDnR5JVpo3Rm1tV@cluster0.2rbouqs.mongodb.net/hci-sensors?retryWrites=true&w=majority&appName=Cluster0'),
    TestModule,
    UsersModule,
    PairingsModule,
    EventsModule,
    MedicationsModule,
    AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
