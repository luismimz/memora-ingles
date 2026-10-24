import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { dinnerCookingLesson, dinnerCookingSkill } from './dinnerCookingPractice';

export const kitchenLocationSkill = 'kitchen-location-prepared-v1';
export const kitchenLocationIdentity = 'ing:prepared-kitchen-location-v1';
export function kitchenLocationLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  if (!dinnerCookingLesson(unit, formId) || !unit.words.some((word) => word.en === 'KITCHEN' && word.es === 'cocina')) return null;
  const message = 'I am cooking in the kitchen';
  return { id: kitchenLocationSkill, title: 'Dile a Nora dónde estás cocinando', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'YO se dice I: haces visible quién actúa.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'YO ESTOY se expresa con I AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'La acción ya es conocida: I AM COOKING, estoy cocinando. Ahora vas a indicar dónde.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking', 'verb')] },
    { caption: 'THE KITCHEN: la cocina de esta casa, que Nora y tú conocéis. Aquí THE acompaña a KITCHEN para señalar esa cocina.', es: [piece('LA ', 'context'), piece('COCINA', 'context')], en: [piece('THE ', 'context'), piece('KITCHEN', 'context')] },
    { caption: 'IN THE KITCHEN: en la cocina, dentro de esa habitación. Este bloque indica el lugar; IN no traduce cualquier «en».', es: [piece('en la cocina', 'context')], en: [piece('IN THE KITCHEN', 'context')] },
    { caption: "I AM COOKING IN THE KITCHEN: estoy cocinando en la cocina. Puedes unir I AM como I'M. Ahora indicas dónde cocinas, no qué comida preparas.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando ', 'verb'), piece('en la cocina', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking ', 'verb'), piece('in the kitchen', 'context')] },
  ], checks: [
    { id: 'kitchen-order-v1', kind: 'choose', prompt: 'Monta el mensaje para que Nora sepa dónde encontrarte.', ordering: [piece('IN THE KITCHEN', 'context'), piece('COOKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + COOKING + IN THE KITCHEN. El último bloque indica tu lugar.', success: 'Ya puedes contar dónde estás cocinando.' },
    { id: 'kitchen-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que indica ese lugar.', choices: ['Está cocinando en la cocina.', 'Está cocinando en el jardín.'], answers: ['Está cocinando en la cocina.'], situation: { message, scenes: [{ choice: 'Está cocinando en la cocina.', state: 'kitchen-cooking' }, { choice: 'Está cocinando en el jardín.', state: 'garden-cooking' }] }, hint: 'Ambas personas cocinan. IN THE KITCHEN indica la cocina de la casa, no el jardín.', success: 'Has entendido dónde está cocinando.' },
    { id: 'kitchen-use-v1', kind: 'write', prompt: 'Dile a Nora que estás cocinando en la cocina.', answers: [message, "I'm cooking in the kitchen"], hint: 'I + AM + COOKING + IN THE KITCHEN.', success: 'Nora ya sabe dónde encontrarte.' },
  ] };
}

export function preparedKitchenLocationPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = kitchenLocationLesson(unit, formId);
  if (!lesson || !attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dinnerCookingSkill && attempt.kind === 'write' && attempt.correct && !attempt.helped)
    || !['COOK', 'DINNER', 'KITCHEN'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am cooking in the kitchen.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy cocinando en la cocina.', pronunciationTip: 'Escucha IN THE KITCHEN unido al mensaje.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'cooking', es: 'cocinando', choices: ['cooking', 'I'] }, { en: 'in the kitchen.', es: 'en la cocina', choices: ['in the kitchen.', 'cooking'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Contar dónde estás para que Nora te acerque un paño a la cocina.', userTurn: en, reply: 'I will bring the cloth to the kitchen.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora trae un paño limpio y no sabe dónde estás. Estás cocinando en la cocina: dile dónde encontrarte.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'Where are you cooking?', es: '¿Dónde estás cocinando?', acceptedAnswers: ['Where are you cooking?'] },
      { role: 'B', en, es: 'Estoy cocinando en la cocina.', acceptedAnswers: [en, "I'm cooking in the kitchen."] },
    ], reply: { en: 'I will bring the cloth to the kitchen.', es: '¡Ya sé dónde estás! Te acerco el paño a la cocina.' }, rhythmTip: 'Escucha y repite el mensaje completo si te apetece.' },
  } } };
}
