import type { AtomicUnit, AtomicWord } from './unit';
import { readLearningActivities, recordLearningActivity } from './learningActivity';
import { mnemonicSceneKind } from './wordVisual';

/** One exact authored association, not a replacement for another story or approval. */
export const supportsCausalDiscovery = (word: AtomicWord) => mnemonicSceneKind(word) === 'desk-disco';
const activityId = (word: AtomicWord) => `causal-discovery-v1:${word.en}`;
export function hasCausalDiscovery(userId: string, unit: AtomicUnit, word: AtomicWord): boolean {
  return supportsCausalDiscovery(word) && readLearningActivities(userId).some((event) => {
    const saved = event.wordSnapshot;
    return event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1') && event.activityId === activityId(word)
      && event.source === 'authored' && event.correct === null && saved?.en === word.en && saved.es === word.es
      && saved.bridge === word.bridge && saved.scene === word.scene && saved.associationId === word.associationId && saved.associationVersion === word.associationVersion;
  });
}
export function recordCausalDiscovery(userId: string, unit: AtomicUnit, word: AtomicWord) {
  if (!supportsCausalDiscovery(word) || hasCausalDiscovery(userId, unit, word)) return;
  recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1',
    activityId: activityId(word), skill: word.en, phase: 'construction', source: 'authored', modality: 'choice',
    prompt: 'Haz que el disco despliegue sus patas.', response: word.scene, expected: '', correct: null, helped: true,
    promptLanguage: 'es', responseLanguage: 'es', feedback: 'Demostración manipulada; no acredita recuerdo ni dominio.',
    wordSnapshot: { en: word.en, es: word.es, bridge: word.bridge, scene: word.scene, associationId: word.associationId, associationVersion: word.associationVersion } });
}
