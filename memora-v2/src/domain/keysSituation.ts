import type { AtomicUnit, UnitSentence } from './unit';
import type { UnitSummary } from '../services/directus';
import { piece, type LessonStep } from './grammarLesson';
import { readLearningActivities } from './learningActivity';

/** A reviewed application of a published source, not a replacement catalogue. */
export const keysSituationId = 'situation:before-leaving-v1';
export const keysSituationSkill = 'looking-for:objects-in-context-v1';
export const keysSituationStages = ['key', 'phone', 'who', 'action', 'object', 'meaning', 'build', 'change', 'pairs', 'sound', 'use'] as const;
export type KeysSituationStage = typeof keysSituationStages[number];
export function keysSituationSource(units: readonly UnitSummary[]): UnitSummary | undefined {
  const suitable = (unit: UnitSummary) => unit.words?.some((word) => word.en.toUpperCase() === 'KEY' && word.es.toLowerCase() === 'llave') && unit.words.some((word) => word.en.toUpperCase() === 'PHONE' && word.es.toLowerCase() === 'móvil');
  return units.find((unit) => unit.id === 'm1-entry-keys' && suitable(unit)) ?? units.find(suitable);
}
export const situationCompleted = (userId: string, version: string, unitId = 'm1-entry-keys') => readLearningActivities(userId).some((event) => event.contentVersion === version && event.unitId === unitId && event.activityId === `${keysSituationId}:completed`);
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
  return { words: preparedWords, teaching, keys, phone, conversation, pieces: [piece('MY'), piece('KEYS'), piece('LOOKING FOR', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], modelOrder: [3, 4, 2, 0, 1] };
}
