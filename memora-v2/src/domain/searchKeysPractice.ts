import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const searchKeysIdentity = 'looking-for:prepared-keys-v1';
export const searchKeysSkill = 'search-keys-prepared-v1';
/** One reviewed code-authored application, not a catalogue approval or scheduler. */
export function searchKeysLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-entry-keys' || unit.grammarContinuation || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'looking-for' || form.lesson?.id !== 'looking-for-now' || form.englishBase !== 'look'
    || form.english !== 'looking' || form.spanish !== 'buscando' || unit.sentence.en !== "I'm looking for my keys."
    || !form.lesson.checks.some((check) => check.id === 'teach' && check.answers.includes("Falta AM: I AM se junta en I'M."))) return null;
  const senses = { KEY: 'llave', PHONE: 'móvil' };
  if (!Object.entries(senses).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const model = 'I am looking for my keys';
  return { id: searchKeysSkill, title: 'Encuentra tus llaves', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Empieza por quién busca: YO. En inglés, I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para decir «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'LOOKING FOR cuenta que estás buscando. En este mensaje, las dos palabras viajan juntas.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('buscando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('looking for', 'verb')] },
    { caption: 'MY indica «mi» o «mis». Aquí hablamos de tus propias llaves: MIS llaves.', es: [piece('MIS', 'context')], en: [piece('MY', 'context')] },
    { caption: 'Ya conoces KEY: una llave. KEYS, con S, son varias llaves; no es otra palabra básica.', es: [piece('una llave → varias llaves', 'context')], en: [piece('key → keys', 'context')] },
    { caption: "Junta las piezas. I AM también se puede unir como I'M. Este mensaje permite que alguien te ayude a buscar.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('buscando ', 'verb'), piece('mis llaves', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('looking for ', 'verb'), piece('my keys', 'context')] },
  ], checks: [
    { id: 'search-order-v1', kind: 'choose', prompt: 'Monta el mensaje para pedir ayuda con tus llaves.', ordering: [piece('MY', 'context'), piece('KEYS', 'context'), piece('LOOKING FOR', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [model], hint: 'Quién: I. Estoy: AM. Buscando: LOOKING FOR. Mis llaves: MY KEYS.', success: 'El mensaje está montado con sus piezas.' },
    { id: 'search-meaning-v1', kind: 'explain', prompt: '¿Qué busca la persona que envía el mensaje?', choices: ['Busca sus llaves.', 'Busca su móvil.'], answers: ['Busca sus llaves.'], situation: { message: model, scenes: [{ choice: 'Busca sus llaves.', state: 'search-keys' }, { choice: 'Busca su móvil.', state: 'search-phone' }] }, hint: 'MY KEYS son mis llaves. El mensaje no habla del móvil.', success: 'Has entendido qué objeto busca.' },
    { id: 'search-use-v1', kind: 'write', prompt: 'Avisa al personaje de que estás buscando tus llaves.', answers: [model, "I'm looking for my keys"], hint: 'I + AM + LOOKING FOR + MY + KEYS. También puedes unir I AM en I’M.', success: 'El personaje ya sabe qué necesitas encontrar.' },
  ] };
}

export function preparedSearchKeysPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = searchKeysLesson(unit, formId);
  if (!lesson || !['KEY', 'PHONE'].every((en) => {
    const word = unit.words.find((item) => item.en === en)!;
    return memories.some((memory) => practicedWordMeaning(memory, word));
  })) return null;
  const en = 'I am looking for my keys.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy buscando mis llaves.', pronunciationTip: 'Escucha LOOKING FOR como un bloque y MY KEYS como otro.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] },
    { en: 'looking for', es: 'buscando', choices: ['looking for', 'my'] }, { en: 'my', es: 'mis', choices: ['my', 'am'] }, { en: 'keys.', es: 'llaves', choices: ['keys.', 'looking for'] },
  ] }, practiceSentences: [], communication: {
    layer: 'converse', interlocutor: 'Nora', intent: 'Avisar de que buscas tus llaves para que Nora te ayude a encontrarlas.', userTurn: en, reply: 'I will help you find your keys.', replyMode: 'receptive_chunk',
    dialogue: { context: 'Nora puede ayudarte antes de salir. Dile que estás buscando tus llaves, no el móvil.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'What are you looking for?', es: '¿Qué estás buscando?', acceptedAnswers: ['What are you looking for?'] },
      { role: 'B', en, es: 'Estoy buscando mis llaves.', acceptedAnswers: [en, "I'm looking for my keys."] },
    ], reply: { en: 'I will help you find your keys.', es: '¡Voy a ayudarte a buscar las llaves! El móvil puede esperar.' }, rhythmTip: 'Escucha el mensaje completo si te apetece.' },
  } } };
}
