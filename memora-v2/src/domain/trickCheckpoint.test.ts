import { beforeEach, expect, it, vi } from 'vitest';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint } from './trickCheckpoint';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('reanuda el paso, respuesta y pista solo para el usuario y versión correspondientes', () => {
  const checkpoint = { stage: 2, checkIndex: 1, input: "I'm playing", feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', checkpoint);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(checkpoint);
  expect(readTrickCheckpoint('u2', 'trick:play', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '2')).toBeNull();
  clearTrickCheckpoint('u1', 'trick:play');
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toBeNull();
});
