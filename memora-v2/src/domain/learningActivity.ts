import { appendProgress, progressStorage } from './progressJournal';
import type { AtomicWord } from './unit';

export interface LearningActivity {
  id: string; unitId: string; unitTitle: string; contentVersion: string; activityId: string; skill: string;
  phase: 'grammar' | 'construction' | 'dialogue' | 'transfer' | 'arcade' | 'completion';
  source: 'learner' | 'authored'; modality: 'choice' | 'writing' | 'oral';
  prompt: string; response: string; expected: string; correct: boolean | null; helped: boolean;
  feedback?: string; parentAttemptId?: string; at: string;
  conversationId?: string; speaker?: string;
  /** Language of the actual displayed text, not its translation or the target lesson. */
  responseLanguage?: 'en' | 'es'; promptLanguage?: 'en' | 'es';
  /** Exact taught association for a neutral model consultation; never a mastery flag. */
  wordSnapshot?: Pick<AtomicWord, 'en' | 'es' | 'bridge' | 'scene' | 'associationId' | 'associationVersion'>;
}
export function readLearningActivities(userId: string): LearningActivity[] {
  try { const records = JSON.parse(progressStorage().getItem(`memora-v2.learning.${userId}`) || '[]'); return Array.isArray(records) ? records : []; } catch { return []; }
}
export function recordLearningActivity(userId: string, value: Omit<LearningActivity, 'id' | 'at'> & { id?: string; at?: string }): LearningActivity {
  const activity = { ...value, id: value.id ?? crypto.randomUUID(), at: value.at ?? new Date().toISOString() };
  appendProgress(userId, 'learning', [activity], activity.at, activity.id);
  const records = readLearningActivities(userId);
  try { if (!records.some((record) => record.id === activity.id)) progressStorage().setItem(`memora-v2.learning.${userId}`, JSON.stringify([...records, activity])); }
  catch { if (typeof window !== 'undefined') window.dispatchEvent(new Event('memora-progress-storage-full')); }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('memora-learning-activity'));
  return activity;
}

export function contextualCorrection(response: string, expected: string, fallback = 'Escucha la frase de nuevo y fíjate en el orden de las piezas. Puedes volver a intentarlo.'): string {
  const normalize = (text: string) => text.toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
  const value = normalize(response);
  const model = normalize(expected);
  const continuous = model.match(/^i(?: am|'m) (\w+ing(?: .*)?)$/);
  // Only diagnose a missing subject when the rest matches the taught message.
  if (continuous && value === `am ${continuous[1]}`) return 'La acción ya está. Añade quién: I significa YO. Junta I + AM antes de la acción.';
  if (continuous && value === continuous[1]) return 'La acción ya está. Para decir «YO estoy», coloca I + AM delante. Después conserva la acción.';
  if (/\blooking for\b/.test(model) && /\blooking\b/.test(value) && !/\bfor\b/.test(value)) return 'Para decir «buscar», conserva LOOK FOR completo. Aquí falta FOR.';
  if (/^i(?: am|'m)\b/.test(model) && /^i\s+\w+ing\b/.test(value)) return 'Falta AM. Para decir «estoy», junta I AM: I\'M. Después va la acción con ING.';
  if (/^what are you/.test(model) && /you are/.test(value)) return 'Para preguntar, ARE salta delante de YOU: WHAT ARE YOU…?';
  if (/keys/.test(model) && /\bkey\b/.test(value)) return 'Hablas de varias llaves. KEY es una; KEYS añade la S del plural.';
  return fallback;
}
