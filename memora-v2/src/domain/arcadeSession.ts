import type { GrammarArcadeRound } from './grammarArcadeRounds';
import { normalizeSentenceAnswer } from './sentenceAnswer';

/** A change of slot/question is not a new message. No immediate recycling to fill a quota. */
export function distinctGrammarMessages(rounds: GrammarArcadeRound[]): GrammarArcadeRound[] {
  const seen = new Set<string>();
  return rounds.filter((round) => {
    const key = normalizeSentenceAnswer(round.sentence.en).replace(/^i['’]m\b/, 'i am');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Presentation bound only: does not select new learning or write progress. */
export const arcadeSessionLength = (available: number, automatic: boolean) => Math.min(available, automatic ? 3 : 15);
