import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);
  private lastTriggeredMinute = '';

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
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
      // Buscar todos los recordatorios. 
      // En un sistema real, filtraríamos por elder_id, pero aquí simularemos que todos aplican
      const reminders = await this.reminderModel.find().exec();
      
      for (const r of reminders) {
        // Asumiendo que r.hora viene en formato "HH:mm" o "HH:mm:ss"
        if (r.hora.startsWith(timeStr)) {
          this.logger.log(`¡Es hora del recordatorio! -> ${r.actividad} a las ${r.hora}`);
          this.lastTriggeredMinute = timeStr;
          
          // Determinar el tipo para enviarlo al Bridge
          // Si la palabra clave es "pastilla", "medicamento", "dosis", "medicina", lo tratamos como MEDICACION
          const act = r.actividad.toLowerCase();
          let tipo = 'ACTIVIDAD';
          if (act.includes('medic') || act.includes('pastill') || act.includes('dosis')) {
            tipo = 'MEDICACION';
          }

          // Enviar al puente Bluetooth
          fetch('http://localhost:3001/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: tipo })
          }).then(res => {
            if (res.ok) this.logger.log(`Notificación enviada exitosamente al Bluetooth (${tipo})`);
          }).catch(err => {
            this.logger.error(`Error enviando notificación al Bluetooth: ${err.message}`);
          });

          // Solo detonamos uno por minuto para no saturar el Arduino
          break;
        }
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
}
