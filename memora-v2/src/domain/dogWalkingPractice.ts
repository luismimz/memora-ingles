import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const dogWalkingSkill = 'dog-walking-prepared-v1';
export const dogWalkingIdentity = 'ing:prepared-dog-walking-v1';
export function dogWalkingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-outside-dog' || unit.grammarContinuation || unit.grammarLesson || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson || form.englishBase !== 'walk' || form.english !== 'walking' || form.spanish !== 'paseando'
    || unit.sentence.en !== "I'm walking my dog near the tree."
    || !Object.entries({ WALK: 'pasear', DOG: 'perro' }).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const message = 'I am walking my dog';
  return { id: dogWalkingSkill, title: 'Avisa de que ya estás paseando a tu perro', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Primero, quién actúa: YO se dice I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para decir «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'WALK es pasear en esta escena. Para contar que estás paseando ahora: I AM WALKING.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('paseando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('walking', 'verb')] },
    { caption: 'MY DOG: mi perro. MY indica que el perro es el tuyo.', es: [piece('MI ', 'context'), piece('PERRO', 'context')], en: [piece('MY ', 'context'), piece('DOG', 'context')] },
    { caption: 'WALKING MY DOG: paseando a mi perro. En este mensaje inglés el bloque es WALK MY DOG; no añadimos otra pieza para la «a» española.', es: [piece('paseando ', 'verb'), piece('a mi perro', 'context')], en: [piece('WALKING ', 'verb'), piece('MY DOG', 'context')] },
    { caption: "I AM WALKING MY DOG: estoy paseando a mi perro. I AM también se une como I'M. El paseo ya está ocurriendo, no estáis esperando para salir.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('paseando ', 'verb'), piece('a mi perro', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('walking ', 'verb'), piece('my dog', 'context')] },
  ], checks: [
    { id: 'dog-order-v1', kind: 'choose', prompt: 'Monta el aviso para que Nora sepa que ya estás paseando al perro.', ordering: [piece('MY DOG', 'context'), piece('WALKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + WALKING + MY DOG.', success: 'El aviso ya está montado.' },
    { id: 'dog-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que cuenta.', choices: ['Está paseando a su perro.', 'Espera quieto con su perro.'], answers: ['Está paseando a su perro.'], situation: { message, scenes: [{ choice: 'Está paseando a su perro.', state: 'walking-dog' }, { choice: 'Espera quieto con su perro.', state: 'waiting-dog' }] }, hint: 'WALKING MY DOG cuenta que está paseando al perro ahora, no esperando quieto.', success: 'Has entendido quién pasea y con qué animal.' },
    { id: 'dog-use-v1', kind: 'write', prompt: 'Avisa de que estás paseando a tu perro.', answers: [message, "I'm walking my dog"], hint: 'I + AM + WALKING + MY DOG.', success: 'Nora sabe que ya estás fuera con el perro.' },
  ] };
}
export function preparedDogWalkingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = dogWalkingLesson(unit, formId);
  if (!lesson || !['WALK', 'DOG'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am walking my dog.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy paseando a mi perro.', pronunciationTip: 'Escucha WALKING MY DOG completo; el puente español no sustituye el modelo inglés.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'walking', es: 'paseando', choices: ['walking', 'I'] }, { en: 'my dog.', es: 'a mi perro', choices: ['my dog.', 'walking'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Avisar de que ya paseas a tu perro para que Nora deje de buscarte dentro de casa.', userTurn: en, reply: 'I will join you outside.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora te busca dentro de casa para pasear al perro juntos. Tú ya estás paseándolo: avísale para que deje de buscarte dentro y salga a acompañarte.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'What are you doing?', es: '¿Qué estás haciendo?', acceptedAnswers: ['What are you doing?'] },
      { role: 'B', en, es: 'Estoy paseando a mi perro.', acceptedAnswers: [en, "I'm walking my dog."] },
    ], reply: { en: 'I will join you outside.', es: '¡Ya sé qué haces! Dejo de buscarte dentro y salgo a acompañarte.' }, rhythmTip: 'Puedes escuchar y repetir el aviso completo sin grabarte.' },
  } } };
}
