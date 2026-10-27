import type { AtomicWord, UnitSentence } from './unit';
import { piece } from './grammarLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import type { TrickCheckpoint } from './trickCheckpoint';

/** Small, explicitly authored release; not imported pilot content or a 30-day claim. */
export const zeroJourney = { id: 'memora:zero-cafe-v1', version: '1', title: 'Un café con Byte' };
export const zeroSteps = ['water', 'coffee', 'want', 'build-coffee', 'arcade-water', 'cold', 'be', 'contrast', 'write-cold', 'write-coffee', 'handoff'] as const;
export const zeroWords: AtomicWord[] = [
  { id: 901001, en: 'WATER', es: 'agua', ipa: '/ˈwɔːtə/', bridge: 'WÁTER', associationMode: 'acoustic_bridge', scene: 'Un WÁTER estornuda y lo llena todo de AGUA.', emojis: ['🚽', '💧'], associationId: 'zero-water-wc-v1', associationVersion: 1 },
  { id: 901002, en: 'COFFEE', es: 'café', ipa: '/ˈkɒfi/', bridge: 'CAFÉ', associationMode: 'cognate', scene: 'El CAFÉ salta de la taza al oír COFFEE.', cognateEvidence: { sameMeaning: true, note: 'COFFEE y café nombran la misma bebida; el audio modela el sonido inglés.' }, emojis: ['☕'], associationId: 'zero-coffee-cognate-v1', associationVersion: 1 },
  { id: 901003, en: 'COLD', es: 'frío', ipa: '/kəʊld/', bridge: 'COL', associationMode: 'acoustic_bridge', scene: 'Una COL tiembla de FRÍO y te roba la bufanda.', emojis: ['🥬', '🧣'], associationId: 'zero-cold-col-v1', associationVersion: 1 },
];
const sentence = (en: string, es: string): UnitSentence => ({ en, es, pronunciationTip: 'Escucha el mensaje completo.', slots: [] });
export const zeroMessages = {
  water: sentence('I want water.', 'Quiero agua.'),
  coffee: sentence('I want coffee.', 'Quiero café.'),
  cold: sentence('I am cold.', 'Tengo frío.'),
};
export const zeroCoffeePieces = [piece('COFFEE', 'context'), piece('WANT', 'verb'), piece('I', 'subject')];
export const zeroAccepts = (value: string, expected: string) => normalizeSentenceAnswer(value) === normalizeSentenceAnswer(expected)
  || normalizeSentenceAnswer(expected) === 'i am cold' && normalizeSentenceAnswer(value) === "i'm cold";
export function resumeZeroJourney(saved: TrickCheckpoint | null): TrickCheckpoint | null {
  if (!saved || zeroSteps[saved.stage] !== saved.checkId || !saved.episodeId
    || saved.order?.some((index) => index > 2)) return null;
  return saved;
}
export const freshZeroJourney = (): TrickCheckpoint => ({ stage: 0, checkIndex: 0, checkId: zeroSteps[0], input: '', feedback: 'idle', helped: false, order: [], episodeId: crypto.randomUUID(), episodeStartedAt: new Date().toISOString(), promptStartedAt: new Date().toISOString() });
