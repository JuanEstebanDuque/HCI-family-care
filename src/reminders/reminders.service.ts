import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';
import { Medication, MedicationDocument } from '../medications/schemas/medication.schema';

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);
  private lastTriggeredMinute = '';

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
  ) {}

  onModuleInit() {
    this.logger.log('Iniciando servicio de recordatorios (Cron local)...');
    
    // Revisar cada 15 segundos
    setInterval(() => this.checkReminders(), 15000);
  }

  async checkReminders() {
    const now = new Date();
    // Convertimos la hora local al formato HH:mm que llega del frontend
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMin = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${currentHour}:${currentMin}`; // Ej: "14:30" o "14:30:00" -> el frontend manda "14:30" o "14:30:00"
    
    // Para evitar que suene 4 veces en el mismo minuto (ya que revisamos cada 15s)
    if (this.lastTriggeredMinute === timeStr) {
      return;
    }

    try {
      // Buscar todos los recordatorios y medicaciones
      const reminders = await this.reminderModel.find().exec();
      const medications = await this.medicationModel.find().exec();
      
      const notificationsToSend: { tipo: string, mensaje: string }[] = [];

      for (const r of reminders) {
        if (r.hora && r.hora.startsWith(timeStr)) {
          let tipo = 'ACTIVIDAD';
          const act = r.actividad.toLowerCase();
          if (act.includes('medic') || act.includes('pastill') || act.includes('dosis')) {
            tipo = 'MEDICACION';
          }
          notificationsToSend.push({ tipo, mensaje: r.actividad });
        }
      }

      for (const m of medications) {
        if (m.hora && m.hora.startsWith(timeStr)) {
          // Medicaciones van directamente como MEDICACION
          notificationsToSend.push({ tipo: 'MEDICACION', mensaje: m.name });
        }
      }

      if (notificationsToSend.length > 0) {
        this.logger.log(`¡Hay ${notificationsToSend.length} notificaciones para las ${timeStr}!`);
        this.lastTriggeredMinute = timeStr;

        // Enviar al puente Bluetooth con retraso (staggering) si hay varias
        notificationsToSend.forEach((notif, index) => {
          setTimeout(() => {
            this.logger.log(`-> Enviando notificación: ${notif.mensaje} (${notif.tipo})`);
            fetch('http://localhost:3001/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: notif.tipo })
            }).then(res => {
              if (res.ok) this.logger.log(`Notificación confirmada por el Bluetooth (${notif.tipo})`);
            }).catch(err => {
              this.logger.error(`Error enviando notificación al Bluetooth: ${err.message}`);
            });
          }, index * 15000); // 15 segundos de diferencia entre notificaciones concurrentes
        });
      }
    } catch (error) {
      this.logger.error(`Error consultando recordatorios: ${error.message}`);
    }
  }

  async create(reminderData: Partial<Reminder>) {
    const createdReminder = new this.reminderModel(reminderData);
    return createdReminder.save();
  }

  async findByElder(elder_id: string) {
    return this.reminderModel.find({ elder_id }).sort({ createdAt: -1 }).exec();
  }

  async update(id: string, updateDto: Partial<Reminder>) {
    const updated = await this.reminderModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Reminder with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.reminderModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Reminder with id ${id} not found`);
    }
    return deleted;
  }
}
