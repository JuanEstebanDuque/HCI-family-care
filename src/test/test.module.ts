import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { Test, TestSchema } from './schemas/test.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Test.name, schema: TestSchema }])],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
