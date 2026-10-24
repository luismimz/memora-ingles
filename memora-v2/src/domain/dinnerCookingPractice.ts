import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const dinnerCookingSkill = 'dinner-cooking-prepared-v1';
export const dinnerCookingIdentity = 'ing:prepared-dinner-v1';

/** Exact received kitchen contract only; no editorial activation or new lexeme. */
export function dinnerCookingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-test-kitchen' || unit.grammarContinuation || unit.grammarLesson || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson || form.englishBase !== 'cook' || form.english !== 'cooking' || form.spanish !== 'cocinando'
    || unit.sentence.en !== "I'm cooking dinner in the kitchen."
    || !Object.entries({ COOK: 'cocinar', DINNER: 'cena' }).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const message = 'I am cooking dinner';
  return { id: dinnerCookingSkill, title: 'Avisa para que Nora no encargue otra cena', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Primero, quién actúa: YO se dice I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para decir «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'COOK es cocinar. Para contar que estás cocinando ahora: I AM COOKING.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking', 'verb')] },
    { caption: 'DINNER es la cena en esta escena. También puede nombrar la comida principal del día: no indica una hora fija.', es: [piece('la cena', 'context')], en: [piece('DINNER', 'context')] },
    { caption: 'COOKING DINNER: cocinando la cena. El bloque cuenta qué preparas y se conserva así en este mensaje.', es: [piece('cocinando ', 'verb'), piece('la cena', 'context')], en: [piece('COOKING ', 'verb'), piece('DINNER', 'context')] },
    { caption: "I AM COOKING DINNER: estoy cocinando la cena. I AM también se une como I'M. La cena todavía se está preparando, no está ya servida.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando ', 'verb'), piece('la cena', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking ', 'verb'), piece('dinner', 'context')] },
  ], checks: [
    { id: 'dinner-order-v1', kind: 'choose', prompt: 'Monta el aviso para que Nora no encargue otra cena.', ordering: [piece('DINNER', 'context'), piece('COOKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + COOKING + DINNER. El último bloque cuenta qué preparas.', success: 'El aviso ya está montado.' },
    { id: 'dinner-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que cuenta.', choices: ['Está cocinando la cena.', 'La cena ya está servida.'], answers: ['Está cocinando la cena.'], situation: { message, scenes: [{ choice: 'Está cocinando la cena.', state: 'cooking-dinner' }, { choice: 'La cena ya está servida.', state: 'dinner-served' }] }, hint: 'COOKING DINNER cuenta que está preparando la cena ahora. No dice que ya esté servida.', success: 'Has entendido que la cena sigue preparándose.' },
    { id: 'dinner-use-v1', kind: 'write', prompt: 'Avisa de que estás cocinando la cena.', answers: [message, "I'm cooking dinner"], hint: 'I + AM + COOKING + DINNER.', success: 'Nora sabe que no hace falta encargar otra cena.' },
  ] };
}

export function preparedDinnerCookingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = dinnerCookingLesson(unit, formId);
  if (!lesson || !['COOK', 'DINNER'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am cooking dinner.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy cocinando la cena.', pronunciationTip: 'Escucha COOKING DINNER como parte del mensaje.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'cooking', es: 'cocinando', choices: ['cooking', 'I'] }, { en: 'dinner.', es: 'la cena', choices: ['dinner.', 'cooking'] },
  ] }, practiceSentences: [], communication: {
    layer: 'converse', interlocutor: 'Nora', intent: 'Avisar de que preparas la cena para que Nora no encargue otra comida.', userTurn: en, reply: 'I will not order another dinner.', replyMode: 'receptive_chunk',
    dialogue: { context: 'Nora tiene el móvil listo para encargar comida. Estás cocinando la cena: avísale para que no pida otra.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'What are you cooking?', es: '¿Qué estás cocinando?', acceptedAnswers: ['What are you cooking?'] },
      { role: 'B', en, es: 'Estoy cocinando la cena.', acceptedAnswers: [en, "I'm cooking dinner."] },
    ], reply: { en: 'I will not order another dinner.', es: '¡Entendido! No encargo otra cena: guardo el móvil y espero a que termines.' }, rhythmTip: 'Puedes escuchar y repetir el mensaje completo, sin obligación de grabarte.' },
  } } };
}
