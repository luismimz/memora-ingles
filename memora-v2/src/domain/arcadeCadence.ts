import { progressStorage } from './progressJournal';

export type AutomaticArcadeMode = 'associations' | 'grammar';
interface Cadence { seen: string[]; words: number; pending: AutomaticArcadeMode | null; calm?: boolean }
const key = (userId: string) => `memora-v2.arcade-cadence.${userId}`;
function read(userId: string): Cadence {
  try {
    const value = JSON.parse(progressStorage().getItem(key(userId)) ?? 'null');
    if (Array.isArray(value?.seen) && Number.isInteger(value.words) && value.words >= 0 && [null, 'associations', 'grammar'].includes(value.pending)) return value;
  } catch { /* A missing UI checkpoint never changes learning evidence. */ }
  return { seen: [], words: 0, pending: null };
}
function save(userId: string, value: Cadence) {
  try { progressStorage().setItem(key(userId), JSON.stringify(value)); } catch { /* Learning progress remains independent. */ }
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
export function writeArcadeCalm(userId: string, calm: boolean) { save(userId, { ...read(userId), calm }); }
export function consumeAutomaticArcade(userId: string) {
  const value = read(userId);
  value.pending = null; value.words = 0;
  save(userId, value);
}
