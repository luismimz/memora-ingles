/** Every course owns its journal. English is the first supported course. */
export const activeCourse = 'es-en';
export type ProgressKind = 'baseline' | 'word' | 'replacement' | 'chunkExposure' | 'chunkRecall' | 'sentenceExposure' | 'sentenceRecall' | 'attempt' | 'session' | 'unit' | 'grammar' | 'learning';
export interface ProgressEvent { id: string; at: string; kind: ProgressKind; args: unknown[]; version?: 2; device?: string; sequence?: number }
export interface Journal { events: ProgressEvent[]; pending: string[]; cursor: number }
export const journalKey = (userId: string) => `memora-v2.journal.${activeCourse}.${userId}`;
const eventPrefix = (userId: string) => `memora-v2.event.${activeCourse}.${userId}.`;
export const progressPrefixes = ['memory', 'chunks', 'sentences', 'attempts', 'sessions', 'unit', 'grammar', 'learning'];
type Store = Pick<Storage, 'getItem' | 'setItem'>;
let replayStore: Store | null = null;
export const progressStorage = (): Store => replayStore ?? localStorage;
export function withReplayStore<T>(store: Store, fn: () => T): T {
  const previous = replayStore; replayStore = store;
  try { return fn(); } finally { replayStore = previous; }
}
export function readJournal(userId: string): Journal | null {
  try {
    const stored = JSON.parse(localStorage.getItem(journalKey(userId)) || 'null');
    if (!stored || !Array.isArray(stored.events) || !Array.isArray(stored.pending)) return null;
    const events = new Map<string, ProgressEvent>(stored.events.map((event: ProgressEvent) => [event.id, event]));
    const pending = new Set<string>(stored.pending);
    const prefix = eventPrefix(userId);
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const row = JSON.parse(localStorage.getItem(key)!);
      if (!row.event?.id || !Array.isArray(row.event.args)) continue;
      events.set(row.event.id, row.event);
      if (row.synced) pending.delete(row.event.id); else pending.add(row.event.id);
    }
    return { events: [...events.values()], pending: [...pending], cursor: Number(stored.cursor) || 0 };
  } catch { return null; }
}
export function writeJournal(userId: string, journal: Journal) {
  const pending = new Set(journal.pending);
  // A separate immutable entry per event prevents concurrent tabs overwriting answers.
  for (const event of journal.events) {
    const key = eventPrefix(userId) + event.id;
    const previous = JSON.parse(localStorage.getItem(key) || 'null');
    const synced = Boolean(previous?.synced) || !pending.has(event.id);
    if (!previous || previous.synced !== synced) localStorage.setItem(key, JSON.stringify({ event: previous?.event ?? event, synced }));
  }
  const old = JSON.parse(localStorage.getItem(journalKey(userId)) || 'null');
  const envelope = JSON.stringify({ events: [], pending: [], cursor: Math.max(old?.cursor || 0, journal.cursor) });
  if (localStorage.getItem(journalKey(userId)) !== envelope) localStorage.setItem(journalKey(userId), envelope);
}
export function appendProgress(userId: string, kind: ProgressKind, args: unknown[], at = new Date().toISOString(), id: string = crypto.randomUUID()): string | null {
  if (replayStore || userId === 'preview' || !readJournal(userId)) return null;
  try {
    const device = sessionStorage.getItem('memora-v2.device') || crypto.randomUUID();
    sessionStorage.setItem('memora-v2.device', device);
    const sequence = Number(sessionStorage.getItem('memora-v2.sequence') || 0) + 1;
    sessionStorage.setItem('memora-v2.sequence', String(sequence));
    const event: ProgressEvent = { id, at, kind, args, version: 2, device, sequence };
    localStorage.setItem(eventPrefix(userId) + id, JSON.stringify({ event, synced: false }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('memora-progress-written'));
    return id;
  } catch {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('memora-progress-storage-full'));
    return null;
  }
}
export function initializeJournal(userId: string) {
  const existing = readJournal(userId);
  if (existing) { writeJournal(userId, existing); return; }
  const baseline: Record<string, unknown> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index); if (!key) continue;
    const prefix = progressPrefixes.find((part) => key === `memora-v2.${part}.${userId}` || part === 'unit' && key.startsWith(`memora-v2.unit.${userId}.`));
    if (!prefix) continue;
    try { baseline[prefix === 'unit' ? `unit.${key.slice(`memora-v2.unit.${userId}.`.length)}` : prefix] = JSON.parse(localStorage.getItem(key)!); } catch { /* Invalid legacy snapshots are not migrated. */ }
  }
  writeJournal(userId, { events: [], pending: [], cursor: 0 });
  for (const [part, value] of Object.entries(baseline)) {
    if (Array.isArray(value)) for (let offset = 0; offset < value.length; offset += 25) appendProgress(userId, 'baseline', [{ [part]: value.slice(offset, offset + 25) }]);
    else appendProgress(userId, 'baseline', [{ [part]: value }]);
  }
}
