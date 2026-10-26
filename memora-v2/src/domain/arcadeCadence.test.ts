import { beforeEach, expect, it, vi } from 'vitest';
import { completeArcadeCadence, consumeAutomaticArcade, pendingAutomaticArcade, readArcadeCalm, writeArcadeCalm, separatedArcadeUnits } from './arcadeCadence';
import type { LearningActivity } from './learningActivity';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('la sorpresa no recicla una escena hasta intercalar tres acciones distintas, sin cambiar el SRS o el catálogo', () => {
  const units = [{ id: 'play' }, { id: 'other' }, { id: 'old' }];
  const event = (unitId: string, activityId: string, second: number, extra: Partial<LearningActivity> = {}) => ({ id: `${unitId}-${activityId}-${second}`, unitId, skill: unitId, activityId, prompt: activityId, expected: activityId, at: `2026-10-23T10:00:${String(second).padStart(2, '0')}Z`, source: 'learner', correct: true, phase: 'grammar', ...extra } as LearningActivity);
  const initial = [event('play', 'respond', 0)];
  expect(separatedArcadeUnits(units, initial).map((unit) => unit.id)).toEqual(['other', 'old']);
  const two = [...initial, event('other', 'one', 1), event('other', 'two', 2)];
  expect(separatedArcadeUnits(units, two).map((unit) => unit.id)).toEqual(['old']);
  const ready = [...two, event('other', 'three', 3)];
  expect(separatedArcadeUnits(units, ready).map((unit) => unit.id)).toEqual(['play', 'old']);
  expect(separatedArcadeUnits(units, [...ready].reverse())).toEqual(separatedArcadeUnits(units, ready));
  expect(separatedArcadeUnits(units, JSON.parse(JSON.stringify(ready)))).toEqual(separatedArcadeUnits(units, ready));
  const fakeGap = [...initial, ...Array.from({ length: 5 }, (_, index) => event('other', 'same-repair', index + 1, { correct: false })), event('other', 'model', 6, { source: 'authored' }), event('other', 'navigation', 7, { phase: 'completion' }), event('other', 'oral', 8, { correct: null })];
  expect(separatedArcadeUnits(units, fakeGap).map((unit) => unit.id)).not.toContain('play');
  const randomIdsSameQuestion = [...initial, ...Array.from({ length: 4 }, (_, index) => event('other', `random-session-${index}`, index + 1, { prompt: 'Misma pregunta', expected: 'Mismo mensaje' }))];
  expect(separatedArcadeUnits(units, randomIdsSameQuestion).map((unit) => unit.id)).not.toContain('play');
  const tied = [event('play', 'respond', 0), ...['one', 'two', 'three'].map((id) => event('other', id, 0))];
  expect(separatedArcadeUnits(units, tied).map((unit) => unit.id)).not.toContain('play');
  expect(separatedArcadeUnits(units, [...tied].reverse())).toEqual(separatedArcadeUnits(units, tied));
  expect(units).toEqual([{ id: 'play' }, { id: 'other' }, { id: 'old' }]);
  expect(localStorage.getItem('memora-v2.memory.learner')).toBeNull();
});
it('rompe la repetición tras dos tandas distintas, persiste y no cuenta cierres repetidos', () => {
  expect(completeArcadeCadence('learner', 'word-1', '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-1', '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-2', '1', false)).toBe('associations');
  expect(pendingAutomaticArcade('learner')).toBe('associations');
  expect(pendingAutomaticArcade('other')).toBeNull();
  consumeAutomaticArcade('learner');
  expect(completeArcadeCadence('learner', 'word-2', '1', false)).toBeNull();
  expect(completeArcadeCadence('learner', 'word-3', '1', false)).toBeNull();
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
  expect(writeArcadeCalm('learner', true)).toBe(true);
  expect(JSON.parse(localStorage.getItem('memora-v2.arcade-cadence.learner')!)).toEqual({ ...before, calm: true });
  expect(readArcadeCalm('learner')).toBe(true);
  expect(readArcadeCalm('other')).toBe(false);
  consumeAutomaticArcade('learner');
  expect(readArcadeCalm('learner')).toBe(true);
  expect(completeArcadeCadence('learner', 'word-1', '1', false)).toBeNull();
  expect(localStorage.getItem('memora-v2.learning.learner')).toBeNull();
  expect(localStorage.getItem('memora-v2.memory.learner')).toBeNull();
});
it('informa cuando no puede persistir la preferencia sin afirmar un cambio guardado', () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('full'); } });
  expect(writeArcadeCalm('learner', true)).toBe(false);
  expect(readArcadeCalm('learner')).toBe(false);
});
