import type { GrammarForm } from './unit';
import { normalizeSentenceAnswer } from './sentenceAnswer';

export interface LessonPiece { text: string; role: 'subject' | 'auxiliary' | 'verb' | 'change' | 'context' }
export interface LessonStep { caption: string; es: LessonPiece[]; en: LessonPiece[]; captionMarks?: LessonPiece[]; hideEnglish?: boolean; advanceLabel?: string }
export type SituationState = 'playing' | 'waiting' | 'brushing' | 'brush-ready' | 'cooking' | 'cook-ready' | 'search-keys' | 'search-phone' | 'making-bed' | 'resting-bed' | 'computer-playing' | 'console-playing';
export interface LessonCheck {
  id: string;
  kind: 'choose' | 'explain' | 'write';
  prompt: string;
  choices?: string[];
  answers: string[];
  hint: string;
  success: string;
  situation?: { message: string; scenes: { choice: string; state: SituationState }[] };
  /** Authored shuffled pieces; reconstruction remains assisted practice. */
  ordering?: LessonPiece[];
}
export interface GrammarLessonData { id: string; title: string; language: 'en'; steps: LessonStep[]; checks: LessonCheck[]; advanceMode?: 'manual' | 'automatic' }
export const piece = (text: string, role: LessonPiece['role'] = 'context'): LessonPiece => ({ text, role });

/** Defer only a written task that will actually be answered in this chat. */
export function grammarChecksForExperience(lesson: GrammarLessonData, conversationAnswers: string[] = [], constructionAnswers: string[] = []): LessonCheck[] {
  const practiced = new Set(conversationAnswers.map(normalizeSentenceAnswer));
  const constructed = new Set(constructionAnswers.map(normalizeSentenceAnswer));
  return lesson.checks.filter((check) => !(check.kind === 'write' && check.answers.some((answer) => practiced.has(normalizeSentenceAnswer(answer))))
    && !(check.ordering && check.answers.some((answer) => constructed.has(normalizeSentenceAnswer(answer)))));
}

export function validateGrammarLesson(value: GrammarLessonData): void {
  if (value?.advanceMode !== undefined && !['manual', 'automatic'].includes(value.advanceMode)) throw new Error('El ritmo del truco no es válido.');
  if (!value?.id?.trim() || !value.title?.trim() || value.language !== 'en' || !Array.isArray(value.steps) || !value.steps.length || value.steps.length > 6 || !Array.isArray(value.checks) || !value.checks.length) throw new Error('El truco necesita demostración y práctica revisadas.');
  for (const step of value.steps) {
    if (step.hideEnglish !== undefined && typeof step.hideEnglish !== 'boolean' || step.advanceLabel !== undefined && !step.advanceLabel.trim()) throw new Error('La revelación del truco necesita un botón y un estado válidos.');
    if (!step.caption?.trim() || step.caption.split(/\s+/).length > 35) throw new Error('Cada paso explica una sola idea en un máximo de 35 palabras.');
    for (const row of [step.es, step.en]) if (!Array.isArray(row) || !row.length || row.some((part) => !part.text?.trim() || !['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role))) throw new Error('La transformación requiere piezas explícitas, no terminaciones adivinadas.');
    if (step.captionMarks && (!Array.isArray(step.captionMarks) || step.captionMarks.length > 12 || step.captionMarks.some((part) => !part.text?.trim() || !step.caption.includes(part.text) || !['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role)))) throw new Error('El énfasis debe señalar piezas reales de la explicación.');
  }
  for (const check of value.checks) {
    if (!check.id || !['choose', 'explain', 'write'].includes(check.kind) || !check.prompt?.trim() || !check.hint?.trim() || !check.success?.trim() || !Array.isArray(check.answers) || !check.answers.length || check.answers.some((answer) => !answer?.trim())) throw new Error('Cada reto necesita respuestas y una ayuda revisadas.');
    if (check.kind !== 'write' && !check.ordering && (!Array.isArray(check.choices) || check.choices.length < 2 || new Set(check.choices).size !== check.choices.length || check.answers.some((answer) => !check.choices!.includes(answer)))) throw new Error('Las opciones del truco deben incluir la respuesta y ser distintas.');
    if (check.ordering) {
      const parts = check.ordering;
      if (check.kind !== 'choose' || check.situation || check.choices || !Array.isArray(parts) || parts.length < 2 || parts.length > 8 || parts.some((part) => !part.text?.trim() || !['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role))) throw new Error('Ordenar necesita entre dos y ocho piezas explícitas, sin otra modalidad mezclada.');
      const words = (text: string) => normalizeSentenceAnswer(text).split(/\s+/).sort().join(' ');
      const inventory = words(parts.map((part) => part.text).join(' '));
      if (check.answers.some((answer) => words(answer) !== inventory) || !check.answers.some((answer) => value.steps.some((step) => !step.hideEnglish && normalizeSentenceAnswer(step.en.map((part) => part.text).join('')) === normalizeSentenceAnswer(answer)))) throw new Error('Las piezas deben reconstruir una respuesta previamente enseñada.');
    }
    if (check.situation) {
      const { message, scenes } = check.situation;
      const taught = value.steps.some((step) => !step.hideEnglish && normalizeSentenceAnswer(step.en.map((part) => part.text).join('')) === normalizeSentenceAnswer(message));
      if (check.kind === 'write' || !message?.trim() || !taught || !Array.isArray(scenes) || scenes.length !== 2
        || !check.choices || check.choices.length !== scenes.length || new Set(scenes.map((scene) => scene.choice)).size !== scenes.length
        || new Set(scenes.map((scene) => scene.state)).size !== scenes.length
        || scenes.some((scene) => !check.choices!.includes(scene.choice) || !['playing', 'waiting', 'brushing', 'brush-ready', 'cooking', 'cook-ready', 'search-keys', 'search-phone', 'making-bed', 'resting-bed', 'computer-playing', 'console-playing'].includes(scene.state))
        || ![['playing', 'waiting'], ['brushing', 'brush-ready'], ['cooking', 'cook-ready'], ['search-keys', 'search-phone'], ['making-bed', 'resting-bed'], ['computer-playing', 'console-playing']].some((pair) => scenes.every((scene) => pair.includes(scene.state)))) throw new Error('La situación requiere un mensaje enseñado y dos escenas distintas vinculadas a sus opciones.');
    }
  }
  if (!value.checks.some((check) => check.kind === 'explain') || !value.checks.some((check) => check.kind === 'write')) throw new Error('El truco debe comprobar comprensión y uso.');
}

/** Only a known contract is generated. All other structures need an authored lesson. */
export function lessonForForm(form: GrammarForm, baseSpanish?: string): GrammarLessonData | null {
  if (form.lesson) return form.lesson;
  if (form.visualContract !== 'present-continuous' && form.id !== 'ing') return null;
  const first = form.subjects.find((subject) => subject.expandedEn === 'I am' || subject.en === "I'm");
  if (!first || !form.englishBase || !baseSpanish) return null;
  const spanishVerb = [piece(form.spanishStem, 'verb'), piece(form.spanishEnding, 'change')];
  const englishVerb = [piece(form.englishRoot, 'verb'), piece(form.englishNut, 'change')];
  return {
    id: `present-continuous:${form.englishBase}`, title: 'Lo que estás haciendo', language: 'en',
    steps: [
      { caption: `Estoy ${form.spanish}. Antes de traducir: ¿quién está ${form.spanish}?`, es: [piece('Estoy ', 'auxiliary'), ...spanishVerb], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), ...englishVerb], hideEnglish: true, advanceLabel: `¿Quién está ${form.spanish}?` },
      { caption: 'YO. En español puedes omitir la persona; en estas frases inglesas debes escribirla. Hazla visible antes de traducir.', es: [piece('YO ', 'subject'), piece('estoy ', 'auxiliary'), ...spanishVerb], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), ...englishVerb], advanceLabel: 'Ver cómo encajan las piezas →' },
      { caption: `I + AM se juntan: I'M. La acción conserva ING, como ${form.spanishEnding} en «${form.spanish}».`, es: [piece('YO ', 'subject'), piece('estoy ', 'auxiliary'), ...spanishVerb], en: [piece("I'm ", 'auxiliary'), ...englishVerb], advanceLabel: 'Probarlo con mis palabras →' },
    ],
    checks: [
      { id: 'order-message-v1', kind: 'choose', prompt: `Estoy ${form.spanish}. Monta el mensaje en inglés.`,
        ordering: [piece(form.english.toUpperCase(), 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')],
        answers: [`I am ${form.english}`], hint: `Primero quién: I. Después estoy: AM. Al final la acción: ${form.english.toUpperCase()}.`, success: 'Mensaje construido. Ahora úsalo sin piezas.' },
      { id: 'meaning-now-v1', kind: 'explain', prompt: `Recibes «I am ${form.english}». ¿Qué te cuenta esa persona?`,
        choices: [`Estoy ${form.spanish} ahora.`, `Todavía no estoy ${form.spanish}.`], answers: [`Estoy ${form.spanish} ahora.`],
        ...(form.englishBase === 'play' && form.english === 'playing' && form.spanish === 'jugando' ? {
          situation: { message: 'I am playing', scenes: [
            { choice: 'Estoy jugando ahora.', state: 'playing' as const },
            { choice: 'Todavía no estoy jugando.', state: 'waiting' as const },
          ] },
        } : form.englishBase === 'brush' && baseSpanish === 'cepillar' && form.english === 'brushing' && form.spanish === 'cepillando' ? {
          situation: { message: 'I am brushing', scenes: [
            { choice: 'Estoy cepillando ahora.', state: 'brushing' as const },
            { choice: 'Todavía no estoy cepillando.', state: 'brush-ready' as const },
          ] },
        } : form.englishBase === 'cook' && baseSpanish === 'cocinar' && form.english === 'cooking' && form.spanish === 'cocinando' ? {
          situation: { message: 'I am cooking', scenes: [
            { choice: 'Estoy cocinando ahora.', state: 'cooking' as const },
            { choice: 'Todavía no estoy cocinando.', state: 'cook-ready' as const },
          ] },
        } : {}),
        hint: `I AM ${form.english.toUpperCase()} cuenta una acción que está ocurriendo ahora.`, success: 'Has entendido el mensaje: la acción está ocurriendo ahora.' },
      { id: 'use', kind: 'write', prompt: `Dilo en inglés: estoy ${form.spanish}.`, answers: [first.phrase, `I am ${form.english}`], hint: `Para «estoy ${form.spanish}», une I + AM y añade ${form.english.toUpperCase()}. También puedes escribir I'M.`, success: 'Ya has escrito una frase que puedes usar.' },
    ],
  };
}
