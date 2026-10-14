import type { GrammarForm } from './unit';
import { normalizeSentenceAnswer } from './sentenceAnswer';

export interface LessonPiece { text: string; role: 'subject' | 'auxiliary' | 'verb' | 'change' | 'context' }
export interface LessonStep { caption: string; es: LessonPiece[]; en: LessonPiece[]; captionMarks?: LessonPiece[] }
export interface LessonCheck {
  id: string;
  kind: 'choose' | 'explain' | 'write';
  prompt: string;
  choices?: string[];
  answers: string[];
  hint: string;
  success: string;
}
export interface GrammarLessonData { id: string; title: string; language: 'en'; steps: LessonStep[]; checks: LessonCheck[]; advanceMode?: 'manual' | 'automatic' }
export const piece = (text: string, role: LessonPiece['role'] = 'context'): LessonPiece => ({ text, role });

/** Defer only a written task that will actually be answered in this chat. */
export function grammarChecksForExperience(lesson: GrammarLessonData, conversationAnswers: string[] = []): LessonCheck[] {
  const practiced = new Set(conversationAnswers.map(normalizeSentenceAnswer));
  return lesson.checks.filter((check) => check.kind !== 'write' || !check.answers.some((answer) => practiced.has(normalizeSentenceAnswer(answer))));
}

export function validateGrammarLesson(value: GrammarLessonData): void {
  if (value?.advanceMode !== undefined && !['manual', 'automatic'].includes(value.advanceMode)) throw new Error('El ritmo del truco no es válido.');
  if (!value?.id?.trim() || !value.title?.trim() || value.language !== 'en' || !Array.isArray(value.steps) || !value.steps.length || value.steps.length > 6 || !Array.isArray(value.checks) || !value.checks.length) throw new Error('El truco necesita demostración y práctica revisadas.');
  for (const step of value.steps) {
    if (!step.caption?.trim() || step.caption.split(/\s+/).length > 35) throw new Error('Cada paso explica una sola idea en un máximo de 35 palabras.');
    for (const row of [step.es, step.en]) if (!Array.isArray(row) || !row.length || row.some((part) => !part.text?.trim() || !['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role))) throw new Error('La transformación requiere piezas explícitas, no terminaciones adivinadas.');
    if (step.captionMarks && (!Array.isArray(step.captionMarks) || step.captionMarks.length > 12 || step.captionMarks.some((part) => !part.text?.trim() || !step.caption.includes(part.text) || !['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role)))) throw new Error('El énfasis debe señalar piezas reales de la explicación.');
  }
  for (const check of value.checks) {
    if (!check.id || !['choose', 'explain', 'write'].includes(check.kind) || !check.prompt?.trim() || !check.hint?.trim() || !check.success?.trim() || !Array.isArray(check.answers) || !check.answers.length || check.answers.some((answer) => !answer?.trim())) throw new Error('Cada reto necesita respuestas y una ayuda revisadas.');
    if (check.kind !== 'write' && (!Array.isArray(check.choices) || check.choices.length < 2 || new Set(check.choices).size !== check.choices.length || check.answers.some((answer) => !check.choices!.includes(answer)))) throw new Error('Las opciones del truco deben incluir la respuesta y ser distintas.');
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
      { caption: `Mira el final: ${form.spanishEnding} señala una acción en marcha; en inglés aparece ING.`, es: spanishVerb, en: englishVerb },
      { caption: "Para decir «estoy», añade I'M delante. Dos piezas: I'M + acción con ING.", es: [piece('Estoy ', 'auxiliary'), ...spanishVerb], en: [piece("I'm ", 'auxiliary'), ...englishVerb] },
    ],
    checks: [
      { id: 'explain', kind: 'explain', prompt: `Ayuda a alguien que escribió «I ${form.english}». ¿Qué falta?`, choices: ['AM: I am + verbo con ING.', 'Nada: ING ya lo dice todo.'], answers: ['AM: I am + verbo con ING.'], hint: `ING no puede hacer todo el trabajo. Para «estoy ${form.spanish}», necesitas I AM.`, success: 'Lo has explicado: AM e ING trabajan juntos en esta frase.' },
      { id: 'use', kind: 'write', prompt: `Dilo en inglés: estoy ${form.spanish}.`, answers: [first.phrase, `I am ${form.english}`], hint: `Empieza con I'M y añade ${form.english.toUpperCase()}.`, success: 'Ya has escrito una frase que puedes usar.' },
    ],
  };
}
