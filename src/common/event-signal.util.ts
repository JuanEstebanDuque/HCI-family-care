/** Extrae BPM de data.estado (p. ej. BPM_72, well_being_BPM_72). */
export function extractBpmFromEventData(data: any): number | null {
  const st = data?.estado;
  if (typeof st !== 'string') return null;
  const m = st.match(/BPM_(\d+)/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (Number.isNaN(v) || v < 30 || v > 220) return null;
  return v;
}
