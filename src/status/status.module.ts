import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { Status, StatusSchema } from './schemas/status.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Status.name, schema: StatusSchema }])],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
