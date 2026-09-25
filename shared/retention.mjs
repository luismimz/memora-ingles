// Cómo medimos si algo "se queda": ventanas de tiempo desde que se aprendió la palabra.
// Se usa el PRIMER intento de cada palabra en cada ventana (lo que de verdad recordabas).
// Compartido entre las estadísticas del alumno y las de cada asociación (servidor).

export const BUCKETS = [
  { key: 'exam', label: 'Examen' },
  { key: '1h', label: '+1 h', min: 0.5, max: 8 },
  { key: '24h', label: '+24 h', min: 12, max: 60 },
  { key: '7d', label: '+7 días', min: 5 * 24, max: 11 * 24 },
  { key: '30d', label: '+30 días', min: 25 * 24, max: 45 * 24 },
];

/** Ventana a la que pertenece un intento (o null si no cuenta para medir). */
export function bucketOf(a) {
  if (a.kind === 'exam') return 'exam';
  if (a.kind !== 'review' || a.hours_since_learned == null) return null;
  const h = Number(a.hours_since_learned);
  const b = BUCKETS.find((x) => x.min !== undefined && h >= x.min && h < x.max);
  return b ? b.key : null;
}

export const resultValue = (r) => (r === 'ok' ? 1 : r === 'doubt' ? 0.5 : 0);

/**
 * Agrupa la retención por la clave que devuelva groupFn (día, asociación, tipo de palabra…).
 * @returns {Map<any, Record<string, {n:number, rate:number|null}>>}
 */
export function retentionBy(attempts, groupFn) {
  const sorted = [...attempts].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
  const firsts = new Map(); // group -> bucket -> Map(user|word -> result)
  for (const a of sorted) {
    const bucket = bucketOf(a);
    if (!bucket) continue;
    const group = groupFn(a);
    if (group === undefined || group === null) continue;
    const g = firsts.get(group) ?? new Map();
    firsts.set(group, g);
    const cell = g.get(bucket) ?? new Map();
    g.set(bucket, cell);
    const key = `${a.user ?? ''}|${a.word}`;
    if (!cell.has(key)) cell.set(key, a.result);
  }
  const out = new Map();
  for (const [group, g] of firsts) {
    const row = {};
    for (const b of BUCKETS) {
      const cell = g.get(b.key);
      const n = cell?.size ?? 0;
      row[b.key] = { n, rate: n ? [...cell.values()].reduce((s, r) => s + resultValue(r), 0) / n : null };
    }
    out.set(group, row);
  }
  return out;
}
