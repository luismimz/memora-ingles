import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const bedMakingIdentity = 'ing:prepared-bed-v1';
export const bedMakingSkill = 'bed-making-prepared-v1';
export function bedMakingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-bedroom-bed' || unit.grammarContinuation || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson?.id !== 'make-drop-e' || form.englishBase !== 'make'
    || form.english !== 'making' || form.englishRoot !== 'mak' || form.englishNut !== 'ing' || form.spanish !== 'haciendo'
    || unit.sentence.en !== "I'm making my bed with a pillow."
    || !form.lesson.checks.some((check) => check.id === 'explain' && check.answers.includes('Se apartó antes de ING.'))) return null;
  if (!Object.entries({ MAKE: 'hacer', BED: 'cama', PILLOW: 'almohada' }).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const message = 'I am making my bed';
  return { id: bedMakingSkill, title: 'Prepara tu cama', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Primero, quién actúa: YO se dice I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'MY indica «mi» o «mis». MY BED es mi cama.', es: [piece('MI ', 'context'), piece('CAMA', 'context')], en: [piece('MY ', 'context'), piece('BED', 'context')] },
    { caption: 'MAKE MY BED significa «hacer mi cama»: aquí no se trata de fabricar una cama nueva.', es: [piece('hacer ', 'verb'), piece('mi cama', 'context')], en: [piece('make ', 'verb'), piece('my bed', 'context')] },
    { caption: 'Está ocurriendo ahora: I AM MAKING MY BED. En MAKE → MAKING se quita la E escrita antes de ING.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('haciendo ', 'verb'), piece('mi cama', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('making ', 'verb'), piece('my bed', 'context')] },
    { caption: "I AM también se une como I'M. Es el mismo mensaje: estás haciendo tu cama.", es: [piece('Estoy ', 'auxiliary'), piece('haciendo ', 'verb'), piece('mi cama', 'context')], en: [piece("I'm ", 'auxiliary'), piece('making ', 'verb'), piece('my bed', 'context')] },
  ], checks: [
    { id: 'bed-order-v1', kind: 'choose', prompt: 'Monta el mensaje para contar qué estás haciendo.', ordering: [piece('BED', 'context'), piece('MY', 'context'), piece('MAKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + MAKING + MY + BED. MAKE cambia a MAKING en este mensaje.', success: 'El mensaje está montado con sus piezas.' },
    { id: 'bed-meaning-v1', kind: 'explain', prompt: '¿Qué está haciendo la persona que envía el mensaje?', choices: ['Está haciendo su cama.', 'Está descansando en la cama.'], answers: ['Está haciendo su cama.'], situation: { message, scenes: [{ choice: 'Está haciendo su cama.', state: 'making-bed' }, { choice: 'Está descansando en la cama.', state: 'resting-bed' }] }, hint: 'MAKING MY BED cuenta que está haciendo su cama, no descansando en ella.', success: 'Has entendido la acción que cuenta el mensaje.' },
    { id: 'bed-use-v1', kind: 'write', prompt: 'Avisa de que estás haciendo tu cama.', answers: [message, "I'm making my bed"], hint: "I + AM + MAKING + MY + BED. También puedes usar I'M.", success: 'El personaje ya sabe qué estás haciendo.' },
  ] };
}

export function preparedBedMakingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = bedMakingLesson(unit, formId);
  if (!lesson || !['MAKE', 'BED', 'PILLOW'].every((en) => {
    const word = unit.words.find((item) => item.en === en)!;
    return memories.some((memory) => practicedWordMeaning(memory, word));
  })) return null;
  const en = 'I am making my bed.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy haciendo mi cama.', pronunciationTip: 'Escucha MAKING dentro del mensaje completo.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] },
    { en: 'making', es: 'haciendo', choices: ['making', 'my'] }, { en: 'my', es: 'mi', choices: ['my', 'am'] }, { en: 'bed.', es: 'cama', choices: ['bed.', 'making'] },
  ] }, practiceSentences: [], communication: {
    layer: 'converse', interlocutor: 'Nora', intent: 'Contar que estás haciendo tu cama para que Nora deje la almohada a tu alcance.', userTurn: en, reply: 'I will leave the pillow here.', replyMode: 'receptive_chunk',
    dialogue: { context: 'Nora trae una almohada limpia. Dile qué estás haciendo para que sepa dónde dejarla.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'What are you doing?', es: '¿Qué estás haciendo?', acceptedAnswers: ['What are you doing?'] },
      { role: 'B', en, es: 'Estoy haciendo mi cama.', acceptedAnswers: [en, "I'm making my bed."] },
    ], reply: { en: 'I will leave the pillow here.', es: '¡Perfecto! Dejo la almohada a tu lado para que termines de hacer la cama.' }, rhythmTip: 'Escucha el mensaje completo y repítelo si te apetece.' },
  } } };
}
