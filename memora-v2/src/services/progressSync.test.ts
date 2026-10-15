import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeLearningMode } from '../domain/learningModes';
import { initializeJournal, readJournal } from '../domain/progressJournal';
import { readLearningActivities } from '../domain/learningActivity';
import { readUnitProgress } from '../domain/journey';
import { previewUnit } from '../preview/previewUnit';
// @ts-expect-error The deployed Directus extension is JavaScript.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';

const remote = vi.hoisted(() => ({ events: [] as any[], request: vi.fn() }));
vi.mock('./directus', async (original) => ({ ...await original<typeof import('./directus')>(), apiRequest: remote.request }));
import { startProgressSync } from './progressSync';

let local: Map<string, string>;
beforeEach(() => {
  local = new Map();
  const session = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), key: (index: number) => [...local.keys()][index] ?? null, get length() { return local.size; } });
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
describe('finalización y restauración mediante el servicio real de sincronización', () => {
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
