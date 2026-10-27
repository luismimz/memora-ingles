import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { appliedRestartKey, courseRestartActivity, currentCourseEvents, latestCourseRestart, prepareRestartMaterialization } from './courseRestart';
import { restoreProgress } from './restoreProgress';
import type { ProgressEvent } from './progressJournal';

let values: Map<string, string>;
const boundary: ProgressEvent = { id: 'bb86563e-8867-4f43-9051-a24c5708e826', at: '2026-10-27T12:00:00.000Z', kind: 'learning', args: [], device: 'one', sequence: 2 };
boundary.args = [courseRestartActivity(boundary.id, boundary.at)];
const learning = (id: string, at: string, sequence: number): ProgressEvent => ({ ...boundary, id, at, sequence, args: [{ ...courseRestartActivity(id, at), unitId: 'm1-entry-keys', activityId: 'answer', skill: 'looking-for', phase: 'dialogue', source: 'learner', modality: 'writing', response: 'I am looking for my keys.', correct: true }] });
beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

it('reconstruye solo la nueva etapa, sin transformar el reinicio en aprendizaje', () => {
  const old = learning('old', '2026-10-26T12:00:00Z', 1);
  const next = learning('new', '2026-10-27T12:01:00Z', 3);
  const lateSeed: ProgressEvent = { id: 'late-seed', at: '2026-10-28T12:00:00Z', kind: 'baseline', args: [{ learning: [old.args[0]], memory: [{ key: 'old' }] }] };
  const restored = restoreProgress('learner', [next, lateSeed, boundary, old, boundary]);
  expect(restored.has('memora-v2.memory.learner')).toBe(false);
  expect(JSON.parse(restored.get('memora-v2.learning.learner')!).map((row: { id: string }) => row.id)).toEqual(['new']);
  expect(restoreProgress('learner', [old, boundary]).size).toBe(0);
});
it('conserva un intento posterior al reinicio en el mismo milisegundo cuando conoce el orden', () => {
  const next = learning('new', boundary.at, 3), before = learning('old', boundary.at, 1);
  const unknown = { ...next, id: 'unknown', device: 'other' };
  expect(currentCourseEvents([next, before, unknown, boundary])).toEqual([next]);
});
it('no interpreta una finalización normal o un marcador incompleto como orden de reinicio', () => {
  const ordinary = learning('normal', boundary.at, 3);
  const bad = { ...boundary, args: [{ ...boundary.args[0] as object, correct: true }] };
  expect(latestCourseRestart([ordinary, bad])).toBeUndefined();
  expect(currentCourseEvents([ordinary, bad])).toEqual([ordinary, bad]);
});
it('un segundo reinicio cierra la primera etapa incluso con entrega desordenada y duplicada', () => {
  const second = { ...boundary, id: 'second', at: '2026-10-28T12:00:00Z', sequence: 5 };
  second.args = [courseRestartActivity(second.id, second.at)];
  const firstRun = learning('first-run', '2026-10-27T12:01:00Z', 3);
  const next = learning('second-run', '2026-10-28T12:01:00Z', 6);
  expect(currentCourseEvents([next, second, firstRun, boundary, second])).toEqual([next]);
});
it('archiva antes de reiniciar solo la cuenta elegida, conserva ajustes, sesión e historial inmutable', () => {
  const keys = ['memory.learner', 'unit.learner.m1', 'checkpoint.learner.m1', 'mirror-checkpoint.learner.m1', 'trick.learner.story', 'chat-checkpoint.learner.chat', 'resume.learner', 'resume-mode.learner', 'grammar-position.learner'];
  for (const key of keys) values.set(`memora-v2.${key}`, 'old');
  values.set('memora-v2.arcade-cadence.learner', JSON.stringify({ seen: ['old'], words: 8, pending: 'grammar', calm: true }));
  const untouched = ['memora-v2.memory.learner-2', 'memora-v2.unit.learner-2.m1', 'memora-v2.chat-checkpoint.learner-2.chat', 'memora-v2.avatar.learner', 'memora-v2.rejected-association.learner.key', 'memora-v2.event.es-en.learner.old', 'memora-v2.journal.es-en.learner', 'memora-v2.session', 'memora-v2.appearance'];
  for (const key of untouched) values.set(key, 'keep');
  expect(prepareRestartMaterialization('learner', boundary)).toBe(true);
  for (const key of keys) expect(values.has(`memora-v2.${key}`)).toBe(false);
  for (const key of untouched) expect(values.get(key)).toBe('keep');
  expect(JSON.parse(values.get('memora-v2.arcade-cadence.learner')!)).toEqual({ seen: [], words: 0, pending: null, calm: true });
  const archive = values.get(`memora-v2.course-archive.es-en.learner.${boundary.id}`)!;
  expect(JSON.parse(archive)['memora-v2.memory.learner']).toBe('old');
  values.set(appliedRestartKey('learner'), boundary.id);
  values.set('memora-v2.checkpoint.learner.m1', 'new run');
  expect(prepareRestartMaterialization('learner', boundary)).toBe(false);
  expect(values.get('memora-v2.checkpoint.learner.m1')).toBe('new run');
  expect(values.get(`memora-v2.course-archive.es-en.learner.${boundary.id}`)).toBe(archive);
});
it('si no puede archivar, no elimina ningún dato', () => {
  values.set('memora-v2.memory.learner', 'old');
  vi.stubGlobal('localStorage', { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: () => { throw new Error('full'); }, removeItem: vi.fn() });
  expect(() => prepareRestartMaterialization('learner', boundary)).toThrow('full');
  expect(localStorage.removeItem).not.toHaveBeenCalled();
  expect(values.get('memora-v2.memory.learner')).toBe('old');
});
