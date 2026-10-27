import type { LearningActivity } from './learningActivity';
import { activeCourse, progressPrefixes, type ProgressEvent } from './progressJournal';

const restartId = 'course-restart:v1';
const courseId = `course:${activeCourse}`;
export const appliedRestartKey = (userId: string) => `memora-v2.course-restart.${activeCourse}.${userId}`;

/** An explicit, neutral account action carried by the existing event journal.
 * Old attempts remain immutable; this boundary starts a new learning run.
 * It is not a catalogue unit, a completion, or a memory/scheduling engine. */
export function courseRestartActivity(id: string, at: string): LearningActivity {
  return { id, at, unitId: courseId, unitTitle: 'Reinicio del recorrido', contentVersion: '1', activityId: restartId, skill: restartId,
    phase: 'completion', source: 'authored', modality: 'choice', prompt: 'Empezar desde el inicio', response: 'Reinicio solicitado por el alumno', expected: '', correct: null, helped: false };
}
export function isCourseRestart(event: ProgressEvent): boolean {
  const value = event.args[0] as Partial<LearningActivity> | undefined;
  return event.kind === 'learning' && value?.id === event.id && value.at === event.at && Number.isFinite(Date.parse(event.at))
    && value.unitId === courseId && value.activityId === restartId && value.skill === restartId && value.contentVersion === '1'
    && value.phase === 'completion' && value.source === 'authored' && value.modality === 'choice' && value.correct === null && value.helped === false;
}
export function compareProgressEvents(a: ProgressEvent, b: ProgressEvent): number {
  return Date.parse(a.at) - Date.parse(b.at) || (a.device === b.device ? (a.sequence ?? 0) - (b.sequence ?? 0) : 0) || a.id.localeCompare(b.id);
}
export function latestCourseRestart(events: readonly ProgressEvent[]): ProgressEvent | undefined {
  return events.filter(isCourseRestart).sort(compareProgressEvents).at(-1);
}
export function currentCourseEvents(events: ProgressEvent[]): ProgressEvent[] {
  const restart = latestCourseRestart(events);
  if (!restart) return events;
  // Legacy snapshots are never new practice, even when a stale device uploads
  // its initial migration after the restart. Tied unknown clocks are excluded.
  return events.filter((event) => !isCourseRestart(event) && event.kind !== 'baseline' && (
    Date.parse(event.at) > Date.parse(restart.at) || event.at === restart.at && event.device === restart.device
      && event.sequence !== undefined && restart.sequence !== undefined && event.sequence > restart.sequence));
}
export function isCourseProgressKey(userId: string, key: string): boolean {
  return progressPrefixes.some((part) => key === `memora-v2.${part}.${userId}`) || key.startsWith(`memora-v2.unit.${userId}.`);
}
function isCoursePositionKey(userId: string, key: string): boolean {
  return ['resume', 'resume-mode', 'grammar-position', 'arcade-cadence'].some((part) => key === `memora-v2.${part}.${userId}`)
    || ['checkpoint', 'mirror-checkpoint', 'trick', 'chat-checkpoint'].some((part) => key.startsWith(`memora-v2.${part}.${userId}.`));
}
/** Archive first, clear only this account's materialized course and navigation.
 * Tokens, avatar, appearance, rejected associations, other accounts and immutable
 * journal events are deliberately outside this scope. Fail closed on storage errors. */
function restartKeys(userId: string, positions: boolean): string[] {
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => key !== null);
  return keys.filter((key) => isCourseProgressKey(userId, key) || positions && isCoursePositionKey(userId, key));
}
export function archiveCourseState(userId: string, restart: ProgressEvent) {
  const archiveKey = `memora-v2.course-archive.${activeCourse}.${userId}.${restart.id}`;
  if (!localStorage.getItem(archiveKey)) localStorage.setItem(archiveKey, JSON.stringify(Object.fromEntries(restartKeys(userId, true).map((key) => [key, localStorage.getItem(key)]))));
}
export function prepareRestartMaterialization(userId: string, restart: ProgressEvent): boolean {
  const changed = localStorage.getItem(appliedRestartKey(userId)) !== restart.id;
  if (changed) archiveCourseState(userId, restart);
  const selected = restartKeys(userId, changed);
  for (const key of selected) {
    if (key === `memora-v2.arcade-cadence.${userId}`) {
      let calm = false;
      try { calm = JSON.parse(localStorage.getItem(key) || 'null')?.calm === true; } catch { /* Keep the safe default. */ }
      localStorage.setItem(key, JSON.stringify({ seen: [], words: 0, pending: null, calm }));
    } else localStorage.removeItem(key);
  }
  return changed;
}
