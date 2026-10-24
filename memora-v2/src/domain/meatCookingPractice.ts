import type { AtomicUnit } from './unit';
import type { UnitSummary } from '../services/directus';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { dinnerCookingSkill } from './dinnerCookingPractice';

export const meatCookingSkill = 'meat-cooking-prepared-v1';
export const meatCookingIdentity = 'ing:prepared-meat-cooking-v1';

/** The received food scene lacks COOK among its words. Never fill that gap from a key alone. */
export function meatCookingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-kitchen-pan' || unit.grammarContinuation || unit.grammarLesson || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson || form.englishBase !== 'cook' || form.english !== 'cooking' || form.spanish !== 'cocinando'
    || unit.sentence.en !== "I'm cooking meat and eggs in a pan."
    || !unit.words.some((word) => word.en === 'MEAT' && word.es === 'carne')) return null;
  const message = 'I am cooking meat';
  return { id: meatCookingSkill, title: 'Cuenta qué cocinas para que Nora prepare el acompañamiento', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'YO se dice I: señalas quién cocina.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para decir «yo estoy», junta I AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'La acción ya está preparada: I AM COOKING, estoy cocinando. Ahora vas a decir qué cocinas.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking', 'verb')] },
    { caption: 'MEAT significa carne. En este mensaje hablas de carne como alimento, sin añadir A delante.', es: [piece('carne', 'context')], en: [piece('MEAT', 'context')] },
    { caption: 'COOKING MEAT: cocinando carne. El bloque final concreta qué estás preparando.', es: [piece('cocinando ', 'verb'), piece('carne', 'context')], en: [piece('COOKING ', 'verb'), piece('MEAT', 'context')] },
    { caption: "I AM COOKING MEAT: estoy cocinando carne. I AM también se une como I'M. No dice que la carne esté guardada sin cocinar.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('cocinando ', 'verb'), piece('carne', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('cooking ', 'verb'), piece('meat', 'context')] },
  ], checks: [
    { id: 'meat-order-v1', kind: 'choose', prompt: 'Monta el mensaje para coordinar la comida con Nora.', ordering: [piece('MEAT', 'context'), piece('COOKING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + COOKING + MEAT.', success: 'El mensaje ya cuenta qué cocinas.' },
    { id: 'meat-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a la escena que cuenta.', choices: ['Está cocinando carne.', 'La carne sigue guardada sin cocinar.'], answers: ['Está cocinando carne.'], situation: { message, scenes: [{ choice: 'Está cocinando carne.', state: 'meat-cooking' }, { choice: 'La carne sigue guardada sin cocinar.', state: 'meat-stored' }] }, hint: 'COOKING MEAT cuenta una acción en marcha. La carne guardada todavía no se está cocinando.', success: 'Has entendido qué alimento está cocinando.' },
    { id: 'meat-use-v1', kind: 'write', prompt: 'Cuenta a Nora que estás cocinando carne.', answers: [message, "I'm cooking meat"], hint: 'I + AM + COOKING + MEAT.', success: 'Nora puede preparar el acompañamiento.' },
  ] };
}

export interface MeatPreparationTarget { unitId: string; mode: 'vocabulary' | 'grammar'; label: string }
export interface MeatPreparation { status: 'catalogue' | 'cook' | 'meat' | 'dinner' | 'ready'; caption: string; target?: MeatPreparationTarget }
export function meatCookingPreparation(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[], sources: readonly UnitSummary[]): MeatPreparation {
  if (!meatCookingLesson(unit, formId)) return { status: 'catalogue', caption: 'Esta versión de la escena necesita revisión. Tu progreso se conserva.' };
  const source = sources.find((candidate) => candidate.id === 'm1-test-kitchen' && candidate.sentence?.en === "I'm cooking dinner in the kitchen.");
  const cook = source?.words?.find((word) => word.en === 'COOK' && word.es === 'cocinar');
  if (!cook || !(cook.associationId && cook.associationVersion !== undefined || cook.bridge && cook.scene && cook.ipa)) return { status: 'catalogue', caption: 'Falta la ficha actual de COOK: cocinar. No vamos a adivinarla ni cambiar lo que ya has hecho. Puedes seguir con otras palabras.' };
  const cookedMeaning = memories.some((memory) => practicedWordMeaning(memory, cook) && memory.word.associationMode === cook.associationMode
    && (cook.associationId && cook.associationVersion !== undefined
      ? true
      : Boolean(cook.bridge && cook.scene && cook.ipa && memory.word.associationId === cook.associationId && memory.word.associationVersion === cook.associationVersion
        && memory.word.bridge === cook.bridge && memory.word.scene === cook.scene && memory.word.ipa === cook.ipa)));
  if (!cookedMeaning) return { status: 'cook', caption: 'Primero vamos a preparar COOK: cocinar, con su historia y sonido actuales. Después podrás aplicarlo a la carne.', target: { unitId: source!.id, mode: 'vocabulary', label: 'Preparar COOK: cocinar' } };
  if (!memories.some((memory) => practicedWordMeaning(memory, unit.words.find((word) => word.en === 'MEAT')!))) return { status: 'meat', caption: 'La acción ya está preparada. Ahora vamos con MEAT: carne, su historia y su sonido.', target: { unitId: unit.id, mode: 'vocabulary', label: 'Preparar MEAT: carne' } };
  if (!attempts.some((attempt) => attempt.unitId === source!.id && attempt.skill === dinnerCookingSkill && attempt.kind === 'write' && attempt.correct && !attempt.helped)) return { status: 'dinner', caption: 'Ya tienes las palabras. Practica primero el aviso de la cena: así podrás aplicar lo que haces ahora a otro alimento.', target: { unitId: source!.id, mode: 'grammar', label: 'Practicar el aviso de la cena' } };
  return { status: 'ready', caption: 'Palabras y aplicación anterior preparadas.' };
}

export function preparedMeatCookingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[], sources: readonly UnitSummary[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = meatCookingLesson(unit, formId);
  if (!lesson || meatCookingPreparation(unit, formId, memories, attempts, sources).status !== 'ready') return null;
  const en = 'I am cooking meat.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy cocinando carne.', pronunciationTip: 'Escucha MEAT dentro del mensaje completo; MITIN es solo un apoyo para recordar.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] }, { en: 'cooking', es: 'cocinando', choices: ['cooking', 'I'] }, { en: 'meat.', es: 'carne', choices: ['meat.', 'cooking'] },
  ] }, practiceSentences: [], communication: { layer: 'converse', interlocutor: 'Nora', intent: 'Coordinar qué cocinas y qué prepara Nora para acompañarlo.', userTurn: en, reply: 'I will prepare something to go with it.', replyMode: 'receptive_chunk', dialogue: {
    context: 'Nora va a preparar el acompañamiento. Antes necesita saber qué estás cocinando: cuéntale que es carne.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'What are you cooking?', es: '¿Qué estás cocinando?', acceptedAnswers: ['What are you cooking?'] },
      { role: 'B', en, es: 'Estoy cocinando carne.', acceptedAnswers: [en, "I'm cooking meat."] },
    ], reply: { en: 'I will prepare something to go with it.', es: '¡Entonces preparo el acompañamiento para la carne! Tú puedes seguir cocinando.' }, rhythmTip: 'Puedes escuchar y repetir el mensaje sin grabarte.' },
  } } };
}
