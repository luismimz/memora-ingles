import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialGame } from './game';
import { clearGameCheckpoint, clearMirrorCheckpoint, hasGameCheckpoint, readGameCheckpoint, readMirrorCheckpoint, writeGameCheckpoint, writeMirrorCheckpoint } from './gameCheckpoint';

const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  });
});

describe('navigation checkpoints', () => {
  it('resumes the same game activity without accepting an older content version', () => {
    const state = { ...initialGame, phase: 'recall' as const, recallIndex: 2, recallAnswered: true, correct: 2 };
    writeGameCheckpoint('learner', 'mission', '2', state);
    expect(readGameCheckpoint('learner', 'mission', '2')).toEqual(state);
    expect(readGameCheckpoint('learner', 'mission', '3')).toBeNull();
    clearGameCheckpoint('learner', 'mission');
    expect(hasGameCheckpoint('learner', 'mission')).toBe(false);
  });

  it('keeps mirror progress separate and clears it after completion', () => {
    const state = { stage: 4, person: true, reveal: 3, index: 1, questionReady: true, seen: [0, 1], startedAt: '2026-10-13T00:00:00.000Z' };
    writeMirrorCheckpoint('learner', 'mirror', '1', state);
    expect(hasGameCheckpoint('learner', 'mirror')).toBe(true);
    expect(readMirrorCheckpoint('learner', 'mirror', '1')).toEqual(state);
    clearMirrorCheckpoint('learner', 'mirror');
    expect(readMirrorCheckpoint('learner', 'mirror', '1')).toBeNull();
  });
});
