import { describe, expect, it } from 'vitest';
import { ARCADE_ROUND_SIZE, MAX_WORD_REPEATS_PER_ROUND, buildArcadeRound, type ArcadeCard } from './useArcadeEngine';

function card(id: number): ArcadeCard {
  return {
    word: { id, en: `word-${id}` } as ArcadeCard['word'],
    progress: {} as ArcadeCard['progress'],
    mnemonic: null,
    promptWord: `word-${id}`,
    expectedYes: true,
  };
}

describe('Arcade round builder', () => {
  it('always creates exactly fifteen challenges', () => {
    const round = buildArcadeRound(Array.from({ length: 8 }, (_, index) => card(index + 1)));
    expect(round).toHaveLength(ARCADE_ROUND_SIZE);
  });

  it('never repeats a word more than twice in one round', () => {
    const round = buildArcadeRound(Array.from({ length: 15 }, (_, index) => card(index + 1)));
    const counts = new Map(round.map((item) => [item.word.id, 0]));
    for (const item of round) counts.set(item.word.id, (counts.get(item.word.id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(MAX_WORD_REPEATS_PER_ROUND);
  });

  it('does not fabricate a fifteen-slot round with fewer than eight unique words', () => {
    expect(buildArcadeRound(Array.from({ length: 7 }, (_, index) => card(index + 1)))).toEqual([]);
  });
});
