import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { computerPlayingLesson, computerPlayingSkill } from './computerPlayingPractice';

export const deskLocationSkill = 'desk-location-prepared-v1';
export const deskLocationIdentity = 'ing:prepared-desk-location-v1';
export function deskLocationLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  if (!computerPlayingLesson(unit, formId) || !unit.words.some((word) => word.en === 'DESK' && word.es === 'escritorio')
    || !unit.practiceSentences?.some((sentence) => sentence.en === "I'm playing on my computer at my desk.")) return null;
  const message = 'I am playing at my desk';
  return { id: deskLocationSkill, title: 'Dile a Nora dónde estás jugando', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'YO se dice I: haces visible quién actúa.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'YO ESTOY se expresa con I AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'La acción ya es conocida: I AM PLAYING, estoy jugando. Ahora vas a indicar dónde.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('jugando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('playing', 'verb')] },
    { caption: 'MY DESK: mi escritorio. MY indica a quién pertenece.', es: [piece('MI ', 'context'), piece('ESCRITORIO', 'context')], en: [piece('MY ', 'context'), piece('DESK', 'context')] },
    { caption: 'AT MY DESK: en mi escritorio, como lugar donde estoy. No significa estar encima del tablero; AT no traduce cualquier «en».', es: [piece('en mi escritorio', 'context')], en: [piece('AT MY DESK', 'context')] },
    { caption: "I AM PLAYING AT MY DESK: estoy jugando en mi escritorio. Puedes unir I AM como I'M. Este mensaje indica el lugar, no qué aparato usas.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('jugando ', 'verb'), piece('en mi escritorio', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('playing ', 'verb'), piece('at my desk', 'context')] },
  ], checks: [
    { id: 'desk-order-v1', kind: 'choose', prompt: 'Monta el mensaje para que Nora sepa dónde encontrarte.', ordering: [piece('AT MY DESK', 'context'), piece('PLAYING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + PLAYING + AT MY DESK. El último bloque indica tu lugar.', success: 'Ya puedes contar dónde estás jugando.' },
    { id: 'desk-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que indica ese lugar.', choices: ['Está jugando en su escritorio.', 'Está jugando en el suelo.'], answers: ['Está jugando en su escritorio.'], situation: { message, scenes: [{ choice: 'Está jugando en su escritorio.', state: 'desk-playing' }, { choice: 'Está jugando en el suelo.', state: 'floor-playing' }] }, hint: 'Ambas personas juegan. AT MY DESK indica el escritorio, no el suelo.', success: 'Has entendido dónde está jugando.' },
    { id: 'desk-use-v1', kind: 'write', prompt: 'Dile a Nora que estás jugando en tu escritorio.', answers: [message, "I'm playing at my desk"], hint: 'I + AM + PLAYING + AT MY DESK.', success: 'Nora ya sabe dónde encontrarte.' },
  ] };
}
export function preparedDeskLocationPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = deskLocationLesson(unit, formId);
  if (!lesson || !attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === computerPlayingSkill && attempt.kind === 'write' && attempt.correct && !attempt.helped)
    || !['PLAY', 'COMPUTER', 'DESK'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am playing at my desk.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy jugando en mi escritorio.', pronunciationTip: 'Escucha AT MY DESK unido al mensaje.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'playing', es: 'jugando', choices: ['playing', 'I'] }, { en: 'at my desk.', es: 'en mi escritorio', choices: ['at my desk.', 'playing'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Contar dónde estás para que Nora se acerque a tu escritorio.', userTurn: en, reply: 'I will come to your desk.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora te busca para dejarte un cuaderno. Estás jugando en tu escritorio: dile dónde encontrarte.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'Where are you playing?', es: '¿Dónde estás jugando?', acceptedAnswers: ['Where are you playing?'] },
      { role: 'B', en, es: 'Estoy jugando en mi escritorio.', acceptedAnswers: [en, "I'm playing at my desk."] },
    ], reply: { en: 'I will come to your desk.', es: '¡Ya sé dónde estás! Me acerco a tu escritorio y te dejo el cuaderno.' }, rhythmTip: 'Repite el mensaje completo si te apetece, sin obligación de grabarte.' },
  } } };
}
