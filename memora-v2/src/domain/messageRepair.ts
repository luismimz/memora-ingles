import type { LessonPiece, LessonStep } from './grammarLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';

/** Reviewed repair of a taught message, not an AI-generated distractor pool. */
export interface MessageRepairData {
  target: string; pieces: LessonPiece[]; choices: LessonPiece[]; solution: string;
  joined: { before: string; first: string; inserted: string; after: string }; insight: string;
}
export function validateMessageRepair(repair: MessageRepairData, steps: readonly LessonStep[], answers: readonly string[]) {
  const normalize = normalizeSentenceAnswer;
  const message = repair?.solution && normalize(repair.solution);
  const taught = steps.filter((step) => !step.hideEnglish).map((step) => normalize(step.en.map((part) => part.text).join('')));
  const validPiece = (part: LessonPiece) => part && typeof part.text === 'string' && part.text.trim() && ['subject', 'auxiliary', 'verb', 'change', 'context'].includes(part.role);
  if (!message || !repair.target?.trim() || !repair.insight?.trim() || !taught.includes(message) || answers.some((answer) => normalize(answer) !== message)
    || !Array.isArray(repair.pieces) || repair.pieces.length < 2 || repair.pieces.length > 7 || !repair.pieces.every(validPiece)
    || !Array.isArray(repair.choices) || repair.choices.length < 2 || repair.choices.length > 5 || !repair.choices.every(validPiece)
    || new Set(repair.choices.map((part) => normalize(part.text))).size !== repair.choices.length) throw new Error('Reparar requiere un mensaje y piezas ya enseñados.');
  const known = (part: LessonPiece) => taught.some((sample) => ` ${sample} `.includes(` ${normalize(part.text)} `));
  const { before, first, inserted, after } = repair.joined ?? {};
  if (![...repair.pieces, ...repair.choices].every(known) || [before, first, inserted, after].some((value) => typeof value !== 'string')
    || normalize(`${before}${first} ${inserted}${after}`) !== message) throw new Error('La reparación no puede esconder piezas desconocidas o cambiar el modelo.');
  const broken = repair.pieces.map((part) => part.text);
  const candidates = repair.choices.flatMap((choice) => Array.from({ length: broken.length + 1 }, (_, index) => normalize([...broken.slice(0, index), choice.text, ...broken.slice(index)].join(' '))));
  if (normalize(broken.join(' ')) === message || !candidates.includes(message)) throw new Error('La pieza debe poder reparar realmente el mensaje.');
}
