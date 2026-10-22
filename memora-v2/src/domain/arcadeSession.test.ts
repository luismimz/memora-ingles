import { expect, it } from 'vitest';
import { arcadeSessionLength, distinctGrammarMessages } from './arcadeSession';
import { grammarArcadeRounds } from './grammarArcadeRounds';
import { previewUnit } from '../preview/previewUnit';
import { arcadeCheckpointDue } from '../components/useArcadeClock';

it('15 preguntas sobre el mismo mensaje no se convierten en 15 rondas', () => {
  const source = grammarArcadeRounds('inspection', [previewUnit], true)[0];
  expect(source).toBeDefined();
  const variants = Array.from({ length: 15 }, (_, slotIndex) => ({ ...source, slotIndex, slot: { ...source.slot, es: `Otra pregunta ${slotIndex}` } }));
  const rounds = distinctGrammarMessages(variants);
  expect(rounds).toHaveLength(1);
  expect(arcadeSessionLength(rounds.length, true)).toBe(1);
  expect(arcadeCheckpointDue(1, 0, 1)).toBe(true);
  expect(arcadeCheckpointDue(1, 1, 1)).toBe(false);
});
it('sorpresa acotada por contenido real, sin inventar retos para alcanzar tres', () => {
  expect([0, 1, 2, 30].map((count) => arcadeSessionLength(count, true))).toEqual([0, 1, 2, 3]);
  expect(arcadeSessionLength(30, false)).toBe(15);
});
