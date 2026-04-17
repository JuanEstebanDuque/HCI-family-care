import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PairingsService } from './pairings.service';
import { PairingsController } from './pairings.controller';
import { Pairing, PairingSchema } from './schemas/pairing.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Pairing.name, schema: PairingSchema }])],
  controllers: [PairingsController],
  providers: [PairingsService],
})
export class PairingsModule {}
