import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeLearningMode } from '../domain/learningModes';
import { initializeJournal, readJournal } from '../domain/progressJournal';
import { readLearningActivities } from '../domain/learningActivity';
import { readUnitProgress } from '../domain/journey';
import { previewUnit } from '../preview/previewUnit';
// @ts-expect-error The deployed Directus extension is JavaScript.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';

const remote = vi.hoisted(() => ({ events: [] as any[], request: vi.fn() }));
vi.mock('./directus', async (original) => ({ ...await original<typeof import('./directus')>(), apiRequest: remote.request }));
import { restartCourseProgress, startProgressSync } from './progressSync';
import { recordLearningActivity } from '../domain/learningActivity';
import { recordSentenceExposure, recordSentenceRecall, recordWordRecall, readSentenceMemories, readWordMemories, sentenceKey } from '../domain/memory';
import { recordGrammarAttempt, readGrammarAttempts } from '../domain/grammarMemory';
import { dueZeroReviews, zeroJourney, zeroMessages, zeroWords } from '../domain/zeroJourney';

let local: Map<string, string>;
beforeEach(() => {
  local = new Map();
  const session = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), removeItem: (key: string) => local.delete(key), key: (index: number) => [...local.keys()][index] ?? null, get length() { return local.size; } });
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  remote.events = [];
  remote.request.mockReset().mockImplementation(async (url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === 'POST') {
      const events = validateProgressBatch(JSON.parse(options.body!));
      for (const event of events) if (!remote.events.some((row) => row.id === event.id)) remote.events.push(event);
      return { accepted: events.map((event: { id: string }) => event.id) };
    }
    const after = Number(new URL(url, 'https://memora.test').searchParams.get('after'));
    return { events: remote.events.slice(after), cursor: remote.events.length, hasMore: false };
  });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('finalización y restauración mediante el servicio real de sincronización', () => {
  it('el contrato existente acepta y restaura el uso de Play y sus fechas sin inventar un calendario paralelo', async () => {
    initializeJournal('learner');
    recordSentenceExposure('learner', zeroJourney.id, zeroMessages.coldWater, new Date(Date.now() - 7_200_000));
    recordSentenceRecall('learner', sentenceKey(zeroJourney.id, zeroMessages.coldWater), 'hesitant');
    for (const word of [zeroWords[0], zeroWords[2]]) recordWordRecall('learner', word, 'hesitant', new Date(), 'production', undefined, false);
    recordGrammarAttempt('learner', { unitId: zeroJourney.id, skill: 'zero:cold-before-drink-v1', check: 'write-cold-water', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
    recordLearningActivity('learner', { unitId: zeroJourney.id, unitTitle: zeroJourney.title, contentVersion: zeroJourney.version, activityId: 'zero:isolated:write-cold-water', skill: 'zero:cold-before-drink-v1', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'Quiero agua fría.', response: 'I want cold water.', expected: 'I want cold water.', correct: true, helped: false, responseDelayMs: 5300, promptLanguage: 'es', responseLanguage: 'en' });
    recordSentenceExposure('learner', zeroJourney.id, zeroMessages.wantKey, new Date(Date.now() - 7_200_000));
    recordLearningActivity('learner', { unitId: zeroJourney.id, unitTitle: zeroJourney.title, contentVersion: zeroJourney.version, activityId: 'zero:isolated:write-key', skill: 'zero:have-or-want-key-v1', phase: 'dialogue', source: 'authored', modality: 'writing', prompt: 'Quiero una llave.', response: 'Una llave se dice A KEY. Conserva A delante de KEY.', expected: '', correct: null, helped: true, promptLanguage: 'es', responseLanguage: 'es' });
    recordLearningActivity('learner', { unitId: zeroJourney.id, unitTitle: zeroJourney.title, contentVersion: zeroJourney.version, activityId: 'zero:isolated:write-key', skill: 'zero:have-or-want-key-v1', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'Quiero una llave.', response: 'I want a key.', expected: 'I want a key.', correct: true, helped: true, promptLanguage: 'es', responseLanguage: 'en' });
    const memories = readSentenceMemories('learner');
    const sync = startProgressSync('learner', () => {});
    try { await sync.ready; await sync.flush(); } finally { sync.stop(); }
    expect(readJournal('learner')!.pending).toEqual([]);
    const sent = remote.events.length;
    local.clear(); // Isolated second device; never clears production data.
    const restored = startProgressSync('learner', () => {});
    try {
      await restored.ready;
      expect(readSentenceMemories('learner')).toEqual(memories);
      expect(readWordMemories('learner').map((memory) => memory.word.en)).toEqual(['WATER', 'COLD']);
      expect(readGrammarAttempts('learner')).toMatchObject([{ correct: true, helped: false, check: 'write-cold-water' }]);
      expect(readLearningActivities('learner')).toMatchObject([{ responseDelayMs: 5300, helped: false, response: 'I want cold water.' }, { correct: null, source: 'authored', responseLanguage: 'es' }, { helped: true, response: 'I want a key.' }]);
      expect(dueZeroReviews('learner')).toEqual(['write-key']);
      expect(dueZeroReviews('learner', Date.now() + 86_400_000)).toEqual(['write-key', 'write-cold-water']);
      expect(remote.events).toHaveLength(sent);
    } finally { restored.stop(); }
  });
  it('reinicia solo por petición explícita, sincroniza el límite sin DELETE y conserva la práctica nueva en otro dispositivo', async () => {
    initializeJournal('learner');
    const result = { correct: 2, attempted: 3, completedAt: '2026-10-16T00:00:00Z', nextReviewAt: '2026-10-17T00:00:00Z' };
    completeLearningMode('learner', previewUnit, 'adventure', result);
    const sync = startProgressSync('learner', () => {});
    await sync.ready;
    const historySize = remote.events.length;
    local.set('memora-v2.checkpoint.learner.m1', 'old');
    local.set('memora-v2.memory.other', 'preserved');
    restartCourseProgress('learner');
    expect(readUnitProgress('learner', previewUnit.id)).toBeNull();
    expect(readLearningActivities('learner')).toEqual([]);
    expect(local.get('memora-v2.checkpoint.learner.m1')).toBeUndefined();
    expect(local.get('memora-v2.memory.other')).toBe('preserved');
    expect(readJournal('learner')!.events.length).toBe(historySize + 1);
    recordLearningActivity('learner', { unitId: previewUnit.id, unitTitle: previewUnit.title, contentVersion: '1', activityId: 'new-run', skill: 'new-run', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'Hola', response: 'Hello', expected: 'Hello', correct: true, helped: false });
    try { await sync.flush(); } finally { sync.stop(); }
    expect(readJournal('learner')!.pending).toEqual([]);
    expect(remote.events.length).toBe(historySize + 2);
    expect(remote.request.mock.calls.every(([, options]) => !options?.method || options.method === 'POST')).toBe(true);
    local.clear(); // Isolated second device for the same signed-in account.
    const restored = startProgressSync('learner', () => {});
    try {
      await restored.ready;
      expect(readUnitProgress('learner', previewUnit.id)).toBeNull();
      expect(readLearningActivities('learner').map((row) => row.activityId)).toEqual(['new-run']);
      expect(remote.events.length).toBe(historySize + 2);
    } finally { restored.stop(); }
  });
  it('no permite reiniciar la vista previa ni una identidad vacía', () => {
    expect(() => restartCourseProgress('preview')).toThrow('Abre tu cuenta');
    expect(() => restartCourseProgress('')).toThrow('Abre tu cuenta');
    expect(local.size).toBe(0); expect(remote.request).not.toHaveBeenCalled();
  });
  it('si el archivo no cabe, no registra un reinicio que pudiera aplicarse luego en otro dispositivo', () => {
    initializeJournal('learner');
    local.set('memora-v2.memory.learner', 'old');
    const store = localStorage.setItem;
    localStorage.setItem = (key, value) => { if (key.startsWith('memora-v2.course-archive.')) throw new Error('full'); store(key, value); };
    const before = readJournal('learner')!.events;
    expect(() => restartCourseProgress('learner')).toThrow('No se ha reiniciado');
    expect(readJournal('learner')!.events).toEqual(before);
    expect(local.get('memora-v2.memory.learner')).toBe('old');
    expect(remote.request).not.toHaveBeenCalled();
  });
  it('envía finalizaciones válidas, recibe confirmación y las restaura sin duplicar', async () => {
    initializeJournal('learner');
    const result = { correct: 2, attempted: 3, completedAt: '2026-10-16T00:00:00Z', nextReviewAt: '2026-10-17T00:00:00Z' };
    completeLearningMode('learner', previewUnit, 'vocabulary', result);
    completeLearningMode('learner', previewUnit, 'adventure', result);
    const statuses: string[] = [];
    const first = startProgressSync('learner', (status) => statuses.push(status));
    try {
      await first.ready;
      expect(statuses.at(-1)).toBe('saved');
      expect(readJournal('learner')!.pending).toEqual([]);
    } finally { first.stop(); }
    const count = remote.events.length;
    local.clear(); // A fresh device, not a second account or a production write.
    const second = startProgressSync('learner', () => {});
    try {
      await second.ready;
      await second.flush();
      expect(readUnitProgress('learner', previewUnit.id)).toEqual(result);
      expect(readLearningActivities('learner').map((row) => row.activityId)).toEqual(['vocabulary-completed', 'adventure-completed']);
      expect(remote.events).toHaveLength(count);
    } finally { second.stop(); }
  });
});
