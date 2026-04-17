import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://juanestebanduque875_db_user:crDnR5JVpo3Rm1tV@cluster0.2rbouqs.mongodb.net/hci-sensors?retryWrites=true&w=majority&appName=Cluster0'),
    StatusModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
