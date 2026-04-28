import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Medication, MedicationDocument } from './schemas/medication.schema';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
  ) {}

  async create(createMedicationDto: any): Promise<Medication> {
    const createdMedication = new this.medicationModel({
      ...createMedicationDto,
      elder_id: new Types.ObjectId(createMedicationDto.elder_id),
    });
    return createdMedication.save();
  }

  async findAllByElder(elderId: string): Promise<Medication[]> {
    return this.medicationModel.find({ elder_id: new Types.ObjectId(elderId) }).exec();
  }

  async remove(id: string): Promise<any> {
    const deleted = await this.medicationModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Medication with id ${id} not found`);
    }
    return deleted;
  }
}
