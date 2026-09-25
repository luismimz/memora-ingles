// Repetición espaciada con "checkpoints" pensados para el reto de 30 días.
// Cada palabra aprendida se comprueba a +1h, +24h, +3d, +7d, +14d y +30d (si respondes a tiempo).
// Si fallas, retrocede un escalón y vuelve mañana. Si dudas, avanza pero con la mitad de intervalo.
import type { Progress, Result } from '../types';

const H = 3600_000;
/** Horas acumuladas desde el aprendizaje para cada escalón (0 = examen inicial). */
export const CHECKPOINTS_H = [0, 1, 24, 72, 168, 336, 720];
export const STEP_LABEL = ['Examen', '+1 h', '+24 h', '+3 días', '+7 días', '+14 días', '+30 días', 'Dominada'];
export const MASTERED_STEP = CHECKPOINTS_H.length; // 7
const MAINTENANCE_H = 60 * 24;
const RETRY_H = 20;

export type SrsState = Pick<Progress, 'status' | 'step' | 'learned_at' | 'due_at' | 'reps' | 'lapses' | 'ok' | 'doubt' | 'fail' | 'avg_ms'>;

export function gapHours(step: number): number {
  if (step >= MASTERED_STEP) return MAINTENANCE_H;
  return CHECKPOINTS_H[step] - CHECKPOINTS_H[step - 1];
}

export function statusFor(step: number): Progress['status'] {
  if (step >= MASTERED_STEP) return 'mastered';
  return step <= 2 ? 'learning' : 'review';
}

const bump = (p: SrsState, result: Result, ms: number) => ({
  reps: p.reps + 1,
  ok: p.ok + (result === 'ok' ? 1 : 0),
  doubt: p.doubt + (result === 'doubt' ? 1 : 0),
  fail: p.fail + (result === 'fail' ? 1 : 0),
  avg_ms: Math.round(((p.avg_ms ?? ms) * p.reps + ms) / (p.reps + 1)),
});

/** Estado tras el examen inicial (paso 0). Siempre programa el checkpoint de +1h. */
export function afterExam(result: Result, ms: number, now = Date.now()): SrsState {
  return {
    status: 'learning',
    step: 1,
    learned_at: new Date(now).toISOString(),
    due_at: new Date(now + H).toISOString(),
    reps: 1,
    lapses: result === 'fail' ? 1 : 0,
    ok: result === 'ok' ? 1 : 0,
    doubt: result === 'doubt' ? 1 : 0,
    fail: result === 'fail' ? 1 : 0,
    avg_ms: ms,
  };
}

export const isDue = (p: Pick<Progress, 'status' | 'due_at'>, now = Date.now()) =>
  p.status !== 'known' && p.due_at !== null && Date.parse(p.due_at) <= now;

/** Aplica una respuesta de repaso y devuelve el nuevo estado. */
export function afterReview(p: SrsState, result: Result, ms: number, now = Date.now()): SrsState {
  const counts = bump(p, result, ms);
  if (result === 'fail') {
    const step = Math.max(1, p.step - 1);
    return { ...p, ...counts, step, status: statusFor(step), lapses: p.lapses + 1, due_at: new Date(now + RETRY_H * H).toISOString() };
  }
  const step = Math.min(p.step + 1, MASTERED_STEP);
  const factor = result === 'doubt' ? 0.5 : 1;
  return { ...p, ...counts, step, status: statusFor(step), due_at: new Date(now + gapHours(step) * factor * H).toISOString() };
}

/** Palabra "rebelde": se ha fallado varias veces. */
export const isLeech = (p: Pick<Progress, 'lapses' | 'fail'>) => p.lapses >= 3 || p.fail >= 4;

/** Si aciertas pero tardas demasiado, cuenta como "dudada": aún no está automatizada. */
export function gradeByTime(correct: boolean, ms: number, slowMs = 9000): Result {
  if (!correct) return 'fail';
  return ms > slowMs ? 'doubt' : 'ok';
}

export const hoursSince = (iso: string | null, now = Date.now()) =>
  (iso ? Math.round(((now - Date.parse(iso)) / H) * 100) / 100 : null);
