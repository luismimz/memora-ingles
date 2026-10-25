import { progressStorage } from './progressJournal';
import type { LearningActivity } from './learningActivity';

export type AutomaticArcadeMode = 'associations' | 'grammar';

/** Presentation variety from existing evidence, not another memory schedule.
 * Three different answered actions must intervene before the same scene returns
 * as a surprise. Navigation, models and repeated repairs do not fill that gap.
 * Manual practice remains available and SRS due dates are unchanged. */
export function separatedArcadeUnits<T extends { id: string }>(units: readonly T[], activities: readonly LearningActivity[]): T[] {
  const ordered = activities.filter((event) => event.source === 'learner' && typeof event.correct === 'boolean' && event.phase !== 'completion' && Number.isFinite(Date.parse(event.at)))
    .map((event, index) => ({ event, index })).sort((a, b) => Date.parse(b.event.at) - Date.parse(a.event.at) || b.index - a.index);
  const actions = new Set<string>();
  const recent = new Set<string>();
  let cutoff: number | undefined;
  for (const { event } of ordered) {
    const at = Date.parse(event.at);
    // Sync may reorder events with an identical timestamp. Do not pretend we
    // know which one was last: defer the entire tied boundary conservatively.
    if (cutoff !== undefined && at < cutoff) break;
    const identity = JSON.stringify([event.unitId, event.skill, event.phase, event.prompt, event.expected]);
    if (actions.has(identity)) continue;
    actions.add(identity); recent.add(event.unitId);
    if (actions.size >= 3 && cutoff === undefined) cutoff = at;
  }
  return units.filter((unit) => !recent.has(unit.id));
}
interface Cadence { seen: string[]; words: number; pending: AutomaticArcadeMode | null; calm?: boolean }
const key = (userId: string) => `memora-v2.arcade-cadence.${userId}`;
function read(userId: string): Cadence {
  try {
    const value = JSON.parse(progressStorage().getItem(key(userId)) ?? 'null');
    if (Array.isArray(value?.seen) && Number.isInteger(value.words) && value.words >= 0 && [null, 'associations', 'grammar'].includes(value.pending)) return value;
  } catch { /* A missing UI checkpoint never changes learning evidence. */ }
  return { seen: [], words: 0, pending: null };
}
function save(userId: string, value: Cadence): boolean {
  try { progressStorage().setItem(key(userId), JSON.stringify(value)); return true; } catch { return false; }
}
/** Scheduling only: this never creates attempts, learned words or completion events. */
export function completeArcadeCadence(userId: string, stopId: string, version: string, grammar: boolean): AutomaticArcadeMode | null {
  const value = read(userId);
  const identity = JSON.stringify([stopId, version, grammar]);
  if (!value.seen.includes(identity)) {
    value.seen.push(identity);
    if (grammar) value.pending = 'grammar';
    else if (++value.words >= 4 && !value.pending) value.pending = 'associations';
    save(userId, value);
  }
  return value.pending;
}
export const pendingAutomaticArcade = (userId: string) => read(userId).pending;
/** Presentation preference only; retain cadence and learning evidence unchanged. */
export const readArcadeCalm = (userId: string) => read(userId).calm === true;
export function writeArcadeCalm(userId: string, calm: boolean): boolean { return save(userId, { ...read(userId), calm }); }
export function consumeAutomaticArcade(userId: string) {
  const value = read(userId);
  value.pending = null; value.words = 0;
  save(userId, value);
}
