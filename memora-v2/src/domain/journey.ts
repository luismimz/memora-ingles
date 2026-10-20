import { appendProgress, progressStorage } from './progressJournal';

export interface JourneyStep {
  id: string;
  title: string;
  skill: string;
  ilerna: string;
}

/** Hitos de aprendizaje, no contenido jugable ni una copia del material de ILERNA. */
export const journeySteps: readonly JourneyStep[] = [
  { id: 'm1-z1-01', title: 'El dormitorio', skill: 'Escucha · conecta · construye', ilerna: 'Presente vivo · base' },
  { id: 'm1-bedroom-02', title: 'La cama de papel', skill: 'Dos palabras nuevas · una recuperada', ilerna: 'Presente vivo · e + ing' },
  { id: 'm1-bedroom-03', title: 'El armario hambriento', skill: 'Guardar ropa · consonante doble', ilerna: 'Presente vivo · consonante + ing' },
  { id: 'm1-bathroom-01', title: 'El pulpo de la espuma', skill: 'Lava · manos · jabón', ilerna: 'Presente vivo · repetición' },
  { id: 'm1-kitchen-01', title: 'El kit que cocina', skill: 'Cocina · cena · lugar', ilerna: 'Presente vivo · contexto' },
  { id: 'present-actions', title: 'Lo que haces ahora', skill: 'Presente simple y continuo', ilerna: 'RA1 · presente' },
  { id: 'first-questions', title: 'Tu primera pregunta', skill: 'Pregunta y responde sin memorizar tablas', ilerna: 'Comunicación cotidiana' },
  { id: 'past-stories', title: 'Lo que pasó', skill: 'Pasado y verbos irregulares', ilerna: 'RA1 · pasado' },
  { id: 'compare-and-explain', title: 'Compara y explica', skill: 'Comparativos y razones', ilerna: 'Unidad 2 · comparación' },
  { id: 'experience-and-time', title: 'Lo que has vivido', skill: 'Presente perfecto y duración', ilerna: 'Unidades 1–2 · perfectos' },
  { id: 'future-plans', title: 'Tus próximos planes', skill: 'Futuro y decisiones', ilerna: 'RA2 · futuro' },
  { id: 'professional-messages', title: 'Trabaja en inglés', skill: 'Mensajes, proyectos y correos', ilerna: 'Comunicación profesional' },
  { id: 'conditions-and-choices', title: 'Si pasara esto…', skill: 'Condicionales en escenas', ilerna: 'Unidad 6 · condicionales' },
  { id: 'formal-and-reported', title: 'Cuenta lo que pasó', skill: 'Voz pasiva y estilo indirecto', ilerna: 'Unidades 7 y 9' },
];

/** Home and in-game continuation must use exactly the same published route. */
export function orderedJourneyUnits<T extends { id: string }>(units: readonly T[]): T[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const opening = ['m1-test-desk', 'm1-bathroom-brush', 'm1-test-kitchen', 'm1-outside-dog', 'editorial-mnemonics-002-1', 'editorial-mnemonics-002-2', 'editorial-cognates-calle-2', 'editorial-cognates-casa-2'];
  const planned = [...new Set([...journeySteps.map((step) => step.id), ...opening])].map((id) => byId.get(id)).filter((unit): unit is T => Boolean(unit));
  const plannedIds = new Set(planned.map((unit) => unit.id));
  return [...planned, ...units.filter((unit) => !plannedIds.has(unit.id))];
}

export function nextPlayableUnit<T extends { id: string }>(currentId: string, units: readonly T[]): T | undefined {
  const ordered = orderedJourneyUnits(units);
  const current = ordered.findIndex((unit) => unit.id === currentId);
  return current >= 0 ? ordered[current + 1] : undefined;
}

export interface UnitProgress {
  completedAt: string;
  nextReviewAt: string;
  correct: number;
  attempted: number;
}

export function recordUnitProgress(userId: string, unitId: string, result: UnitProgress) {
  appendProgress(userId, 'unit', [unitId, result], result.completedAt);
  progressStorage().setItem(`memora-v2.unit.${userId}.${unitId}`, JSON.stringify(result));
}

export function readUnitProgress(userId: string, unitId: string): UnitProgress | null {
  try {
    const raw = progressStorage().getItem(`memora-v2.unit.${userId}.${unitId}`);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const progress = value as Partial<UnitProgress>;
    if (!progress.completedAt || !progress.nextReviewAt || !Number.isFinite(Date.parse(progress.nextReviewAt)) ||
      typeof progress.correct !== 'number' || typeof progress.attempted !== 'number') return null;
    return progress as UnitProgress;
  } catch { return null; }
}

export function isReviewDue(progress: UnitProgress | null, now = Date.now()): boolean {
  return progress !== null && Date.parse(progress.nextReviewAt) <= now;
}
