import type { AtomicUnit, UnitSentence } from './unit';
import type { UnitSummary } from '../services/directus';
import { piece, type LessonStep } from './grammarLesson';
import { readLearningActivities, type LearningActivity } from './learningActivity';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import { dueSentenceMemories } from './memory';
import { readTrickCheckpoint, type TrickCheckpoint } from './trickCheckpoint';

/** A reviewed application of a published source, not a replacement catalogue. */
export const keysSituationId = 'situation:before-leaving-v1';
export const keysSituationSkill = 'looking-for:objects-in-context-v1';
export const keysSituationStages = ['key', 'phone', 'who', 'action', 'object', 'meaning', 'build', 'change', 'pairs', 'repair', 'sound', 'use'] as const;
export type KeysSituationStage = typeof keysSituationStages[number];
/** Historical IDs stay readable. Games are no longer compulsory laps around two words. */
export const keysSituationFlow = ['key', 'phone', 'object', 'meaning', 'build', 'use'] as const;
export function nextKeysSituationStage(stage: KeysSituationStage): KeysSituationStage | undefined {
  if (stage === 'use') return undefined;
  return ({ key: 'phone', phone: 'object', who: 'object', action: 'object', object: 'meaning', meaning: 'build', build: 'use', change: 'use', pairs: 'use', repair: 'use', sound: 'use' } as const)[stage];
}
/** Reuse only the subject actually produced; this does not prove another verb,
 * contraction, general ING rule, spoken skill or long-term retention. */
export function hasPreparedSituationSubject(activities: readonly LearningActivity[]): boolean {
  return activities.some((event) => event.skill === keysSituationSkill && event.source === 'learner' && event.modality === 'writing'
    && ['dialogue', 'transfer'].includes(event.phase) && event.correct === true && !event.helped
    && ['i am looking for my keys', 'i am looking for my phone'].includes(normalizeSentenceAnswer(event.expected))
    && normalizeSentenceAnswer(event.response) === normalizeSentenceAnswer(event.expected));
}
export function keysSituationSource(units: readonly UnitSummary[]): UnitSummary | undefined {
  const suitable = (unit: UnitSummary) => unit.words?.some((word) => word.en.toUpperCase() === 'KEY' && word.es.toLowerCase() === 'llave') && unit.words.some((word) => word.en.toUpperCase() === 'PHONE' && word.es.toLowerCase() === 'móvil');
  return units.find((unit) => unit.id === 'm1-entry-keys' && suitable(unit)) ?? units.find(suitable);
}
/** Prefer the next reviewed situation over an unrelated vocabulary detour.
 * Receives only published summaries; the normal loader still validates content. */
export function computerSituationSource(units: readonly UnitSummary[]): UnitSummary | undefined {
  return units.find((unit) => unit.id === 'm1-test-desk' && unit.kind !== 'vocabulary-pack' && unit.kind !== 'grammar-lesson'
    && unit.sentence?.en === "I'm playing on my computer."
    && [['PLAY', 'jugar'], ['COMPUTER', 'ordenador'], ['DESK', 'escritorio']].every(([en, es]) => unit.words?.some((word) => word.en === en && word.es === es)));
}
export const situationCompleted = (userId: string, version: string, unitId = 'm1-entry-keys') => readLearningActivities(userId).some((event) => event.contentVersion === version && event.unitId === unitId && (event.activityId === `${keysSituationId}:completed` || event.activityId.startsWith(`${keysSituationId}:completed:`)));
export const situationCheckpointVersion = (unitId: string, version: string) => `${unitId}:${version}:${keysSituationId}`;
export function situationRunCompleted(userId: string, unitId: string, version: string, saved: TrickCheckpoint): boolean {
  return readLearningActivities(userId).some((event) => event.unitId === unitId && event.contentVersion === version && (event.activityId === `${keysSituationId}:completed:${saved.episodeId ?? saved.episodeStartedAt ?? 'legacy'}` || event.activityId === `${keysSituationId}:completed` && event.at >= (saved.episodeStartedAt ?? '')));
}
export function situationInProgress(userId: string, unitId: string, version: string): boolean {
  const saved = resumeKeysSituation(readTrickCheckpoint(userId, keysSituationId, situationCheckpointVersion(unitId, version)));
  return Boolean(saved && !situationRunCompleted(userId, unitId, version, saved));
}
/** New activities never shift an already-started sound/response into another task. */
export function resumeKeysSituation(saved: TrickCheckpoint | null): TrickCheckpoint | null {
  if (!saved?.checkId) return null;
  const stage = keysSituationStages.findIndex((id) => id === saved.checkId);
  if (stage < 0 || saved.order?.some((id) => id > (saved.checkId === 'build' && saved.situationLayout === 'message-chunks-v1' ? 2 : 4)) || saved.checkId === 'repair' && (saved.order?.length ?? 0) > 1) return null;
  return { ...saved, stage };
}
/** Existing SRS dates for these taught messages only, not another schedule. */
export function situationReviewDue(userId: string, unitId: string, now = Date.now()): boolean {
  return dueSentenceMemories(userId, now).some((memory) => memory.unitId === unitId && ['i am looking for my keys', 'i am looking for my phone'].includes(normalizeSentenceAnswer(memory.sentenceEn)));
}
export function prepareKeysSituation(source: AtomicUnit) {
  // The new application owns its three teaching models. It does not borrow an
  // unrelated lesson or publish a pilot just to acquire these two words.
  const words = [['KEY', 'llave'], ['PHONE', 'móvil']].map(([en, es]) => source.words.find((word) => word.en.toUpperCase() === en && word.es.toLowerCase() === es && word.status !== 'rejected' && word.status !== 'needs_review'));
  if (!words[0] || !words[1]) return null;
  const preparedWords = [words[0], words[1]];
  const message = (phone: boolean): UnitSentence => ({
    en: `I am looking for my ${phone ? 'phone' : 'keys'}.`, es: phone ? 'Estoy buscando mi móvil.' : 'Estoy buscando mis llaves.', pronunciationTip: 'Escucha LOOKING FOR unido dentro del mensaje.',
    slots: [{ en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'looking for', es: 'buscando', choices: ['looking for', 'my'] }, { en: 'my', es: phone ? 'mi' : 'mis', choices: ['my', 'am'] }, { en: phone ? 'phone.' : 'keys.', es: phone ? 'móvil' : 'llaves', choices: [phone ? 'phone.' : 'keys.', 'looking for'] }],
  });
  const keys = message(false), phone = message(true);
  const teaching: LessonStep[] = [
    { es: [piece('Yo ', 'subject'), piece('estoy', 'auxiliary')], en: [piece('I ', 'subject'), piece('am', 'auxiliary')], caption: 'I es YO. AM es ESTOY. Para este mensaje, viajan juntos: I AM.' },
    { es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('buscando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('looking for', 'verb')], caption: 'No pierdas FOR: LOOKING FOR es el bloque «buscando» en este mensaje.' },
    { es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('buscando ', 'verb'), piece('mis llaves', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('looking for ', 'verb'), piece('my keys', 'context')], caption: 'MY sirve para «mi» y «mis». KEY es una llave; KEYS son varias. Aquí: MY KEYS.' },
  ];
  const conversation: AtomicUnit = { ...source, kind: 'mission', words: preparedWords, mirror: undefined, grammarLesson: undefined, grammarPrerequisites: undefined, grammarContinuation: undefined, grammar: [{ id: 'looking-for', spanish: 'buscando', spanishStem: 'busc', spanishEnding: 'ando', englishRoot: 'look', englishBase: 'look', englishNut: 'ing', english: 'looking', placement: 'after', subjects: [{ en: "I'm", expandedEn: 'I am', es: 'Yo', phrase: phone.en }] }], sentence: phone, practiceSentences: [keys], communication: {
    layer: 'converse', intent: 'Conseguir que Nora te ayude a buscar antes de salir.', interlocutor: 'Nora', userTurn: phone.en, reply: 'I will help you.', replyMode: 'receptive_chunk',
    dialogue: { partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', context: 'Nora busca contigo. Cuéntale qué necesitas encontrar.', turns: [
      { role: 'A', en: 'What are you looking for?', es: '¿Qué estás buscando? Primero, tu móvil.', acceptedAnswers: ['What are you looking for?'] },
      { role: 'B', en: phone.en, es: phone.es, acceptedAnswers: [phone.en, "I'm looking for my phone."] },
    ], transfer: { role: 'B', en: keys.en, es: keys.es, acceptedAnswers: [keys.en, "I'm looking for my keys."] }, transferContext: 'El móvil ya está. Ahora dile a Nora que buscas tus llaves.', reply: { en: 'I will help you.', es: '¡Ahora sé qué buscar contigo!' }, rhythmTip: 'Imita el ritmo si te apetece. No necesitas micrófono para seguir.' },
  } };
  const repair = { target: keys.es, solution: keys.en, pieces: [piece('I', 'subject'), piece('am', 'auxiliary'), piece('looking', 'verb'), piece('my keys', 'context')], choices: [piece('AM', 'auxiliary'), piece('MY', 'context'), piece('FOR', 'verb')], joined: { before: 'I am ', first: 'looking', inserted: 'for', after: ' my keys.' }, insight: 'FOR completa LOOKING FOR: «buscando» en este mensaje.' };
  const messageTeaching: LessonStep = {
    es: [piece('Yo estoy ', 'auxiliary'), piece('buscando ', 'verb'), piece('mis llaves', 'context')],
    en: [piece('I am ', 'auxiliary'), piece('looking for ', 'verb'), piece('my keys', 'context')],
    caption: 'LOOKING FOR significa «buscando» aquí. Conserva las dos palabras juntas.',
  };
  return { words: preparedWords, teaching, messageTeaching, messagePieces: [piece('MY KEYS', 'context'), piece('LOOKING FOR', 'verb'), piece('I AM', 'auxiliary')], keys, phone, conversation, repair, pieces: [piece('MY'), piece('KEYS'), piece('LOOKING FOR', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], modelOrder: [3, 4, 2, 0, 1] };
}
