import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  async getDashboard(pin: string) {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`No se encontró elder con pin: ${pin}`);
    const events = await this.eventsService.findAllByElder((elder as any)._id.toString());
    
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const eventsToday = events.filter((e: any) => new Date(e.createdAt).toLocaleDateString() === todayStr);

    // Estados por defecto
    let estadoGeneral = {
      titulo: "Todo normal hoy",
      descripcion: `La rutina se mantiene dentro de lo esperado.`,
      ultimaActualizacion: "Sin eventos recientes",
      color: "#8faf74" // verde (hex) o nombre de clase, según el front
    };

    let resumenMedicacion = {
      estado: "Pendiente",
      hora: "--:--"
    };

    let resumenActividad = {
      estado: "Sin actividad",
      hora: "--:--"
    };

    let lecturaSistema = {
      titulo: "Lectura del sistema",
      mensaje: "No se detectan anomalías relevantes"
    };

    let ultEventoDate: Date | null = null;
    let tieneAlertaSedentarismo = false;
    let tieneAlertaMedicacion = false;

    eventsToday.forEach((e: any) => {
      const eDate = new Date(e.createdAt);
      if (!ultEventoDate || eDate > ultEventoDate) ultEventoDate = eDate;

      if (e.modulo === 'MEDICACION') {
        if (e.data?.estado === 'duplication_warning') {
          tieneAlertaMedicacion = true;
          resumenMedicacion.estado = "¡Peligro de duplicación!";
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          // Asumimos dosis completada
          resumenMedicacion.estado = "Dosis completada";
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }

      if (e.modulo === 'ACTIVIDAD') {
        if (e.data?.sensor_id === 'sofa_ultrasonic' && e.data?.estado === 'sedentary_alert') {
          tieneAlertaSedentarismo = true;
        }
        if (e.data?.sensor_id === 'mpu6050') {
          resumenActividad.estado = "Actividad registrada";
          resumenActividad.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    });

    if (tieneAlertaMedicacion) {
      estadoGeneral.titulo = "Alerta de Medicación";
      estadoGeneral.descripcion = "Se detectó un intento de tomar medicinas de nuevo.";
      estadoGeneral.color = "#c97b6b"; // rojo/naranja rojizo
      lecturaSistema.mensaje = "Se detectó riesgo de doble medicación";
    } else if (tieneAlertaSedentarismo) {
      estadoGeneral.titulo = "Alerta de Sedentarismo";
      estadoGeneral.descripcion = "Manuel lleva demasiado tiempo inactivo en la sala.";
      estadoGeneral.color = "#f59e0b"; // naranja
      lecturaSistema.mensaje = "Alerta de sedentarismo detectada";
    }

    if (ultEventoDate) {
      const dateVal = ultEventoDate as Date;
      const diffMins = Math.floor((now.getTime() - dateVal.getTime()) / 60000);
      estadoGeneral.ultimaActualizacion = diffMins === 0 ? "hace un momento" : `hace ${diffMins} min`;
    }

    return {
      estadoGeneral,
      resumenHoy: {
        medicacion: resumenMedicacion,
        actividad: resumenActividad
      },
      lecturaSistema
    };
  }

  async getPatterns(pin: string) {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`No se encontró elder con pin: ${pin}`);
    const events = await this.eventsService.findAllByElder((elder as any)._id.toString());
    
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    
    // Estructuras para diario (0-23 horas)
    const pasosPorHora = new Array(24).fill(0);
    const bpmPorHoraSum = new Array(24).fill(0);
    const bpmPorHoraCount = new Array(24).fill(0);
    const salaPorHora = new Array(24).fill(0);
    
    // Procesar Diario
    const eventsToday = events.filter((e: any) => new Date(e.createdAt).toLocaleDateString() === todayStr);
    
    eventsToday.forEach((e: any) => {
      const date = new Date(e.createdAt);
      const hour = date.getHours();
      
      if (e.modulo === 'ACTIVIDAD' && e.data?.sensor_id === 'mpu6050') {
        pasosPorHora[hour] += parseInt(e.data.estado) || 0;
      }
      if (e.modulo === 'RITUAL' && e.data?.estado?.includes('BPM_')) {
        const val = parseInt(e.data.estado.split('_')[1]);
        if (!isNaN(val)) {
          bpmPorHoraSum[hour] += val;
          bpmPorHoraCount[hour]++;
        }
      }
      if (e.modulo === 'ACTIVIDAD' && e.data?.sensor_id === 'sofa_ultrasonic') {
        salaPorHora[hour] += 15; // asumiendo 15 mins por evento
      }
    });

    // Función para agrupar horas contiguas sin actividad (valor 0)
    const agruparHoras = (arr: number[]) => {
      const result: { hora: string; valor: number }[] = [];
      let zeroStart = -1;
      
      for (let i = 0; i <= 24; i++) {
        if (i < 24 && arr[i] === 0) {
          if (zeroStart === -1) zeroStart = i;
        } else {
          if (zeroStart !== -1) {
            if (i - 1 === zeroStart) {
              result.push({ hora: `${zeroStart.toString().padStart(2, '0')}:00`, valor: 0 });
            } else {
              result.push({ hora: `${zeroStart.toString().padStart(2, '0')}:00 - ${(i-1).toString().padStart(2, '0')}:59`, valor: 0 });
            }
            zeroStart = -1;
          }
          if (i < 24) {
            result.push({ hora: `${i.toString().padStart(2, '0')}:00`, valor: arr[i] });
          }
        }
      }
      
      // Si el resultado es un solo bloque de 24h en 0, retornamos vacío para que el Frontend muestre sus datos de demostración
      if (result.length === 1 && result[0].hora === "00:00 - 23:59" && result[0].valor === 0) {
        return [];
      }
      
      return result;
    };

    const agruparPromedioHoras = (sumArr: number[], countArr: number[]) => {
      const arr = sumArr.map((sum, i) => countArr[i] > 0 ? Math.round(sum / countArr[i]) : 0);
      return agruparHoras(arr);
    };

    // Procesar Semanal
    const diasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    const pasosSemanal = new Array(7).fill(0);
    const bpmSemanalSum = new Array(7).fill(0);
    const bpmSemanalCount = new Array(7).fill(0);
    const salaSemanal = new Array(7).fill(0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    events.forEach((e: any) => {
      const date = new Date(e.createdAt);
      if (date >= sevenDaysAgo) {
        const dayIdx = date.getDay(); // 0-6
        if (e.modulo === 'ACTIVIDAD' && e.data?.sensor_id === 'mpu6050') {
          pasosSemanal[dayIdx] += parseInt(e.data.estado) || 0;
        }
        if (e.modulo === 'RITUAL' && e.data?.estado?.includes('BPM_')) {
          const val = parseInt(e.data.estado.split('_')[1]);
          if (!isNaN(val)) {
            bpmSemanalSum[dayIdx] += val;
            bpmSemanalCount[dayIdx]++;
          }
        }
        if (e.modulo === 'ACTIVIDAD' && e.data?.sensor_id === 'sofa_ultrasonic') {
          salaSemanal[dayIdx] += 15;
        }
      }
    });

    const formatSemanal = (arr: number[]) => {
      return diasSemana.map((dia, i) => ({ dia, valor: arr[i] }));
    };

    const formatSemanalPromedio = (sumArr: number[], countArr: number[]) => {
      return diasSemana.map((dia, i) => ({ 
        dia, 
        valor: countArr[i] > 0 ? Math.round(sumArr[i] / countArr[i]) : 0 
      }));
    };

    return {
      diario: {
        pasos: agruparHoras(pasosPorHora),
        ritmoCardiaco: agruparPromedioHoras(bpmPorHoraSum, bpmPorHoraCount),
        tiempoSala: agruparHoras(salaPorHora),
      },
      semanal: {
        pasos: formatSemanal(pasosSemanal),
        ritmoCardiaco: formatSemanalPromedio(bpmSemanalSum, bpmSemanalCount),
        tiempoSala: formatSemanal(salaSemanal),
      }
    };
  }

  async getTimeline(pin: string) {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`No se encontró elder con pin: ${pin}`);
    const events = await this.eventsService.findAllByElder((elder as any)._id.toString());
    
    // Mapear eventos a un formato visual
    const timeline = events.map((event: any) => {
      let titulo = "Evento detectado";
      let subtitulo = event.modulo;
      
      if (event.modulo === 'ACTIVIDAD' && event.data.sensor_id === 'mpu6050') {
        titulo = "Actividad Física";
        subtitulo = `Pasos detectados: ${event.data.estado}`;
      } else if (event.modulo === 'RITUAL') {
        titulo = "Tótem Tocado";
        subtitulo = "Saludo enviado";
      } else if (event.modulo === 'ACTIVIDAD' && event.data.sensor_id === 'fridge_laser') {
        titulo = "Nevera usada";
        subtitulo = `Buscando comida`;
      } else if (event.modulo === 'ACTIVIDAD' && event.data.sensor_id === 'pir_sensor') {
        titulo = "Movimiento detectado";
        subtitulo = "Actividad en la casa";
      } else if (event.modulo === 'ACTIVIDAD' && event.data.sensor_id === 'sofa_ultrasonic') {
        titulo = event.data.estado === 'sedentary_alert' ? "Alerta Sedentarismo" : "Actividad retomada";
        subtitulo = event.data.estado === 'sedentary_alert' ? "Mucho tiempo en el sofá" : "Se levantó del sofá";
      } else if (event.modulo === 'MEDICACION') {
        titulo = event.data.estado === 'duplication_warning' ? "¡Peligro de Duplicación!" : "Medicina tomada";
        subtitulo = event.data.estado === 'duplication_warning' ? "Intentó tomar pastillas de nuevo" : "Frasco agitado correctamente";
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
