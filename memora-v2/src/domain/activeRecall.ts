import type { AtomicUnit, AtomicWord } from './unit';
import { recordLearningActivity } from './learningActivity';
import { recordWordRecall } from './memory';
import { recordAttempt } from './learningProfile';

export const recalledWordIndex = (unit: AtomicUnit, index: number) => unit.activeRecall ? unit.words.length - 1 - index : index;
export const matchesWord = (word: AtomicWord, response: string) =>
  response.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[.!?]+$/u, '') === word.en.toLocaleLowerCase('en');

export function wordRecallHint(word: AtomicWord, level: number): string {
  if (level <= 1) return word.scene;
  return `Empieza por ${word.en[0]}. Tiene ${word.en.length} letras. El puente ${word.bridge} solo te ayuda a recordar el sonido; no es la traducción.`;
}

/** Every attempt uses the existing journal, SRS and history. A retry after help is never independent. */
export function recordActiveWordAttempt(userId: string, unit: AtomicUnit, word: AtomicWord, response: string,
  mode: 'writing' | 'choice' | 'skip', helped: boolean, parentAttemptId?: string) {
  const correct = mode === 'skip' ? null : matchesWord(word, response);
  const usedCue = helped || mode !== 'writing';
  const direction = mode === 'choice' ? 'recognition' : 'recall';
  const now = new Date();
  recordWordRecall(userId, word, correct ? 'quick' : 'missed', now, direction, correct || mode === 'skip' ? undefined : 'writing', usedCue);
  if (mode !== 'skip') recordAttempt(userId, { unitId: unit.id, wordId: word.id, word: word.en, correct: correct === true, at: now.toISOString(), direction, error: correct ? undefined : 'writing' });
  return recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1',
    activityId: `active-recall:${word.en}`, skill: word.en, phase: 'arcade', source: 'learner', modality: mode === 'writing' ? 'writing' : 'choice',
    prompt: word.es, response: mode === 'skip' ? '(pasó con modelo)' : response, expected: word.en, correct, helped: usedCue, parentAttemptId,
    feedback: correct ? usedCue ? 'Recuperada con apoyo; la volverás a practicar sin pistas.' : 'Recuperada sin opciones ni pistas en este intento. La comprobaremos otro día.' : mode === 'skip' ? 'Modelo consultado. No cuenta como acierto; volverá en el repaso.' : 'Vuelve a imaginar la escena y prueba otra vez.' });
}
