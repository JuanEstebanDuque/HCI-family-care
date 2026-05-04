import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Medication, MedicationDocument } from './schemas/medication.schema';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import {
  filterMedComplianceEvents,
  getStatusForMed,
  isMedicationScheduledToday,
} from '../common/medication-compliance.util';
import { dayOfWeekInCalTz, ymdInCalTz } from '../common/hci-calendar';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
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

  async findAllByElder(pin: string): Promise<(Medication & { status: string; phase: string })[]> {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`Elder no encontrado con PIN: ${pin}`);

    const elderOid = (elder as any)._id.toString();
    const meds = await this.medicationModel
      .find({ elder_id: new Types.ObjectId(elderOid) })
      .lean()
      .exec();

    const now = new Date();
    const todayYmd = ymdInCalTz(now);
    const todayDayOfWeek = dayOfWeekInCalTz(now);
    const events = await this.eventsService.findAllByElder(elderOid);
    const eventsToday = events.filter((e: any) => ymdInCalTz(new Date(e.createdAt)) === todayYmd);
    const medEvents = filterMedComplianceEvents(eventsToday);

    return meds.map((m: any) => {
      if (!isMedicationScheduledToday(m.repetition, todayDayOfWeek)) {
        return { ...m, status: '', phase: '' };
      }
      const { status, phase } = getStatusForMed(m.hora, medEvents, now);
      return { ...m, status, phase };
    }) as (Medication & { status: string; phase: string })[];
  }

  async update(id: string, updateDto: any): Promise<Medication> {
    const updateData = { ...updateDto };
    
    // El frontend envía elder_id como un PIN (ej: "CASA10"), 
    // pero Mongoose espera un ObjectId. Como no necesitamos cambiar 
    // el dueño del medicamento al actualizar, simplemente lo removemos:
    if (updateData.elder_id) {
      delete updateData.elder_id;
    }

    const updated = await this.medicationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
      
    if (!updated) {
      throw new NotFoundException(`Medication with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<any> {
    const deleted = await this.medicationModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Medication with id ${id} not found`);
    }
    return deleted;
  }
}
