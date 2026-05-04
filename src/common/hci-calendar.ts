/**
 * Zona usada para "hoy", horas del día y día de la semana en analíticas y medicación.
 * Override con HCI_CALENDAR_TZ en .env (p. ej. America/Bogota).
 */
export const HCI_CALENDAR_TZ = process.env.HCI_CALENDAR_TZ || 'America/Bogota';

export function ymdInCalTz(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: HCI_CALENDAR_TZ });
}

export function hourMinuteInCalTz(d: Date): { h: number; mi: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HCI_CALENDAR_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const mi = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return { h, mi };
}

export function minutesSinceMidnightCalTz(d: Date): number {
  const { h, mi } = hourMinuteInCalTz(d);
  return h * 60 + mi;
}

export function dayOfWeekInCalTz(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HCI_CALENDAR_TZ,
    weekday: 'short',
  }).formatToParts(d);
  const w = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
}
