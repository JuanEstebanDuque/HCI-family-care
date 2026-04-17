import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pairing, PairingDocument } from './schemas/pairing.schema';

@Injectable()
export class PairingsService {
  constructor(@InjectModel(Pairing.name) private pairingModel: Model<PairingDocument>) {}

  async create(caregiver_id: string, elder_id: string) {
    const createdPairing = new this.pairingModel({ caregiver_id, elder_id });
    return createdPairing.save();
  }

  async findAll() {
    return this.pairingModel.find().populate('caregiver_id').populate('elder_id').exec();
  }
}
