import { beforeEach, expect, it, vi } from 'vitest';
import { completeArcadeCadence, consumeAutomaticArcade, pendingAutomaticArcade, readArcadeCalm, writeArcadeCalm } from './arcadeCadence';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('programa una ronda cada cuatro misiones distintas, persiste y no cuenta cierres repetidos', () => {
  for (let index = 1; index <= 3; index++) expect(completeArcadeCadence('learner', `word-${index}`, '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-3', '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-4', '1', false)).toBe('associations');
  expect(pendingAutomaticArcade('learner')).toBe('associations');
  expect(pendingAutomaticArcade('other')).toBeNull();
  consumeAutomaticArcade('learner');
  expect(completeArcadeCadence('learner', 'word-4', '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-5', '1', false)).toBeNull();
});
it('un truco solicita gramática incluso en Inicio, sin crear progreso de aprendizaje', () => {
  expect(completeArcadeCadence('learner', 'trick:play:ing', '1', true)).toBe('grammar');
  consumeAutomaticArcade('learner');
  expect(completeArcadeCadence('learner', 'trick:play:ing', '1', true)).toBeNull();
  expect(localStorage.getItem('memora-v2.learning.learner')).toBeNull();
  expect(localStorage.getItem('memora-v2.memory.learner')).toBeNull();
});
it('guarda sin reloj por alumno sin consumir rondas, borrar identidades ni crear aprendizaje', () => {
  completeArcadeCadence('learner', 'word-1', '1', false);
  completeArcadeCadence('learner', 'trick:play:ing', '1', true);
  const before = JSON.parse(localStorage.getItem('memora-v2.arcade-cadence.learner')!);
  expect(readArcadeCalm('learner')).toBe(false);
  writeArcadeCalm('learner', true);
  expect(JSON.parse(localStorage.getItem('memora-v2.arcade-cadence.learner')!)).toEqual({ ...before, calm: true });
  expect(readArcadeCalm('learner')).toBe(true);
  expect(readArcadeCalm('other')).toBe(false);
  consumeAutomaticArcade('learner');
  expect(readArcadeCalm('learner')).toBe(true);
  expect(completeArcadeCadence('learner', 'word-1', '1', false)).toBeNull();
  expect(localStorage.getItem('memora-v2.learning.learner')).toBeNull();
  expect(localStorage.getItem('memora-v2.memory.learner')).toBeNull();
});
