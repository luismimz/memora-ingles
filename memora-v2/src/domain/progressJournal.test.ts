import { beforeEach, describe, it, expect, vi } from 'vitest';
import { appendProgress, initializeJournal, readJournal, writeJournal } from './progressJournal';
import { recordLearningActivity } from './learningActivity';
import { restoreProgress } from './restoreProgress';

describe('diario de intentos sin sobrescrituras', () => {
  beforeEach(() => {
    const local = new Map<string, string>(); const session = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), key: (index: number) => [...local.keys()][index] ?? null, get length() { return local.size; } });
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
    initializeJournal('learner');
  });
  it('un guardado antiguo no borra el intento nuevo de otra pestaña', () => {
    const before = readJournal('learner')!;
    const id = appendProgress('learner', 'session', [{ unitId: 'keys', completedAt: new Date().toISOString(), correct: 1, attempted: 2 }]);
    writeJournal('learner', before);
    expect(readJournal('learner')!.pending).toContain(id);
    expect(readJournal('learner')!.events).toHaveLength(1);
  });
  it('una confirmación no vuelve a pendiente por un guardado atrasado', () => {
    appendProgress('learner', 'session', [{}]);
    const pending = readJournal('learner')!;
    writeJournal('learner', { ...pending, pending: [] });
    writeJournal('learner', pending);
    expect(readJournal('learner')!.pending).toHaveLength(0);
  });
  it('conserva el texto incorrecto, su corrección y el siguiente intento al reconstruir', () => {
    const common = { unitId: 'keys', unitTitle: 'Has perdido las llaves', contentVersion: '1', activityId: 'turn-B', skill: 'look-for', phase: 'dialogue' as const, source: 'learner' as const, modality: 'writing' as const, prompt: 'Estoy buscando mis llaves', expected: "I'm looking for my keys", helped: false };
    const wrong = recordLearningActivity('learner', { ...common, response: 'I looking for my keys', correct: false, feedback: 'Falta AM.' });
    recordLearningActivity('learner', { ...common, response: "I'm looking for my keys", correct: true, helped: true, parentAttemptId: wrong.id });
    const events = readJournal('learner')!.events;
    const restored = restoreProgress('learner', [...events, ...events]);
    const records = JSON.parse(restored.get('memora-v2.learning.learner')!);
    expect(records).toHaveLength(2);
    expect(records[0].response).toBe('I looking for my keys');
    expect(records[1].parentAttemptId).toBe(wrong.id);
    expect(records[1].helped).toBe(true);
  });
});
