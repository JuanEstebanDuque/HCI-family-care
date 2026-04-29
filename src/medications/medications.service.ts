import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Medication, MedicationDocument } from './schemas/medication.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(createMedicationDto: any): Promise<Medication> {
    const elder = await this.usersService.findByPin(createMedicationDto.elder_id);
    if (!elder) throw new NotFoundException(`Elder no encontrado con PIN: ${createMedicationDto.elder_id}`);

    const createdMedication = new this.medicationModel({
      ...createMedicationDto,
      elder_id: new Types.ObjectId((elder as any)._id.toString()),
    });
    return createdMedication.save();
  }

  async findAllByElder(pin: string): Promise<Medication[]> {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`Elder no encontrado con PIN: ${pin}`);
    
    return this.medicationModel.find({ elder_id: new Types.ObjectId((elder as any)._id.toString()) }).exec();
  }

  async remove(id: string): Promise<any> {
    const deleted = await this.medicationModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Medication with id ${id} not found`);
    }
    return deleted;
  }
}
