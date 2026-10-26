import type { AtomicUnit, AtomicWord } from './unit';
import { readLearningActivities, recordLearningActivity } from './learningActivity';
import { mnemonicSceneKind } from './wordVisual';

/** Exact authored actions only, not replacements for another story or approval. */
export function causalDiscoveryPresentation(word: AtomicWord) {
  const kind = mnemonicSceneKind(word);
  if (kind === 'desk-disco') return { kind, prompt: 'Haz que el disco despliegue sus patas.', control: 'Tocar el disco', tap: 'Toca el disco' };
  if (kind === 'pillow-piloto') return { kind, prompt: 'Haz que el piloto aterrice.', control: 'Hacer aterrizar al piloto', tap: 'Toca al piloto' };
  if (kind === 'phone-fondo') return { kind, prompt: 'Haz que el fondo se trague el móvil.', control: 'Tocar el fondo del bolsillo', tap: 'Toca el bolsillo' };
  return undefined;
}
export const supportsCausalDiscovery = (word: AtomicWord) => Boolean(causalDiscoveryPresentation(word));
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
    prompt: causalDiscoveryPresentation(word)!.prompt, response: word.scene, expected: '', correct: null, helped: true,
    promptLanguage: 'es', responseLanguage: 'es', feedback: 'Demostración manipulada; no acredita recuerdo ni dominio.',
    wordSnapshot: { en: word.en, es: word.es, bridge: word.bridge, scene: word.scene, associationId: word.associationId, associationVersion: word.associationVersion } });
}
