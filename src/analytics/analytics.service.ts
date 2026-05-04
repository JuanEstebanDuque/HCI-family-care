import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { MedicationsService } from '../medications/medications.service';
import { RemindersService } from '../reminders/reminders.service';
import { canonicalEventModulo } from '../common/event-modulo.util';
import {
  filterMedComplianceEvents,
  getStatusForMed,
  isMedicationScheduledToday,
} from '../common/medication-compliance.util';
import { dayOfWeekInCalTz, hourMinuteInCalTz, ymdInCalTz } from '../common/hci-calendar';
import { extractBpmFromEventData } from '../common/event-signal.util';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
    private readonly medicationsService: MedicationsService,
    private readonly remindersService: RemindersService,
  ) {}

  async getDashboard(pin: string) {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`No se encontró elder con pin: ${pin}`);
    const events = await this.eventsService.findAllByElder((elder as any)._id.toString());
    
    const now = new Date();
    const todayYmd = ymdInCalTz(now);
    const eventsToday = events.filter((e: any) => ymdInCalTz(new Date(e.createdAt)) === todayYmd);

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

    let maxPasosHoy = 0;
    let sawPir = false;
    let sawFridge = false;
    let sawSofa = false;

    eventsToday.forEach((e: any) => {
      const eDate = new Date(e.createdAt);
      if (!ultEventoDate || eDate > ultEventoDate) ultEventoDate = eDate;
      const mod = canonicalEventModulo(e.modulo);

      if (mod === 'MEDICACION') {
        if (e.data?.estado === 'duplication_warning') {
          tieneAlertaMedicacion = true;
          resumenMedicacion.estado = '¡Peligro de duplicación!';
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (e.data?.estado === 'confirmed_taken') {
          resumenMedicacion.estado = 'Dosis completada';
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (e.data?.estado === 'in_range') {
          resumenMedicacion.estado = 'En rango de medicación';
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (e.data?.estado === 'second_attempt') {
          resumenMedicacion.estado = 'Segunda alerta (Pendiente)';
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (e.data?.estado === 'schedule_passed_urgent') {
          tieneAlertaMedicacion = true;
          resumenMedicacion.estado = '¡URGENTE! Medicación olvidada';
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (e.data?.estado?.startsWith('taken_attempt_')) {
          const attempt = e.data.estado.split('_')[2];
          resumenMedicacion.estado = `Dosis completada (Intento ${attempt})`;
          resumenMedicacion.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }

      if (mod === 'ACTIVIDAD') {
        if (e.data?.sensor_id === 'sofa_ultrasonic' && e.data?.estado === 'sedentary_alert') {
          tieneAlertaSedentarismo = true;
        }
        if (e.data?.sensor_id === 'sofa_ultrasonic') {
          const se = e.data?.estado;
          if (
            se === 'sesion_inicio' ||
            se === 'sesion_fin' ||
            e.data?.fase === 'sentado' ||
            e.data?.fase === 'levantado' ||
            (typeof se === 'string' && se.startsWith('activity_resumed_'))
          ) {
            sawSofa = true;
          }
        }
        if (e.data?.sensor_id === 'pir_sensor' && e.data?.estado === 'motion_detected') {
          sawPir = true;
        }
        if (e.data?.sensor_id === 'fridge_laser') {
          sawFridge = true;
        }
        if (e.data?.sensor_id === 'mpu6050') {
          const pasos = parseInt(e.data.estado, 10) || 0;
          if (pasos > maxPasosHoy) maxPasosHoy = pasos;
          resumenActividad.hora = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    });

    if (maxPasosHoy > 0) {
      resumenActividad.estado = `${maxPasosHoy} pasos hoy`;
    } else if (sawSofa) {
      resumenActividad.estado = 'Sofá / sala: sesión registrada';
    } else if (sawPir) {
      resumenActividad.estado = 'Movimiento en la vivienda';
    } else if (sawFridge) {
      resumenActividad.estado = 'Actividad en cocina (nevera)';
    }

    const medications = await this.medicationsService.findAllByElder(pin);
    const todayDayOfWeek = dayOfWeekInCalTz(now);
    const medEventsAll = filterMedComplianceEvents(eventsToday);
    let atencionMedicacion = false;
    let detalleMedicacion = '';

    for (const med of medications as any[]) {
      if (!isMedicationScheduledToday(med.repetition, todayDayOfWeek)) continue;
      const { status } = getStatusForMed(med.hora, medEventsAll, now);
      const [h, mi] = med.hora.split(':').map(Number);
      const medTime = new Date(now);
      medTime.setHours(h, mi, 0, 0);

      if (status === 'notificando') {
        atencionMedicacion = true;
        detalleMedicacion = `Hay un aviso activo de medicación (${med.name}).`;
      }
      if (status === 'ignorado') {
        atencionMedicacion = true;
        detalleMedicacion = `Una dosis no se confirmó a tiempo (${med.name}).`;
      }
      if (status === 'pendiente' && now.getTime() > medTime.getTime()) {
        atencionMedicacion = true;
        if (!detalleMedicacion) {
          detalleMedicacion = `Medicación pendiente: ${med.name} (programada ${med.hora}).`;
        }
      }
    }

    if (
      resumenMedicacion.estado === 'Pendiente' &&
      (atencionMedicacion || medEventsAll.some((e: any) => ['in_range', 'second_attempt'].includes(e.data?.estado)))
    ) {
      atencionMedicacion = true;
      if (!detalleMedicacion) {
        detalleMedicacion = 'Hay medicación programada sin confirmación reciente.';
      }
    }

    if (tieneAlertaMedicacion) {
      if (resumenMedicacion.estado.includes('URGENTE')) {
        estadoGeneral.titulo = "Alerta de Medicación";
        estadoGeneral.descripcion = "Manuel no ha tomado su medicina después de todos los avisos.";
        estadoGeneral.color = "#c97b6b"; // rojo
        lecturaSistema.mensaje = "Medicación olvidada, requiere atención urgente";
      } else {
        estadoGeneral.titulo = "Alerta de Medicación";
        estadoGeneral.descripcion = "Se detectó un intento de tomar medicinas de nuevo.";
        estadoGeneral.color = "#c97b6b"; // rojo/naranja rojizo
        lecturaSistema.mensaje = "Se detectó riesgo de doble medicación";
      }
    } else if (tieneAlertaSedentarismo) {
      estadoGeneral.titulo = "Alerta de Sedentarismo";
      estadoGeneral.descripcion = "Manuel lleva demasiado tiempo inactivo en la sala.";
      estadoGeneral.color = "#f59e0b"; // naranja
      lecturaSistema.mensaje = "Alerta de sedentarismo detectada";
    } else if (atencionMedicacion) {
      estadoGeneral.titulo = 'Atención a la medicación';
      estadoGeneral.descripcion =
        detalleMedicacion || 'La medicación o los avisos no coinciden con “todo normal”.';
      estadoGeneral.color = '#ca8a04';
      lecturaSistema.mensaje =
        detalleMedicacion || 'Revise la ventana de medicación y las confirmaciones del tótem.';
    } else if (resumenMedicacion.estado === 'Pendiente' && medEventsAll.length > 0) {
      estadoGeneral.titulo = 'Seguimiento de rutina';
      estadoGeneral.descripcion =
        'Hay actividad del sistema pero la medicación de hoy sigue sin registro de toma.';
      estadoGeneral.color = '#ca8a04';
      lecturaSistema.mensaje = 'Los sensores registran actividad; confirme medicación si aplica.';
    } else if (maxPasosHoy === 0 && (sawPir || sawFridge || sawSofa)) {
      estadoGeneral.titulo = 'Sensores activos';
      estadoGeneral.descripcion =
        'Hoy hay señal de presencia o rutina en casa aunque el podómetro no acumule pasos.';
      estadoGeneral.color = '#84a5c4';
      lecturaSistema.mensaje =
        'Movimiento, nevera o sofá aportan contexto aun sin caminata medible con el bastón.';
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
    const todayYmd = ymdInCalTz(now);

    // Estructuras para diario (0-23 horas)
    const pasosPorHora = new Array(24).fill(0);
    const bpmPorHoraSum = new Array(24).fill(0);
    const bpmPorHoraCount = new Array(24).fill(0);
    const salaPorHora = new Array(24).fill(0);
    
    // Ordenar los eventos de hoy de más antiguo a más reciente para calcular deltas
    const eventsToday = events
      .filter((e: any) => ymdInCalTz(new Date(e.createdAt)) === todayYmd)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    let lastTotalPasos = 0;

    eventsToday.forEach((e: any) => {
      const date = new Date(e.createdAt);
      const hour = hourMinuteInCalTz(date).h;
      const mod = canonicalEventModulo(e.modulo);

      if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'mpu6050') {
        const pasosAcumulados = parseInt(e.data.estado, 10) || 0;
        let delta = pasosAcumulados - lastTotalPasos;
        if (delta < 0) {
          delta = pasosAcumulados; // El Arduino se reseteó
        }
        pasosPorHora[hour] += delta;
        lastTotalPasos = pasosAcumulados;
      }
      const bpmVal = extractBpmFromEventData(e.data);
      if (bpmVal != null && (mod === 'RITUAL' || e.data?.sensor_id === 'max30105')) {
        bpmPorHoraSum[hour] += bpmVal;
        bpmPorHoraCount[hour]++;
      }
      if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'pir_sensor' && e.data?.estado === 'motion_detected') {
        salaPorHora[hour] += 4;
      }
      if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'sofa_ultrasonic') {
        if (e.data?.estado === 'sedentary_alert') {
          salaPorHora[hour] += 60;
        } else if (e.data?.lugar === 'sofa' && typeof e.data?.duracion_seg === 'number') {
          salaPorHora[hour] += Math.min(180, Math.ceil(e.data.duracion_seg / 60));
        } else if (typeof e.data?.estado === 'string') {
          const sm = e.data.estado.match(/^activity_resumed_(\d+)s$/);
          if (sm) {
            const sec = parseInt(sm[1], 10);
            if (sec >= 3) {
              salaPorHora[hour] += Math.min(120, Math.ceil(sec / 60));
            }
          } else if (e.data.estado === 'sesion_fin' || e.data?.fase === 'levantado') {
            salaPorHora[hour] += 8;
          }
        }
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
        const dayIdx = dayOfWeekInCalTz(date);
        const mod = canonicalEventModulo(e.modulo);
        if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'mpu6050') {
          const v = parseInt(e.data.estado, 10) || 0;
          pasosSemanal[dayIdx] = Math.max(pasosSemanal[dayIdx], v);
        }
        const bpmW = extractBpmFromEventData(e.data);
        if (bpmW != null && (mod === 'RITUAL' || e.data?.sensor_id === 'max30105')) {
          bpmSemanalSum[dayIdx] += bpmW;
          bpmSemanalCount[dayIdx]++;
        }
        if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'sofa_ultrasonic') {
          if (e.data?.estado === 'sedentary_alert') {
            salaSemanal[dayIdx] += 45;
          } else if (e.data?.lugar === 'sofa' && typeof e.data?.duracion_seg === 'number') {
            salaSemanal[dayIdx] += Math.min(180, Math.ceil(e.data.duracion_seg / 60));
          } else if (typeof e.data?.estado === 'string') {
            const sm = e.data.estado.match(/^activity_resumed_(\d+)s$/);
            if (sm) {
              const sec = parseInt(sm[1], 10);
              if (sec >= 3) {
                salaSemanal[dayIdx] += Math.min(120, Math.ceil(sec / 60));
              }
            } else {
              salaSemanal[dayIdx] += 8;
            }
          }
        }
        if (mod === 'ACTIVIDAD' && e.data?.sensor_id === 'pir_sensor' && e.data?.estado === 'motion_detected') {
          salaSemanal[dayIdx] += 4;
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
      const mod = canonicalEventModulo(event.modulo);
      let subtitulo = mod;

      if (mod === 'ACTIVIDAD' && event.data.sensor_id === 'mpu6050') {
        titulo = "Actividad Física";
        subtitulo = `Pasos detectados: ${event.data.estado}`;
      } else if (mod === 'RITUAL' && event.data?.sensor_id === 'max30105') {
        titulo = 'Ritmo cardíaco';
        const b = extractBpmFromEventData(event.data);
        subtitulo = b != null ? `${b} BPM` : 'Telemetría';
      } else if (mod === 'RITUAL') {
        titulo = "Tótem Tocado";
        const st = event.data?.estado;
        const bm = typeof st === 'string' && st.match(/BPM_(\d+)/);
        subtitulo = bm ? `Pulso aprox. ${bm[1]} BPM` : "Saludo enviado";
      } else if (mod === 'ACTIVIDAD' && event.data.sensor_id === 'fridge_laser') {
        titulo = "Nevera usada";
        subtitulo = `Buscando comida`;
      } else if (mod === 'ACTIVIDAD' && event.data.sensor_id === 'pir_sensor') {
        titulo = "Movimiento detectado";
        subtitulo = "Actividad en la casa";
      } else if (mod === 'ACTIVIDAD' && event.data.sensor_id === 'sofa_ultrasonic') {
        if (event.data.estado === 'sesion_inicio' || event.data?.fase === 'sentado') {
          titulo = 'Sofá';
          subtitulo = 'Sesión sentado iniciada';
        } else if (event.data.estado === 'sesion_fin' || event.data?.fase === 'levantado') {
          titulo = 'Sofá';
          const s =
            typeof event.data?.duracion_seg === 'number' ? `${event.data.duracion_seg}s` : 'fin de sesión';
          subtitulo = `Se levantó (${s})`;
        } else {
          titulo = event.data.estado === 'sedentary_alert' ? "Alerta Sedentarismo" : "Actividad retomada";
          subtitulo =
            event.data.estado === 'sedentary_alert' ? "Mucho tiempo en el sofá" : "Se levantó del sofá";
        }
      } else if (mod === 'MEDICACION') {
        if (event.data.estado === 'duplication_warning') {
          titulo = "¡Peligro de Duplicación!";
          subtitulo = "Intentó tomar pastillas de nuevo";
        } else if (event.data.estado === 'confirmed_taken') {
          titulo = "Medicina tomada";
          subtitulo = "Frasco agitado correctamente";
        } else if (event.data.estado === 'in_range') {
          titulo = "Aviso de Medicación";
          subtitulo = "En rango de horario";
        } else if (event.data.estado === 'second_attempt') {
          titulo = "2do Aviso Medicación";
          subtitulo = "Pendiente de tomar";
        } else if (event.data.estado === 'schedule_passed_urgent') {
          titulo = "Medicación Olvidada";
          subtitulo = "Pasaron todos los avisos";
        } else if (event.data.estado?.startsWith('taken_attempt_')) {
          const attempt = event.data.estado.split('_')[2];
          titulo = "Medicina Tomada";
          subtitulo = `Confirmado en intento ${attempt}`;
        }
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

  async getDailyRoutine(pin: string) {
    const elder = await this.usersService.findByPin(pin);
    if (!elder) throw new NotFoundException(`No se encontró elder con pin: ${pin}`);
    const elderId = (elder as any)._id.toString();

    // MedicationsService.findAllByElder expects a PIN
    const medications = await this.medicationsService.findAllByElder(pin);
    
    // RemindersService method is called findByElder and expects the elderId string
    const reminders = await this.remindersService.findByElder(elderId);

    const now = new Date();
    const todayYmd = ymdInCalTz(now);
    const todayDayOfWeek = dayOfWeekInCalTz(now);

    // Obtener eventos de hoy para calcular el estado de cada medicamento
    const eventsToday = (await this.eventsService.findAllByElder(elderId)).filter(
      (e: any) => ymdInCalTz(new Date(e.createdAt)) === todayYmd,
    );

    const medEvents = filterMedComplianceEvents(eventsToday);

    const routine: { type: string, id: string, title: string, subtitle: string, time: string, details: string, status?: string, phase?: string }[] = [];

    medications.forEach((med: any) => {
      if (isMedicationScheduledToday(med.repetition, todayDayOfWeek)) {
        const { status, phase } = getStatusForMed(med.hora, medEvents, now);
        routine.push({
          type: 'medication',
          id: med._id,
          title: med.name,
          subtitle: med.dose,
          time: med.hora,
          details: med.schedule,
          status,
          phase
        });
      }
    });

    reminders.forEach((rem: any) => {
      if (isMedicationScheduledToday(rem.repetition, todayDayOfWeek)) {
        routine.push({
          type: 'reminder',
          id: rem._id,
          title: rem.actividad,
          subtitle: "Recordatorio",
          time: rem.hora,
          details: `Día: ${rem.recordatorio_dia}`
        });
      }
    });

    // Ordenar por hora (formato HH:mm)
    routine.sort((a, b) => a.time.localeCompare(b.time));

    return routine;
  }
}
