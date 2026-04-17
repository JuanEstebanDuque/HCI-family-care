import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { UsersService } from '../users/users.service';

export class EventUpdateDto {
  token: string;
  modulo: string;
  data: any;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createFromArduino(update: EventUpdateDto) {
    // 1. Validar el token buscando a Manuel en la base de usuarios
    const elder = await this.usersService.findByPin(update.token);
    
    if (!elder) {
      throw new NotFoundException(`No se encontró un usuario ELDER con el token: ${update.token}`);
    }

    // 2. Insertar el evento histórico
    const createdEvent = new this.eventModel({
      elder_id: elder._id,
      modulo: update.modulo,
      data: update.data,
    });

    await createdEvent.save();

    return { 
      success: true, 
      mensaje: `Evento registrado para ${elder.nombre}`,
      evento_id: createdEvent._id
    };
  }

  async findAllByElder(elder_id: string) {
    return this.eventModel.find({ elder_id }).sort({ createdAt: -1 }).exec();
  }
}
