import type { AtomicWord } from './unit';

// Reuse the existing learner-scoped preference; never edit the word or memory snapshot.
const key = (userId: string, word: AtomicWord) => `memora-v2.rejected-association.${userId}.${word.en.toLocaleLowerCase('en-US')}`;
export function isAssociationRejected(userId: string | undefined, word: AtomicWord): boolean {
  if (!userId || !word.bridge) return false;
  try { return localStorage.getItem(key(userId, word)) === '1'; } catch { return false; }
}
export function rememberAssociationPreference(userId: string, word: AtomicWord, rejected: boolean) {
  try { if (rejected) localStorage.setItem(key(userId, word), '1'); else localStorage.removeItem(key(userId, word)); } catch { /* Practice remains available without local storage. */ }
}
