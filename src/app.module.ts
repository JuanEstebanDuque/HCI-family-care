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
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://juanestebanduque875_db_user:crDnR5JVpo3Rm1tV@ac-u8pvbzz-shard-00-00.2rbouqs.mongodb.net:27017,ac-u8pvbzz-shard-00-01.2rbouqs.mongodb.net:27017,ac-u8pvbzz-shard-00-02.2rbouqs.mongodb.net:27017/hci-sensors?ssl=true&replicaSet=atlas-8b551c-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0'),
    TestModule,
    UsersModule,
    PairingsModule,
    EventsModule,
    MedicationsModule,
    AnalyticsModule,
    RemindersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
