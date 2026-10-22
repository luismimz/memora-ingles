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
it('conserva la identidad aditiva de la tarea y rechaza identidades malformadas sin borrar otros datos', () => {
  const state = { stage: 3, checkIndex: 0, checkId: 'explain', input: '', feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', state);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
  localStorage.setItem('memora-v2.trick.u1.invalid', JSON.stringify({ version: '1', state: { ...state, checkId: 12 } }));
  expect(readTrickCheckpoint('u1', 'invalid', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
});
it('conserva el último envío errado separado del borrador y admite registros antiguos', () => {
  const state = { stage: 3, checkIndex: 2, checkId: 'use', input: 'I am play', correctionResponse: 'I playing', feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', state);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
  localStorage.setItem('memora-v2.trick.u1.invalid', JSON.stringify({ version: '1', state: { ...state, correctionResponse: 12 } }));
  expect(readTrickCheckpoint('u1', 'invalid', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
});

it('conserva dos fallos y el enlace al intento, sin aceptar cuotas inválidas ni borrar otros checkpoints', () => {
  const state = { stage: 3, checkIndex: 0, checkId: 'order-message-v1', input: '', feedback: 'help' as const, helped: true, checkFailures: 2, previousAttemptId: 'first-error' };
  writeTrickCheckpoint('isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
  for (const checkFailures of [-1, 15, 1.5, '2']) {
    localStorage.setItem('memora-v2.trick.isolated.invalid', JSON.stringify({ version: '1', state: { ...state, checkFailures } }));
    expect(readTrickCheckpoint('isolated', 'invalid', '1')).toBeNull();
  }
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
});
