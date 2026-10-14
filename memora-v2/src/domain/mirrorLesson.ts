import { normalizeSentenceAnswer } from './sentenceAnswer';

/** Authored correspondences, never suffix guesses or literal-translation rules. */
export type MirrorRole = 'person' | 'auxiliary' | 'action' | 'negation' | 'question' | 'context';
export interface MirrorPiece { text: string; role: MirrorRole; ending?: string }
export interface MirrorExample {
  id: string; natural: string; mirror: MirrorPiece[]; english: MirrorPiece[];
  contracted: string; acceptedAnswers: string[];
}
export interface MirrorLessonData {
  version: 1; id: string; novelty: string; scope: string; discovery: string;
  examples: MirrorExample[]; testExampleId: string; conversationExampleId: string;
  hints: [string, string, string]; recallHints: [string, string, string]; question: { en: MirrorPiece[]; es: MirrorPiece[] };
}
const roles: MirrorRole[] = ['person', 'auxiliary', 'action', 'negation', 'question', 'context'];
export function mirrorText(pieces: MirrorPiece[]): string { return pieces.map((piece) => piece.text).join(' '); }
export function validateMirrorLesson(value: unknown): MirrorLessonData {
  const lesson = value as MirrorLessonData;
  const validPieces = (pieces: MirrorPiece[]) => Array.isArray(pieces) && pieces.length > 0 && pieces.every((piece) =>
    typeof piece.text === 'string' && Boolean(piece.text.trim()) && roles.includes(piece.role) &&
    (piece.ending === undefined || piece.role === 'action' && Boolean(piece.ending) && piece.text.endsWith(piece.ending)));
  if (!lesson || lesson.version !== 1 || !lesson.id?.trim() || !lesson.novelty?.trim() || !lesson.scope?.trim() ||
    !lesson.discovery?.trim() || !Array.isArray(lesson.examples) || lesson.examples.length < 2 || lesson.examples.length > 6 ||
    new Set(lesson.examples.map((example) => example.id)).size !== lesson.examples.length ||
    lesson.examples.some((example) => !example.id?.trim() || !example.natural?.trim() || !validPieces(example.mirror) || !validPieces(example.english) ||
      !example.contracted?.trim() || !Array.isArray(example.acceptedAnswers) || example.acceptedAnswers.some((answer) => typeof answer !== 'string' || !answer.trim()) ||
      !example.acceptedAnswers.includes(mirrorText(example.english)) || !example.acceptedAnswers.includes(example.contracted)) ||
    ![lesson.testExampleId, lesson.conversationExampleId].every((id) => lesson.examples.some((example) => example.id === id)) ||
    ![lesson.hints, lesson.recallHints].every((hints) => Array.isArray(hints) && hints.length === 3 && hints.every((hint) => typeof hint === 'string' && hint.trim())) ||
    !lesson.question || !validPieces(lesson.question.en) || !validPieces(lesson.question.es)) {
    throw new Error('La ficha espejo necesita ejemplos alineados, respuestas revisadas y tres pistas progresivas.');
  }
  const shape = lesson.examples[0].english.map((piece) => piece.role).join('|');
  const mirrorShape = lesson.examples[0].mirror.map((piece) => piece.role).join('|');
  if (lesson.examples.some((example) => example.english.map((piece) => piece.role).join('|') !== shape || example.mirror.map((piece) => piece.role).join('|') !== mirrorShape)) {
    throw new Error('Los ejemplos de comparación deben conservar las mismas posiciones y funciones.');
  }
  return lesson;
}
export function evaluateMirrorAnswer(example: MirrorExample, response: string): boolean {
  const normalized = normalizeSentenceAnswer(response);
  return Boolean(normalized) && example.acceptedAnswers.some((answer) => normalizeSentenceAnswer(answer) === normalized);
}
/** A wrong answer earns one additional clue, never the entire sentence. */
export function nextMirrorHint(level: number): number { return Math.min(3, Math.max(0, level) + 1); }
export function mirrorHint(lesson: MirrorLessonData, response: string, level: number): string {
  // Structural feedback without supplying the action or complete target answer.
  if (level === 1 && /^i\s+\w+ing\b/i.test(response.trim())) return 'Has elegido la acción. Falta la pieza azul entre I y la acción.';
  return lesson.hints[Math.max(0, Math.min(2, level - 1))];
}
