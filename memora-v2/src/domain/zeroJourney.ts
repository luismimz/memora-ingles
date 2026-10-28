import type { AtomicWord, UnitSentence } from './unit';
import { piece } from './grammarLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import type { TrickCheckpoint } from './trickCheckpoint';
import { dueSentenceMemories } from './memory';

/** Small, explicitly authored release; not imported pilot content or a 30-day claim. */
export const zeroJourney = { id: 'memora:zero-cafe-v1', version: '1', title: 'Una mañana con Byte' };
export const zeroSteps = ['water', 'coffee', 'want', 'build-coffee', 'arcade-water', 'cold', 'be', 'contrast', 'not-want', 'build-no-water', 'cold-order', 'arcade-refusal', 'write-cold-water', 'write-cold', 'use-refusal', 'key', 'have', 'have-meaning', 'write-key', 'write-coffee', 'complete'] as const;
export type ZeroStep = typeof zeroSteps[number];
// A saved coffee draft remains answerable. New runs do not repeat that old task.
export const nextZeroStep = (step: ZeroStep): ZeroStep => step === 'write-key' ? 'complete' : step === 'write-coffee' ? 'not-want' : zeroSteps[Math.min(zeroSteps.indexOf(step) + 1, zeroSteps.length - 1)];
export const zeroWords: AtomicWord[] = [
  { id: 901001, en: 'WATER', es: 'agua', ipa: '/ˈwɔːtə/', bridge: 'WÁTER', associationMode: 'acoustic_bridge', scene: 'Un WÁTER estornuda y lo llena todo de AGUA.', emojis: ['🚽', '💧'], associationId: 'zero-water-wc-v1', associationVersion: 1 },
  { id: 901002, en: 'COFFEE', es: 'café', ipa: '/ˈkɒfi/', bridge: 'CAFÉ', associationMode: 'cognate', scene: 'El CAFÉ salta de la taza al oír COFFEE.', cognateEvidence: { sameMeaning: true, note: 'COFFEE y café nombran la misma bebida; el audio modela el sonido inglés.' }, emojis: ['☕'], associationId: 'zero-coffee-cognate-v1', associationVersion: 1 },
  { id: 901003, en: 'COLD', es: 'frío', ipa: '/kəʊld/', bridge: 'COL', associationMode: 'acoustic_bridge', scene: 'Una COL tiembla de FRÍO y te roba la bufanda.', emojis: ['🥬', '🧣'], associationId: 'zero-cold-col-v1', associationVersion: 1 },
  { id: 901004, en: 'KEY', es: 'llave', ipa: '/kiː/', bridge: 'KIWI', associationMode: 'acoustic_bridge', scene: 'Un KIWI gira en la cerradura y se convierte en LLAVE.', emojis: ['🥝', '🔑'], associationId: 'zero-key-turning-kiwi-v1', associationVersion: 1 },
];
const sentence = (en: string, es: string): UnitSentence => ({ en, es, pronunciationTip: 'Escucha el mensaje completo.', slots: [] });
export const zeroMessages = {
  water: sentence('I want water.', 'Quiero agua.'),
  coffee: sentence('I want coffee.', 'Quiero café.'),
  cold: sentence('I am cold.', 'Tengo frío.'),
  noCoffee: sentence("I don't want coffee.", 'No quiero café.'),
  noWater: sentence("I don't want water.", 'No quiero agua.'),
  coldCoffee: sentence('I want cold coffee.', 'Quiero café frío.'),
  coldWater: sentence('I want cold water.', 'Quiero agua fría.'),
  haveKey: sentence('I have a key.', 'Tengo una llave.'),
  wantKey: sentence('I want a key.', 'Quiero una llave.'),
};
export const zeroFrames = {
  want: { sentence: zeroMessages.water, verb: 'WANT', mirror: 'QUIERO', gloss: 'quiero', object: 'WATER', meaning: 'agua', insight: 'I + WANT: dices quién quiere algo.' },
  be: { sentence: zeroMessages.cold, verb: 'AM', mirror: 'ESTOY', gloss: 'estoy', object: 'COLD', meaning: 'frío', insight: 'En esta expresión: I AM COLD = tengo frío.' },
  'not-want': { sentence: zeroMessages.noCoffee, verb: "DON'T WANT", mirror: 'NO QUIERO', gloss: 'no quiero', object: 'COFFEE', meaning: 'café', insight: "DON'T WANT: el bloque que cambia «quiero» por «no quiero»." },
  have: { sentence: zeroMessages.haveKey, verb: 'HAVE', mirror: 'TENGO', gloss: 'tengo', object: 'A KEY', meaning: 'una llave', insight: 'A KEY = una llave. HAVE: aquí dices lo que tienes.' },
};
export const zeroCoffeePieces = [piece('COFFEE', 'context'), piece('WANT', 'verb'), piece('I', 'subject')];
export const zeroNoWaterPieces = [piece("DON'T WANT", 'verb'), piece('WATER', 'context'), piece('I', 'subject')];
export const zeroTask = (step: ZeroStep) => {
  const message = ['coffee', 'build-coffee', 'write-coffee'].includes(step) ? zeroMessages.coffee
    : ['water', 'want', 'arcade-water'].includes(step) ? zeroMessages.water
    : step === 'build-no-water' ? zeroMessages.noWater
    : ['not-want', 'use-refusal', 'arcade-refusal'].includes(step) ? zeroMessages.noCoffee
    : step === 'cold-order' ? zeroMessages.coldCoffee
    : step === 'write-cold-water' ? zeroMessages.coldWater : step === 'write-key' ? zeroMessages.wantKey : ['key', 'have', 'have-meaning'].includes(step) ? zeroMessages.haveKey : zeroMessages.cold;
  return {
    message,
    writing: ['write-cold', 'write-coffee', 'write-cold-water', 'use-refusal', 'write-key'].includes(step),
    arcade: step === 'arcade-water' || step === 'arcade-refusal',
    expected: step === 'contrast' ? 'AM' : step === 'have-meaning' ? 'HAVE' : step === 'arcade-water' ? 'WATER' : step === 'arcade-refusal' ? 'COFFEE' : message.en,
    target: step === 'arcade-water' ? zeroMessages.water.en : step === 'arcade-refusal' ? zeroMessages.noCoffee.en : message.es,
    skill: ['key', 'have', 'have-meaning', 'write-key'].includes(step) ? 'zero:have-or-want-key-v1' : ['not-want', 'build-no-water', 'arcade-refusal', 'use-refusal'].includes(step) ? 'zero:refuse-drink-v1' : ['cold-order', 'write-cold-water'].includes(step) ? 'zero:cold-before-drink-v1' : ['cold', 'be', 'contrast', 'write-cold'].includes(step) ? 'zero:be-cold-v1' : 'zero:want-drink-v1',
    words: step === 'write-cold-water' ? [zeroWords[0], zeroWords[2]] : [zeroWords[step === 'write-cold' ? 2 : step === 'write-key' ? 3 : 1]],
  };
};
export const zeroRecallSteps = ['write-cold-water', 'write-cold', 'use-refusal', 'write-key', 'write-coffee'] as const;
export type ZeroRecallStep = typeof zeroRecallSteps[number];
/** Route opportunities selected by the existing SRS, never calculate a new schedule. */
export function dueZeroReviews(userId: string, now = Date.now()): ZeroRecallStep[] {
  return dueSentenceMemories(userId, now).filter((memory) => memory.unitId === zeroJourney.id).flatMap((memory) => {
    const step = zeroRecallSteps.find((candidate) => {
      const { message } = zeroTask(candidate);
      return zeroAccepts(memory.sentenceEn, message.en) && memory.sentenceEs === message.es;
    });
    return step ? [step] : [];
  }).filter((step, index, all) => all.indexOf(step) === index);
}
export const zeroAccepts = (value: string, expected: string) => normalizeSentenceAnswer(value).replace(/\bdon't\b/gu, 'do not') === normalizeSentenceAnswer(expected).replace(/\bdon't\b/gu, 'do not');
export function zeroCorrection(step: ZeroStep, response: string): string {
  const value = normalizeSentenceAnswer(response);
  if (step === 'write-key') {
    if (/\bhave\b/u.test(value)) return 'Aquí estás pidiendo: WANT, quiero. HAVE cuenta lo que ya tienes.';
    if (/\bkey\b/u.test(value) && !/\ba key\b/u.test(value)) return 'Una llave se dice A KEY. Conserva A delante de KEY.';
  }
  if (step === 'use-refusal' && !/\bdon't\b|\bdo not\b/u.test(value)) return "WANT pide; DON'T WANT rechaza. Aquí no quieres café.";
  if (step === 'write-cold-water') {
    if (/\bwater cold\b/u.test(value)) return 'COLD va delante de la bebida: COLD WATER, agua fría.';
    if (/\bcoffee\b/u.test(value)) return 'COFFEE es café. Esta vez quieres WATER, agua.';
  }
  if (step === 'write-cold' && !/\bi am\b/u.test(value)) return 'En esta expresión dices cómo estás: I AM COLD, tengo frío.';
  return 'Revisa las piezas de tu mensaje. En ••• puedes ver un modelo.';
}
/** Only known, complete misconstructions. A pause or unfinished prefix is not an error. */
export function zeroDraftCue(step: ZeroStep, value: string): string | undefined {
  const draft = normalizeSentenceAnswer(value);
  if (step === 'use-refusal' && draft === 'i dont want coffee') return "DON'T lleva apóstrofo. DON'T WANT significa «no quiero».";
  const complete = step === 'write-key' ? ['i have a key', 'i want key']
    : step === 'use-refusal' ? ['i want coffee']
    : step === 'write-cold-water' ? ['i want water cold', 'i want cold coffee']
    : step === 'write-cold' ? ['i cold', 'i have cold', 'i want cold'] : [];
  return complete.includes(draft) ? zeroCorrection(step, value) : undefined;
}
export function resumeZeroJourney(saved: TrickCheckpoint | null): TrickCheckpoint | null {
  if (!saved?.episodeId) return null;
  // Old completed runs enter the extension, not a restart or an immediate exit.
  if (saved.checkId === 'handoff') return { ...saved, stage: zeroSteps.indexOf('not-want'), checkId: 'not-want', input: '', order: [], feedback: 'idle', helped: false, checkFailures: 0, previousAttemptId: undefined, correctionResponse: undefined, promptStartedAt: new Date().toISOString() };
  const stage = zeroSteps.indexOf(saved.checkId as ZeroStep);
  const limit = saved.checkId === 'build-coffee' || saved.checkId === 'build-no-water' ? 3 : 0;
  if (stage < 0 || saved.order?.some((index) => !Number.isInteger(index) || index < 0 || index >= limit) || new Set(saved.order).size !== (saved.order?.length ?? 0)) return null;
  if (saved.review && (saved.review.pending.some((id) => !zeroRecallSteps.includes(id as typeof zeroRecallSteps[number])) || (saved.review.pending[0] ?? 'complete') !== saved.checkId)) return null;
  return { ...saved, stage };
}
export const freshZeroJourney = (reviews: ZeroRecallStep[] = []): TrickCheckpoint => ({ stage: reviews.length ? zeroSteps.indexOf(reviews[0]) : 0, checkIndex: 0, checkId: reviews[0] ?? zeroSteps[0], input: '', feedback: 'idle', helped: false, order: [], episodeId: crypto.randomUUID(), episodeStartedAt: new Date().toISOString(), promptStartedAt: new Date().toISOString(), ...(reviews.length ? { review: { pending: [...reviews], total: reviews.length } } : {}) });
