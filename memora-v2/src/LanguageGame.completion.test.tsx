import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewUnit } from './preview/previewUnit';
import { initialGame } from './domain/game';
import { initializeJournal } from './domain/progressJournal';
import { readLearningActivities } from './domain/learningActivity';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';

const effects = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useReducer: (_reducer: unknown, initial: unknown, init: (value: unknown) => unknown) => [init(initial), vi.fn()],
  useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
  useRef: (value: unknown) => ({ current: value }),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => unknown) => effects.push(fn),
}));
import { LanguageGame } from './LanguageGame';

beforeEach(() => {
  effects.length = 0;
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key), key: (index: number) => [...data.keys()][index] ?? null, get length() { return data.size; } });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {} });
  initializeJournal('learner');
});
describe('final de palabras con los efectos reales del juego', () => {
  it('completa una sola vez y actualiza la posición sin necesitar pulsar el botón final', () => {
    const checkpointId = `${previewUnit.id}:vocabulary`;
    writeGameCheckpoint('learner', checkpointId, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'reward', correct: 2 });
    const finished = vi.fn();
    const next = vi.fn();
    LanguageGame({ unit: previewUnit, userId: 'learner', learningMode: 'vocabulary', onFinished: finished, onNext: next, onExit: () => {}, appearance: 'light', onToggleAppearance: () => {} });
    effects.forEach((effect) => effect());
    effects.forEach((effect) => effect());
    expect(finished).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(readGameCheckpoint('learner', checkpointId, previewUnit.contentVersion ?? '1')).toBeNull();
    expect(readLearningActivities('learner').filter((row) => row.activityId === 'vocabulary-completed')).toHaveLength(1);
  });
});
