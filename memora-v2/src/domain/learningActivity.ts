import { appendProgress, progressStorage } from './progressJournal';

export interface LearningActivity {
  id: string; unitId: string; unitTitle: string; contentVersion: string; activityId: string; skill: string;
  phase: 'grammar' | 'construction' | 'dialogue' | 'transfer' | 'arcade' | 'completion';
  source: 'learner' | 'authored'; modality: 'choice' | 'writing' | 'oral';
  prompt: string; response: string; expected: string; correct: boolean | null; helped: boolean;
  feedback?: string; parentAttemptId?: string; at: string;
  conversationId?: string; speaker?: string;
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

export function contextualCorrection(response: string, expected: string): string {
  const value = response.toLowerCase().replace(/[’‘]/g, "'");
  if (/\blooking for\b/i.test(expected) && /\blooking\b/.test(value) && !/\bfor\b/.test(value)) return 'Para decir «buscar», conserva LOOK FOR completo. Aquí falta FOR.';
  if (/^i(?: am|'m)\b/i.test(expected) && /^i\s+\w+ing\b/.test(value)) return 'Falta AM. Para decir «estoy», junta I AM: I\'M. Después va la acción con ING.';
  if (/^what are you/i.test(expected) && /you are/i.test(value)) return 'Para preguntar, ARE salta delante de YOU: WHAT ARE YOU…?';
  if (/keys/i.test(expected) && /\bkey\b/i.test(value)) return 'Hablas de varias llaves. KEY es una; KEYS añade la S del plural.';
  return 'Escucha la frase de nuevo y fíjate en el orden de las piezas. Puedes volver a intentarlo.';
}
