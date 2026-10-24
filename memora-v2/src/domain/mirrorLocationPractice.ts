import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { teethBrushingLesson, teethBrushingSkill } from './teethBrushingPractice';

export const mirrorLocationSkill = 'mirror-location-prepared-v1';
export const mirrorLocationIdentity = 'ing:prepared-mirror-location-v1';
export function mirrorLocationLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  if (!teethBrushingLesson(unit, formId) || !unit.words.some((word) => word.en === 'MIRROR' && word.es === 'espejo')) return null;
  const message = 'I am brushing my teeth by the mirror';
  return { id: mirrorLocationSkill, title: 'Dile a Nora dónde dejarte el peine', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'YO se dice I: haces visible quién actúa.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'YO ESTOY se expresa con I AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'La acción ya es conocida: I AM BRUSHING MY TEETH, me estoy cepillando los dientes. Ahora vas a indicar dónde.', es: [piece('Yo ', 'subject'), piece('me estoy ', 'auxiliary'), piece('cepillando ', 'verb'), piece('los dientes', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('brushing ', 'verb'), piece('my teeth', 'context')] },
    { caption: 'THE MIRROR: el espejo del baño, que Nora y tú conocéis. THE acompaña aquí a MIRROR para señalar ese espejo.', es: [piece('EL ', 'context'), piece('ESPEJO', 'context')], en: [piece('THE ', 'context'), piece('MIRROR', 'context')] },
    { caption: 'BY THE MIRROR: junto al espejo, cerca de él. Este bloque indica proximidad; BY no significa siempre «junto a» ni traduce cualquier «por».', es: [piece('junto al espejo', 'context')], en: [piece('BY THE MIRROR', 'context')] },
    { caption: "I AM BRUSHING MY TEETH BY THE MIRROR: me estoy cepillando los dientes junto al espejo. Puedes unir I AM como I'M. El bloque final indica el lugar.", es: [piece('Yo ', 'subject'), piece('me estoy ', 'auxiliary'), piece('cepillando ', 'verb'), piece('los dientes ', 'context'), piece('junto al espejo', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('brushing ', 'verb'), piece('my teeth ', 'context'), piece('by the mirror', 'context')] },
  ], checks: [
    { id: 'mirror-order-v1', kind: 'choose', prompt: 'Monta el aviso para que Nora sepa dónde dejarte el peine.', ordering: [piece('BY THE MIRROR', 'context'), piece('MY TEETH', 'context'), piece('BRUSHING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + BRUSHING + MY TEETH + BY THE MIRROR.', success: 'El mensaje ya indica dónde estás.' },
    { id: 'mirror-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que indica ese lugar.', choices: ['Se cepilla los dientes junto al espejo.', 'Se cepilla los dientes junto a la ventana.'], answers: ['Se cepilla los dientes junto al espejo.'], situation: { message, scenes: [{ choice: 'Se cepilla los dientes junto al espejo.', state: 'mirror-brushing' }, { choice: 'Se cepilla los dientes junto a la ventana.', state: 'window-brushing' }] }, hint: 'Ambas personas se cepillan los dientes. BY THE MIRROR indica el espejo, no la ventana.', success: 'Has entendido junto a qué objeto está.' },
    { id: 'mirror-use-v1', kind: 'write', prompt: 'Dile a Nora que te cepillas los dientes junto al espejo.', answers: [message, "I'm brushing my teeth by the mirror"], hint: 'I + AM + BRUSHING + MY TEETH + BY THE MIRROR.', success: 'Nora ya sabe dónde dejarte el peine.' },
  ] };
}
export function preparedMirrorLocationPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = mirrorLocationLesson(unit, formId);
  if (!lesson || !attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === teethBrushingSkill && attempt.kind === 'write' && attempt.correct && !attempt.helped)
    || !['BRUSH', 'TEETH', 'MIRROR'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am brushing my teeth by the mirror.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Me estoy cepillando los dientes junto al espejo.', pronunciationTip: 'Escucha BY THE MIRROR dentro del mensaje completo.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'me estoy', choices: ['am', 'I'] }, { en: 'brushing', es: 'cepillando', choices: ['brushing', 'I'] }, { en: 'my teeth', es: 'los dientes', choices: ['my teeth', 'brushing'] }, { en: 'by the mirror.', es: 'junto al espejo', choices: ['by the mirror.', 'my teeth'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Contar dónde estás para que Nora deje el peine junto al espejo.', userTurn: en, reply: 'I will leave the comb by the mirror.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora busca dónde dejarte el peine limpio. Te estás cepillando los dientes junto al espejo: dile dónde estás para tenerlo a mano después.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'Where are you brushing your teeth?', es: '¿Dónde te estás cepillando los dientes?', acceptedAnswers: ['Where are you brushing your teeth?'] },
      { role: 'B', en, es: 'Me estoy cepillando los dientes junto al espejo.', acceptedAnswers: [en, "I'm brushing my teeth by the mirror."] },
    ], reply: { en: 'I will leave the comb by the mirror.', es: '¡Entendido! Dejo el peine junto al espejo para que lo tengas a mano después.' }, rhythmTip: 'Escucha el mensaje por bloques, sin obligación de grabarte.' },
  } } };
}
