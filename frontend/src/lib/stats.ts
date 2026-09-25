// Cálculo del "experimento": retención por día de estudio en cada ventana de tiempo.
import type { Attempt } from '../types';

import { BUCKETS as SHARED_BUCKETS, retentionBy } from '../../../shared/retention.mjs';

export const BUCKETS = SHARED_BUCKETS;
export type BucketKey = (typeof BUCKETS)[number]['key'];

export interface Cell { n: number; rate: number | null }
export interface DayRow { day: number; learned: number; cells: Record<BucketKey, Cell> }

const EMPTY = () => Object.fromEntries(BUCKETS.map((b) => [b.key, { n: 0, rate: null }])) as Record<BucketKey, Cell>;

/** Retención por día de estudio (misma medida que el servidor: primer intento de cada palabra en cada ventana). */
export function retentionTable(attempts: Attempt[], learnedPerDay: Map<number, number>): DayRow[] {
  const byDay = retentionBy(attempts, (a: Attempt) => a.study_day);
  const days = new Set([...learnedPerDay.keys(), ...byDay.keys()]);
  return [...days].filter((d): d is number => d != null).sort((a, b) => a - b)
    .map((day) => ({ day, learned: learnedPerDay.get(day) ?? 0, cells: byDay.get(day) ?? EMPTY() }));
}

/** Media ponderada por número de palabras de cada ventana (la "curva del olvido" global). */
export function overallCurve(rows: DayRow[]): Record<BucketKey, Cell> {
  const out = {} as Record<BucketKey, Cell>;
  for (const b of BUCKETS) {
    let n = 0, sum = 0;
    for (const r of rows) { const c = r.cells[b.key]; if (c.rate !== null) { n += c.n; sum += c.rate * c.n; } }
    out[b.key] = { n, rate: n ? sum / n : null };
  }
  return out;
}

export function streak(dates: string[], today: string): number {
  const set = new Set(dates);
  let d = new Date(`${today}T12:00:00`);
  if (!set.has(today)) d = new Date(d.getTime() - 86400_000); // hoy aún no cuenta si no has estudiado
  let n = 0;
  while (set.has(localDate(d))) { n++; d = new Date(d.getTime() - 86400_000); }
  return n;
}

export function localDate(d = new Date()): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const pct = (x: number | null | undefined) => (x == null ? '—' : `${Math.round(x * 100)}%`);
