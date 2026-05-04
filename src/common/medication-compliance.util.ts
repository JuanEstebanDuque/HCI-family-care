import { canonicalEventModulo } from './event-modulo.util';
import { minutesSinceMidnightCalTz, ymdInCalTz } from './hci-calendar';

export function isMedicationScheduledToday(repetition: any, todayDayOfWeek: number): boolean {
  if (!repetition || !repetition.frequency || repetition.frequency === 'none') {
    return true;
  }
  if (repetition.frequency === 'daily') return true;
  if (
    repetition.frequency === 'weekly' &&
    repetition.daysOfWeek &&
    repetition.daysOfWeek.includes(todayDayOfWeek)
  ) {
    return true;
  }
  return false;
}

export function filterMedComplianceEvents(eventsToday: any[]): any[] {
  return eventsToday.filter(
    (e: any) =>
      canonicalEventModulo(e.modulo) === 'MEDICACION' ||
      (e.data?.sensor_id === 'touch_totem' && e.data?.estado?.startsWith('taken_attempt_')) ||
      e.data?.estado === 'schedule_passed_urgent',
  );
}

/**
 * Estado del medicamento en el día calendario (HCI_CALENDAR_TZ), no solo en la ventana de 1h
 * alrededor de la hora programada (los avisos NOTIFY pueden ocurrir mucho antes).
 */
export function getStatusForMed(
  medHora: string,
  medEvents: any[],
  now: Date,
): { status: string; phase: string } {
  const [hour, min] = medHora.split(':').map(Number);
  let status = 'pendiente';
  let phase = '';
  const todayYmd = ymdInCalTz(now);
  const medMin = hour * 60 + min;

  const dayEvents = medEvents
    .filter((e: any) => ymdInCalTz(new Date(e.createdAt)) === todayYmd)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let lastTakenPhase = '';
  for (const ev of dayEvents) {
    const st = ev.data?.estado;
    if (typeof st === 'string' && st.startsWith('taken_attempt_')) {
      status = 'completado';
      lastTakenPhase = st.split('_')[2] ?? '';
    }
    if (st === 'confirmed_taken') {
      status = 'completado';
      lastTakenPhase = '1';
    }
  }
  if (status === 'completado') {
    return { status, phase: lastTakenPhase };
  }

  const newest = [...dayEvents].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  const latestState = newest?.data?.estado;

  if (latestState === 'schedule_passed_urgent') {
    return { status: 'ignorado', phase: '' };
  }
  if (
    latestState === 'in_range' ||
    latestState === 'second_attempt' ||
    latestState === 'duplication_warning'
  ) {
    return { status: 'notificando', phase: '' };
  }

  const nowMin = minutesSinceMidnightCalTz(now);
  if (nowMin > medMin + 120 && dayEvents.length === 0) {
    return { status: 'ignorado', phase: '' };
  }

  return { status, phase };
}
