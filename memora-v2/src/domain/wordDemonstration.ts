import type { AtomicUnit, AtomicWord } from './unit';
import { readLearningActivities, recordLearningActivity } from './learningActivity';
import { hasCausalDiscovery } from './causalDiscovery';

const activityId = (word: AtomicWord) => `word-demonstration-v1:${word.en}`;

/** Seeing a prepared model is exposure, not a correct answer or a new scheduler. */
export function hasWordDemonstration(userId: string, unit: AtomicUnit, word: AtomicWord): boolean {
  return hasCausalDiscovery(userId, unit, word) || readLearningActivities(userId).some((event) => {
    const saved = event.wordSnapshot;
    return event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1')
      && event.activityId === activityId(word) && event.source === 'authored' && event.correct === null
      && saved?.en === word.en && saved.es === word.es && saved.scene === word.scene
      && saved.bridge === word.bridge && saved.associationId === word.associationId
      && saved.associationVersion === word.associationVersion;
  });
}

export function recordWordDemonstration(userId: string, unit: AtomicUnit, word: AtomicWord) {
  if (hasWordDemonstration(userId, unit, word)) return;
  recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1',
    activityId: activityId(word), skill: word.en, phase: 'construction', source: 'authored', modality: 'choice',
    prompt: word.es, response: word.en, expected: '', correct: null, helped: true,
    promptLanguage: 'es', responseLanguage: 'en', feedback: 'Modelo presentado antes de montar; no acredita recuerdo.',
    wordSnapshot: { en: word.en, es: word.es, bridge: word.bridge, scene: word.scene, associationId: word.associationId, associationVersion: word.associationVersion } });
}
