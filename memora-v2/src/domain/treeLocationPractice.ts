import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { dogWalkingLesson, dogWalkingSkill } from './dogWalkingPractice';

export const treeLocationSkill = 'tree-location-prepared-v1';
export const treeLocationIdentity = 'ing:prepared-tree-location-v1';
export function treeLocationLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  if (!dogWalkingLesson(unit, formId) || !unit.words.some((word) => word.en === 'TREE' && word.es === 'árbol')) return null;
  const message = 'I am walking my dog near the tree';
  return { id: treeLocationSkill, title: 'Dile a Nora dónde alcanzaros con el agua', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'YO se dice I: haces visible quién actúa.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'YO ESTOY se expresa con I AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'La acción ya es conocida: I AM WALKING MY DOG, estoy paseando a mi perro. Ahora vas a indicar dónde.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('paseando ', 'verb'), piece('a mi perro', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('walking ', 'verb'), piece('my dog', 'context')] },
    { caption: 'THE TREE: el árbol que Nora y tú conocéis. THE acompaña aquí a TREE para señalar ese árbol.', es: [piece('EL ', 'context'), piece('ÁRBOL', 'context')], en: [piece('THE ', 'context'), piece('TREE', 'context')] },
    { caption: 'NEAR THE TREE: cerca del árbol, sin estar necesariamente pegado al tronco. El bloque indica dónde estáis paseando.', es: [piece('cerca del árbol', 'context')], en: [piece('NEAR THE TREE', 'context')] },
    { caption: "I AM WALKING MY DOG NEAR THE TREE: estoy paseando a mi perro cerca del árbol. I AM también se une como I'M. El bloque final indica el lugar.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('paseando ', 'verb'), piece('a mi perro ', 'context'), piece('cerca del árbol', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('walking ', 'verb'), piece('my dog ', 'context'), piece('near the tree', 'context')] },
  ], checks: [
    { id: 'tree-order-v1', kind: 'choose', prompt: 'Monta el mensaje para que Nora sepa dónde alcanzaros.', ordering: [piece('NEAR THE TREE', 'context'), piece('MY DOG', 'context'), piece('WALKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + WALKING + MY DOG + NEAR THE TREE.', success: 'El mensaje ya indica dónde estáis.' },
    { id: 'tree-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que indica ese lugar.', choices: ['Pasea a su perro cerca del árbol.', 'Pasea a su perro lejos del árbol.'], answers: ['Pasea a su perro cerca del árbol.'], situation: { message, scenes: [{ choice: 'Pasea a su perro cerca del árbol.', state: 'tree-near-walking' }, { choice: 'Pasea a su perro lejos del árbol.', state: 'tree-far-walking' }] }, hint: 'Ambas personas pasean a su perro. NEAR THE TREE indica cerca del árbol, no lejos de él.', success: 'Has entendido la proximidad al árbol.' },
    { id: 'tree-use-v1', kind: 'write', prompt: 'Dile a Nora que paseas a tu perro cerca del árbol.', answers: [message, "I'm walking my dog near the tree"], hint: 'I + AM + WALKING + MY DOG + NEAR THE TREE.', success: 'Nora ya sabe dónde encontraros.' },
  ] };
}
export function preparedTreeLocationPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = treeLocationLesson(unit, formId);
  if (!lesson || !attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dogWalkingSkill && attempt.kind === 'write' && attempt.correct && !attempt.helped)
    || !['WALK', 'DOG', 'TREE'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am walking my dog near the tree.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy paseando a mi perro cerca del árbol.', pronunciationTip: 'Escucha NEAR THE TREE dentro del mensaje completo.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'walking', es: 'paseando', choices: ['walking', 'I'] }, { en: 'my dog', es: 'a mi perro', choices: ['my dog', 'walking'] }, { en: 'near the tree.', es: 'cerca del árbol', choices: ['near the tree.', 'my dog'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Contar dónde paseas al perro para que Nora os alcance con agua.', userTurn: en, reply: 'I will bring water to the tree.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora quiere alcanzaros con agua para el perro. Estás paseándolo cerca del árbol conocido: dile dónde encontraros.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'Where are you walking your dog?', es: '¿Dónde estás paseando a tu perro?', acceptedAnswers: ['Where are you walking your dog?'] },
      { role: 'B', en, es: 'Estoy paseando a mi perro cerca del árbol.', acceptedAnswers: [en, "I'm walking my dog near the tree."] },
    ], reply: { en: 'I will bring water to the tree.', es: '¡Ya sé dónde estáis! Me acerco al árbol con el agua para el perro.' }, rhythmTip: 'Puedes escuchar y repetir el mensaje por bloques sin grabarte.' },
  } } };
}
