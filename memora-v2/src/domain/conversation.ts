import type { AtomicUnit, DialogueTurn } from './unit';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import { contextualCorrection } from './learningActivity';
import type { GrammarAttempt } from './grammarMemory';

export function demonstratedConversationQuestionSkills(attempts: readonly GrammarAttempt[]): Set<string> {
  return new Set(attempts.filter((attempt) => attempt.kind === 'write' && attempt.correct && !attempt.helped).map((attempt) => attempt.skill));
}

export interface ChatTurn {
  id: 'respond' | 'ask' | 'transfer';
  expected: DialogueTurn;
  prompt?: DialogueTurn;
  context: string;
  reply: { en: string; es?: string };
}

export function acceptedConversationAnswer(unit: AtomicUnit, turn: ChatTurn, response: string): boolean {
  const answers = [...turn.expected.acceptedAnswers];
  if (turn.id === 'respond' && unit.communication?.practicePrompt && turn.prompt &&
    normalizeSentenceAnswer(unit.communication.practicePrompt) === normalizeSentenceAnswer(turn.prompt.en)) {
    answers.push(...unit.communication.acceptedAnswers ?? []);
  }
  const normalized = normalizeSentenceAnswer(response);
  return Boolean(normalized) && answers.some((answer) => normalizeSentenceAnswer(answer) === normalized);
}
/** A role swap requires an authored question skill and evidence that this learner has used it. */
export function conversationTurns(unit: AtomicUnit, demonstratedQuestionSkills: ReadonlySet<string> = new Set()): ChatTurn[] {
  const dialogue = unit.communication?.dialogue;
  if (!dialogue) return [];
  const reply = dialogue.reply ?? { en: unit.communication!.reply };
  const turns: ChatTurn[] = [
    { id: 'respond', expected: dialogue.turns[1], prompt: dialogue.turns[0], context: dialogue.context, reply },
  ];
  if (dialogue.roleSwap === true && dialogue.questionSkillId && demonstratedQuestionSkills.has(dialogue.questionSkillId)) {
    turns.push({ id: 'ask', expected: dialogue.turns[0], context: 'Ahora pregúntaselo tú.', reply: dialogue.turns[1] });
  }
  if (dialogue.transfer) turns.push({ id: 'transfer', expected: dialogue.transfer, prompt: dialogue.turns[0], context: dialogue.transferContext!, reply });
  return turns;
}

/** Only learner turns can take over an identical written task from the coach. */
export function conversationPracticeAnswers(unit: AtomicUnit, demonstratedQuestionSkills: ReadonlySet<string> = new Set()): string[] {
  const turns = conversationTurns(unit, demonstratedQuestionSkills);
  const answers = turns.flatMap((turn) => {
    const values = [...turn.expected.acceptedAnswers];
    if (turn.id === 'respond' && unit.communication?.practicePrompt && turn.prompt
      && normalizeSentenceAnswer(unit.communication.practicePrompt) === normalizeSentenceAnswer(turn.prompt.en)) {
      values.push(...unit.communication.acceptedAnswers ?? []);
    }
    return values;
  });
  return [...new Set(answers)];
}
export function followingConversationTurn(current: number, total: number): number | null {
  return current + 1 < total ? current + 1 : null;
}

export function writtenConversationCorrection(response: string, expected: string): string {
  const specific = contextualCorrection(response, expected);
  if (!specific.startsWith('Escucha la frase')) return specific;
  const actual = normalizeSentenceAnswer(response).split(' ');
  const target = normalizeSentenceAnswer(expected).split(' ');
  const mismatch = target.findIndex((piece, index) => piece !== actual[index]);
  if (mismatch < 0) return 'La frase ya está. Revisa si has añadido alguna palabra de más al final.';
  const part = actual[mismatch] ? `«${actual[mismatch]}»` : 'esa pieza';
  return `Revisa ${part}. Aquí necesitas «${target[mismatch]}». Cambia solo esa parte y vuelve a intentarlo.`;
}
