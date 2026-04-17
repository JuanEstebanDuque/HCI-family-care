import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Status, StatusDocument } from './schemas/status.schema';

export class StatusUpdateDto {
  sensor_id: string;
  value: string;
  module: string;
  timestamp?: string;
}

@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);

  constructor(@InjectModel(Status.name) private statusModel: Model<StatusDocument>) {}

  async processUpdate(update: StatusUpdateDto) {
    if (!update.timestamp) {
      update.timestamp = new Date().toISOString();
    }

    this.logger.log(`Recibido guardando en Altas: [${update.module}] ${update.sensor_id} = ${update.value}`);

    // Guarda el estado en MongoDB Atlas "pisando" el anterior del mismo sensor
    // Esto asegura que la base de datos se mantenga veloz para consultas en tiempo real
    await this.statusModel.findOneAndUpdate(
      { sensor_id: update.sensor_id }, // Búsqueda crítica
      update,                          // Los datos de Firebase
      { upsert: true, new: true }      // Si no existe, lo crea
    );

    return { success: true, timestamp: update.timestamp, storedInMongo: true };
  }

  async getAllStatuses() {
    // Retorna todos los documentos guardados en Atlas
    const rawStatuses = await this.statusModel.find().exec();
    
    // Lo formateamos en un objeto JSON limpio usando como llave el sensor_id
    // Así tu frontend de Next.js no necesita cambiar ninguna lógica y será inmediato
    const statusesRecord: Record<string, StatusUpdateDto> = {};
    
    rawStatuses.forEach((doc) => {
      statusesRecord[doc.sensor_id] = {
        sensor_id: doc.sensor_id,
        value: doc.value,
        module: doc.module,
        timestamp: doc.timestamp
      };
    });

    return statusesRecord;
  }
}
