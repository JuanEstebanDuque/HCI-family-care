/** Unifica módulos guardados en mayúsculas con los que envía el Arduino en minúsculas. */
export function canonicalEventModulo(raw?: string): string {
  if (!raw) return 'ACTIVIDAD';
  const upper = raw.toUpperCase();
  if (['MEDICACION', 'ACTIVIDAD', 'RITUAL', 'SEDENTARISMO'].includes(upper)) {
    return upper;
  }
  const map: Record<string, string> = {
    medication: 'MEDICACION',
    medicacion: 'MEDICACION',
    activity: 'ACTIVIDAD',
    actividad: 'ACTIVIDAD',
    baston: 'ACTIVIDAD',
    ritual: 'RITUAL',
    sedentarismo: 'SEDENTARISMO',
  };
  return map[raw.toLowerCase()] || 'ACTIVIDAD';
}
