// Repetición espaciada con "checkpoints" pensados para el reto de 30 días.
// Cada palabra aprendida se comprueba a +1h, +24h, +3d, +7d, +14d y +30d (si respondes a tiempo).
// Si fallas, retrocede un escalón y vuelve mañana. Si dudas, avanza pero con la mitad de intervalo.
import type { Progress, Result } from '../types';

const H = 3600_000;
/** Horas acumuladas desde el aprendizaje para cada escalón (0 = examen inicial). */
export const CHECKPOINTS_H = [0, 1, 24, 72, 168, 336, 720];
export const STEP_LABEL = ['Examen', '+1 h', '+24 h', '+3 días', '+7 días', '+14 días', '+30 días', 'Dominada'];
export const MASTERED_STEP = CHECKPOINTS_H.length; // 7
/** Escalones de la curva de Ebbinghaus que se persisten en Directus. */
export const EBBINGHAUS_INTERVALS_H = [0, 24, 72, 168, 336, 720] as const;
const MAINTENANCE_H = 60 * 24;
const RETRY_H = 20;

export type SrsState = Pick<Progress, 'status' | 'step' | 'learned_at' | 'due_at' | 'reps' | 'lapses' | 'ok' | 'doubt' | 'fail' | 'avg_ms' | 'next_review_at' | 'interval_step' | 'retention_rate'>;

/**
 * Retención teórica R=e^(-Δt/S). Se mantiene como una señal explicable para
 * la interfaz y para el experimento, sin sustituir la recuperación real.
 */
export function retentionProbability(deltaMs: number, stabilityMs: number): number {
  if (!Number.isFinite(deltaMs) || !Number.isFinite(stabilityMs) || stabilityMs <= 0) return 0;
  return Math.max(0, Math.min(1, Math.exp(-Math.max(0, deltaMs) / stabilityMs)));
}

export function theoreticalRetention(learnedAt: string | null, stabilityHours: number, now = Date.now()): number {
  if (!learnedAt) return 0;
  const learnedMs = Date.parse(learnedAt);
  if (!Number.isFinite(learnedMs)) return 0;
  return retentionProbability(now - learnedMs, Math.max(stabilityHours, 1) * H);
}

/** Próximo checkpoint canónico de Ebbinghaus (la columna due_at se conserva
 * como alias de compatibilidad con instalaciones antiguas). */
export function ebbinghausCheckpoint(step: number, now = Date.now()): string {
  const index = Math.max(0, Math.min(step, EBBINGHAUS_INTERVALS_H.length - 1));
  return new Date(now + EBBINGHAUS_INTERVALS_H[index] * H).toISOString();
}

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

/** Estado tras el examen inicial (paso 0). `due_at` conserva el alias +1h; el
 * calendario canónico de Memora queda en `next_review_at` (+24h). */
export function afterExam(result: Result, ms: number, now = Date.now()): SrsState {
  const dueAt = new Date(now + H).toISOString();
  const nextReviewAt = result === 'fail' ? dueAt : ebbinghausCheckpoint(1, now);
  return {
    status: 'learning',
    step: 1,
    learned_at: new Date(now).toISOString(),
    due_at: dueAt,
    next_review_at: nextReviewAt,
    interval_step: 1,
    retention_rate: result === 'fail' ? 0 : 1,
    reps: 1,
    lapses: result === 'fail' ? 1 : 0,
    ok: result === 'ok' ? 1 : 0,
    doubt: result === 'doubt' ? 1 : 0,
    fail: result === 'fail' ? 1 : 0,
    avg_ms: ms,
  };
}

export const isDue = (p: Pick<Progress, 'status' | 'due_at' | 'next_review_at'>, now = Date.now()) => {
  const dueAt = p.next_review_at ?? p.due_at;
  return p.status !== 'known' && dueAt !== null && dueAt !== undefined && Date.parse(dueAt) <= now;
};

/** Aplica una respuesta de repaso y devuelve el nuevo estado. */
export function afterReview(p: SrsState, result: Result, ms: number, now = Date.now()): SrsState {
  const counts = bump(p, result, ms);
  if (result === 'fail') {
    const step = Math.max(1, p.step - 1);
    const dueAt = new Date(now + RETRY_H * H).toISOString();
    return {
      ...p,
      ...counts,
      step,
      status: statusFor(step),
      lapses: p.lapses + 1,
      due_at: dueAt,
      next_review_at: dueAt,
      interval_step: step,
      retention_rate: 0,
    };
  }
  const step = Math.min(p.step + 1, MASTERED_STEP);
  const factor = result === 'doubt' ? 0.5 : 1;
  const dueAt = new Date(now + gapHours(step) * factor * H).toISOString();
  const nextReviewAt = ebbinghausCheckpoint(step, now);
  const stabilityHours = Math.max(gapHours(Math.max(p.step, 1)), 1);
  const observedRetention = theoreticalRetention(p.learned_at, stabilityHours, now);
  return {
    ...p,
    ...counts,
    step,
    status: statusFor(step),
    due_at: dueAt,
    next_review_at: nextReviewAt,
    interval_step: step,
    retention_rate: Math.max(0, Math.min(1, result === 'doubt' ? observedRetention * 0.85 : Math.max(observedRetention, 0.7))),
  };
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
