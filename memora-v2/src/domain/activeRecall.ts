import type { AtomicUnit, AtomicWord } from './unit';
import { recordLearningActivity } from './learningActivity';
import { recordWordRecall } from './memory';
import { recordAttempt } from './learningProfile';

export const recalledWordIndex = (unit: AtomicUnit, index: number) => unit.activeRecall ? unit.words.length - 1 - index : index;
export const matchesWord = (word: AtomicWord, response: string) =>
  response.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[.!?]+$/u, '') === word.en.toLocaleLowerCase('en');

export function wordRecallHint(word: AtomicWord, level: number): string {
  if (level <= 1) return word.scene;
  const words = word.en.trim().split(/\s+/u);
  const letters = [...word.en].filter((letter) => /\p{L}/u.test(letter)).length;
  return `Empieza por ${words[0][0]}. Tiene ${words.length > 1 ? `${words.length} palabras y ` : ''}${letters} letras.${word.bridge ? ` El puente ${word.bridge} es un apoyo aproximado, no la pronunciación inglesa ni la traducción.` : ' Recuerda su imagen y su significado.'}`;
}

/** Every attempt uses the existing journal, SRS and history. A retry after help is never independent. */
export function recordActiveWordAttempt(userId: string, unit: AtomicUnit, word: AtomicWord, response: string,
  mode: 'writing' | 'choice' | 'skip', helped: boolean, parentAttemptId?: string, responseDelayMs?: number) {
  const correct = mode === 'skip' ? null : matchesWord(word, response);
  const usedCue = helped || mode !== 'writing';
  const direction = mode === 'choice' ? 'recognition' : 'recall';
  const now = new Date();
  const delay = typeof responseDelayMs === 'number' && Number.isFinite(responseDelayMs) && responseDelayMs >= 0 ? Math.round(responseDelayMs) : undefined;
  if (mode !== 'skip') {
    // Same conservative five-second boundary as the existing recognition path.
    // Unknown timing must not masquerade as a fast response; correctness/help stay separate.
    recordWordRecall(userId, word, correct ? delay !== undefined && delay <= 5000 ? 'quick' : 'hesitant' : 'missed', now, direction, correct ? undefined : mode === 'choice' ? 'meaning' : 'writing', usedCue);
    recordAttempt(userId, { unitId: unit.id, wordId: word.id, word: word.en, correct: correct === true, at: now.toISOString(), direction, error: correct ? undefined : mode === 'choice' ? 'meaning' : 'writing' });
  }
  return recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1',
    activityId: `active-recall:${word.en}`, skill: word.en, phase: 'arcade', source: 'learner', modality: mode === 'writing' ? 'writing' : 'choice',
    prompt: word.es, response: mode === 'skip' ? '(pasó con modelo)' : response, expected: word.en, correct, helped: usedCue, parentAttemptId,
    ...(delay === undefined ? {} : { responseDelayMs: delay }),
    ...(mode === 'skip' ? { wordSnapshot: { en: word.en, es: word.es, bridge: word.bridge, scene: word.scene, associationId: word.associationId, associationVersion: word.associationVersion } } : {}),
    feedback: correct ? usedCue ? 'Recuperada con apoyo; la volverás a practicar sin pistas.' : 'Recuperada sin opciones ni pistas en este intento. La comprobaremos otro día.' : mode === 'skip' ? 'Modelo consultado. No cuenta como acierto; queda pendiente de práctica sin ayudas.' : 'Vuelve a imaginar la escena y prueba otra vez.' });
}
