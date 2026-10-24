import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const teethBrushingSkill = 'teeth-brushing-prepared-v1';
export const teethBrushingIdentity = 'ing:prepared-teeth-v1';
export function teethBrushingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-bathroom-brush' || unit.grammarContinuation || unit.grammarLesson || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson || form.englishBase !== 'brush' || form.english !== 'brushing' || form.spanish !== 'cepillando'
    || unit.sentence.en !== "I'm brushing my teeth by the mirror."
    || !Object.entries({ BRUSH: 'cepillar', TEETH: 'dientes' }).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const message = 'I am brushing my teeth';
  return { id: teethBrushingSkill, title: 'Avisa antes de que Nora te acerque la merienda', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Primero, quién actúa: YO se dice I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para decir «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'BRUSH es cepillar. Para contar que estás cepillando ahora: I AM BRUSHING.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cepillando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('brushing', 'verb')] },
    { caption: 'MY TEETH significa «mis dientes». TEETH nombra varios dientes; este paso no te pide el singular. MY indica que son los tuyos.', es: [piece('MIS ', 'context'), piece('DIENTES', 'context')], en: [piece('MY ', 'context'), piece('TEETH', 'context')] },
    { caption: 'BRUSHING MY TEETH: cepillándome los dientes. En español natural decimos «me cepillo los dientes»; en este mensaje inglés conservamos MY TEETH.', es: [piece('cepillándome ', 'verb'), piece('los dientes', 'context')], en: [piece('BRUSHING ', 'verb'), piece('MY TEETH', 'context')] },
    { caption: "I AM BRUSHING MY TEETH: me estoy cepillando los dientes. I AM también se une como I'M. No basta con que el cepillo esté preparado: la acción está ocurriendo.", es: [piece('Yo ', 'subject'), piece('me estoy ', 'auxiliary'), piece('cepillando ', 'verb'), piece('los dientes', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('brushing ', 'verb'), piece('my teeth', 'context')] },
  ], checks: [
    { id: 'teeth-order-v1', kind: 'choose', prompt: 'Monta el aviso para que Nora guarde la merienda para después.', ordering: [piece('MY TEETH', 'context'), piece('BRUSHING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + BRUSHING + MY TEETH.', success: 'El aviso ya está montado.' },
    { id: 'teeth-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que cuenta.', choices: ['Se está cepillando los dientes.', 'El cepillo sigue en el vaso.'], answers: ['Se está cepillando los dientes.'], situation: { message, scenes: [{ choice: 'Se está cepillando los dientes.', state: 'brushing' }, { choice: 'El cepillo sigue en el vaso.', state: 'brush-ready' }] }, hint: 'BRUSHING MY TEETH cuenta que se está cepillando los dientes, no que el cepillo sigue guardado.', success: 'Has entendido la acción y qué se está cepillando.' },
    { id: 'teeth-use-v1', kind: 'write', prompt: 'Avisa de que te estás cepillando los dientes.', answers: [message, "I'm brushing my teeth"], hint: 'I + AM + BRUSHING + MY TEETH.', success: 'Nora sabe que debe guardar la merienda para después.' },
  ] };
}
export function preparedTeethBrushingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = teethBrushingLesson(unit, formId);
  if (!lesson || !['BRUSH', 'TEETH'].every((en) => memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === en)!)))) return null;
  const en = 'I am brushing my teeth.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Me estoy cepillando los dientes.', pronunciationTip: 'Escucha BRUSHING MY TEETH en el mensaje inglés; el puente español no sustituye su sonido.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'me estoy', choices: ['am', 'I'] }, { en: 'brushing', es: 'cepillando', choices: ['brushing', 'I'] }, { en: 'my teeth.', es: 'los dientes', choices: ['my teeth.', 'brushing'] },
  ] }, practiceSentences: [], communication: {
    layer: 'converse', interlocutor: 'Nora', intent: 'Avisar de que te cepillas los dientes para que Nora guarde la merienda para después.', userTurn: en, reply: 'I will save the snack for later.', replyMode: 'receptive_chunk', dialogue: {
      context: 'Nora se acerca para ofrecerte la merienda. Te estás cepillando los dientes: avísale para que la guarde para después.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
        { role: 'A', en: 'What are you doing?', es: '¿Qué estás haciendo?', acceptedAnswers: ['What are you doing?'] },
        { role: 'B', en, es: 'Me estoy cepillando los dientes.', acceptedAnswers: [en, "I'm brushing my teeth."] },
      ], reply: { en: 'I will save the snack for later.', es: '¡Vale! Guardo la merienda para después, hasta que termines.' }, rhythmTip: 'Puedes escuchar y repetir el mensaje, sin evaluación fonética automática.' },
  } } };
}
