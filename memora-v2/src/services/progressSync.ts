import { apiRequest, DirectusError } from './directus';
import { activeCourse, appendProgress, initializeJournal, journalKey, readJournal, writeJournal, type ProgressEvent } from '../domain/progressJournal';
import { restoreProgress } from '../domain/restoreProgress';
import { appliedRestartKey, archiveCourseState, courseRestartActivity, latestCourseRestart, prepareRestartMaterialization } from '../domain/courseRestart';

function materializeProgress(userId: string, events: ProgressEvent[]) {
  const restored = restoreProgress(userId, events);
  const restart = latestCourseRestart(events);
  const changed = restart ? prepareRestartMaterialization(userId, restart) : false;
  restored.forEach((value, key) => localStorage.setItem(key, value));
  if (restart) localStorage.setItem(appliedRestartKey(userId), restart.id);
  if (changed) window.dispatchEvent(new Event('memora-course-restarted'));
}

/** Only called by an explicit action in the signed-in learner's settings.
 * The existing sync uploads the neutral boundary; no DELETE or admin API. */
export function restartCourseProgress(userId: string) {
  if (!userId || userId === 'preview') throw new Error('Abre tu cuenta para reiniciar tu recorrido.');
  initializeJournal(userId);
  const id = crypto.randomUUID(), at = new Date().toISOString();
  const event: ProgressEvent = { id, at, kind: 'learning', args: [courseRestartActivity(id, at)] };
  try { archiveCourseState(userId, event); } catch { throw new Error('No hay espacio para archivar. No se ha reiniciado tu progreso.'); }
  if (!appendProgress(userId, 'learning', event.args, at, id)) throw new Error('No se pudo guardar el reinicio. Tu historial sigue conservado.');
  materializeProgress(userId, readJournal(userId)!.events);
  window.dispatchEvent(new Event('memora-progress-restored'));
}

export type SyncStatus = 'syncing' | 'saved' | 'offline' | 'error' | 'storage-full';
export const syncLabels: Record<SyncStatus, string> = {
  syncing: 'Guardando tu progreso…', saved: 'Progreso guardado en tu cuenta',
  offline: 'Progreso en este dispositivo · se enviará al reconectar',
  error: 'Progreso en este dispositivo · el servidor no ha confirmado el guardado. Reintentaremos sin borrar tus respuestas.',
  'storage-full': 'No queda espacio para guardar. Mantén esta pestaña abierta y libera espacio.',
};

/** One controller per signed-in account. No calls or progress writes from preview mode. */
export function startProgressSync(userId: string, notify: (status: SyncStatus) => void) {
  let stopped = false;
  let running = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try { initializeJournal(userId); } catch { notify('storage-full'); }
  async function flush() {
    if (stopped) return;
    if (running) { again = true; return; }
    running = true;
    notify('syncing');
    try {
      let journal = readJournal(userId);
      if (!journal) throw new Error('No local journal');
      // Send bounded batches. IDs make retry after a lost response idempotent.
      while (journal.pending.length) {
        const pending = new Set(journal.pending);
        const batch: ProgressEvent[] = [];
        let bytes = 0;
        for (const event of journal.events.filter((item) => pending.has(item.id))) {
          const size = new TextEncoder().encode(JSON.stringify(event)).length;
          if (batch.length && (bytes + size > 600_000 || batch.length === 25)) break;
          batch.push(event); bytes += size;
        }
        const result: { accepted: string[] } = await apiRequest<{ accepted: string[] }>('/memora/progress/events', {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ course: activeCourse, events: batch }),
        });
        if (stopped) return;
        const accepted: Set<string> = new Set(result.accepted);
        if (!batch.length || !accepted.size) throw new Error('No progress acknowledged');
        journal = readJournal(userId)!;
        journal = { ...journal, pending: journal.pending.filter((id) => !accepted.has(id)) };
        writeJournal(userId, journal);
      }
      let more = true;
      let remoteChanged = false;
      while (more) {
        journal = readJournal(userId)!;
        const page = await apiRequest<{ events: ProgressEvent[]; cursor: number; hasMore: boolean }>(`/memora/progress/events?course=${activeCourse}&after=${journal.cursor}`, { signal: controller.signal });
        if (stopped) return;
        journal = readJournal(userId)!;
        const all = new Map(journal.events.map((event) => [event.id, event]));
        page.events.forEach((event) => { if (!all.has(event.id)) remoteChanged = true; all.set(event.id, event); });
        journal = { ...journal, events: [...all.values()], cursor: page.cursor };
        writeJournal(userId, journal);
        more = page.hasMore;
      }
      const current = readJournal(userId)!;
      const materializedKey = `${journalKey(userId)}.materialized`;
      if (remoteChanged || localStorage.getItem(materializedKey) !== String(current.cursor)) {
        materializeProgress(userId, current.events);
        localStorage.setItem(materializedKey, String(current.cursor));
        window.dispatchEvent(new Event('memora-progress-restored'));
      }
      notify(current.pending.length ? 'syncing' : 'saved');
      if (current.pending.length) again = true;
    } catch (error) {
      if (!stopped) notify(error instanceof DOMException && error.name === 'QuotaExceededError' ? 'storage-full' : error instanceof DirectusError ? 'error' : 'offline');
    } finally {
      running = false;
      if (again && !stopped) { again = false; schedule(); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => void flush(), 800); }
  function onStorage(event: StorageEvent) { if (event.key === journalKey(userId) || event.key?.startsWith(`memora-v2.event.${activeCourse}.${userId}.`)) schedule(); }
  function onVisible() { if (document.visibilityState === 'visible') schedule(); }
  function onFull() { notify('storage-full'); }
  window.addEventListener('memora-progress-written', schedule);
  window.addEventListener('memora-progress-storage-full', onFull);
  window.addEventListener('storage', onStorage);
  window.addEventListener('online', schedule);
  document.addEventListener('visibilitychange', onVisible);
  const interval = setInterval(() => void flush(), 60_000);
  const ready = flush();
  return { ready, flush, stop() {
    stopped = true; controller.abort(); clearTimeout(timer); clearInterval(interval);
    window.removeEventListener('memora-progress-written', schedule);
    window.removeEventListener('memora-progress-storage-full', onFull);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('online', schedule);
    document.removeEventListener('visibilitychange', onVisible);
  } };
}
