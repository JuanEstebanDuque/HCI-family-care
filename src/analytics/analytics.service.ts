import { Injectable } from '@nestjs/common';
import { EventsService } from '../events/events.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly eventsService: EventsService) {}

  async getDashboard(elderId: string) {
    const events = await this.eventsService.findAllByElder(elderId);
    
    let pasosHoy = 0;
    let promedioBPM = 0;
    let tiempoSalaSegundos = 0;
    let sumBPM = 0;
    let countBPM = 0;

    // Lógica básica simulada para procesar eventos
    events.forEach((event: any) => {
      // Filtrar por eventos de hoy (simulado, asumiendo que todos son de hoy para este ejemplo rápido)
      if (event.modulo === 'baston' && event.data.sensor_id === 'mpu6050') {
        pasosHoy = parseInt(event.data.estado) || 0;
      }
      // asumiendo que llega ritmo cardíaco en algún lado
      if (event.modulo === 'ritual' && event.data.estado.includes('BPM')) {
        // Parsear BPM
      }
    });

    // Hardcodeado para simular la matemática en base a los eventos
    // En un futuro, aquí se procesarían los arrays exactos filtrando por fecha
    return {
      pasosHoy: pasosHoy || 1050,
      promedioBPM: 85,
      tiempoSala: "2h 15m",
      resumenDiarioData: [
        { name: "00:00", value: 10 },
        { name: "04:00", value: 5 },
        { name: "08:00", value: 40 },
        { name: "12:00", value: 30 },
        { name: "16:00", value: 70 },
        { name: "20:00", value: 20 },
      ]
    };
  }

  async getPatterns(elderId: string) {
    // Array preformateado para recharts en el Frontend
    return {
      pasos: [
        { dia: 'Lu', valor: 1200 },
        { dia: 'Ma', valor: 900 },
        { dia: 'Mi', valor: 1500 },
        { dia: 'Ju', valor: 800 },
        { dia: 'Vi', valor: 2100 },
        { dia: 'Sa', valor: 500 },
        { dia: 'Do', valor: 300 },
      ],
      ritmoCardiaco: [
        { dia: 'Lu', valor: 85 },
        { dia: 'Ma', valor: 90 },
        { dia: 'Mi', valor: 82 },
        { dia: 'Ju', valor: 95 },
        { dia: 'Vi', valor: 80 },
        { dia: 'Sa', valor: 88 },
        { dia: 'Do', valor: 84 },
      ],
      movimiento: [
        { dia: 'Lu', valor: 45 },
        { dia: 'Ma', valor: 30 },
        { dia: 'Mi', valor: 60 },
        { dia: 'Ju', valor: 20 },
        { dia: 'Vi', valor: 80 },
        { dia: 'Sa', valor: 15 },
        { dia: 'Do', valor: 10 },
      ],
      tiempoSala: [
        { dia: 'Lu', valor: 120 },
        { dia: 'Ma', valor: 180 },
        { dia: 'Mi', valor: 90 },
        { dia: 'Ju', valor: 240 },
        { dia: 'Vi', valor: 60 },
        { dia: 'Sa', valor: 300 },
        { dia: 'Do', valor: 360 },
      ]
    };
  }

  async getTimeline(elderId: string) {
    const events = await this.eventsService.findAllByElder(elderId);
    
    // Mapear eventos a un formato visual
    const timeline = events.map((event: any) => {
      let titulo = "Evento detectado";
      let subtitulo = event.modulo;
      
      if (event.modulo === 'baston') {
        titulo = "Actividad Física";
        subtitulo = `Pasos detectados: ${event.data.estado}`;
      } else if (event.modulo === 'ritual') {
        titulo = "Tótem Tocado";
        subtitulo = "Saludo enviado";
      } else if (event.modulo === 'activity' && event.data.sensor_id === 'fridge_laser') {
        titulo = "Nevera abierta";
        subtitulo = `Buscando comida`;
      } else if (event.modulo === 'medication') {
        titulo = "Medicina tomada";
        subtitulo = "Frasco agitado";
      }

      return {
        id: event._id,
        hora: new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        titulo,
        subtitulo
      };
    });

    return timeline.reverse(); // Más recientes primero
  }
}
