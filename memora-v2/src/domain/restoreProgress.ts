import { recordAttempt, recordSession, type RecallAttempt, type LearningSession } from './learningProfile';
import { recordGrammarAttempt, type GrammarAttempt } from './grammarMemory';
import { recordLearningActivity, type LearningActivity } from './learningActivity';
import { recordUnitProgress, type UnitProgress } from './journey';
import { recordWordRecall, replaceAssociation, recordChunkExposure, recordChunkRecall, recordSentenceExposure, recordSentenceRecall, type RecallGrade, type RecallDirection, type RecallError } from './memory';
import type { AtomicWord, UnitSentence } from './unit';
import { progressPrefixes, withReplayStore, type ProgressEvent } from './progressJournal';
import { currentCourseEvents, compareProgressEvents } from './courseRestart';

/** Rebuild from immutable attempts, so two devices never overwrite each other's answers. */
export function restoreProgress(userId: string, events: ProgressEvent[]): Map<string, string> {
  const state = new Map<string, string>();
  const store = { getItem: (key: string) => state.get(key) ?? null, setItem: (key: string, value: string) => { state.set(key, value); } };
  const unique = currentCourseEvents([...new Map(events.map((event) => [event.id, event])).values()]);
  const keyFor = (part: string) => part.startsWith('unit.') ? `memora-v2.unit.${userId}.${part.slice(5)}` : `memora-v2.${part}.${userId}`;
  // Legacy snapshots are seeds, not new attempts. Merge conservatively; never add counters twice.
  for (const event of unique.filter((item) => item.kind === 'baseline')) {
    const snapshot = event.args[0] as Record<string, unknown>;
    for (const [part, value] of Object.entries(snapshot)) {
      if (!progressPrefixes.includes(part) && !part.startsWith('unit.')) continue;
      const key = keyFor(part);
      const previous = JSON.parse(state.get(key) || 'null');
      if (Array.isArray(value)) {
        const rows = new Map<string, Record<string, unknown>>();
        for (const row of [...(Array.isArray(previous) ? previous : []), ...value]) {
          if (!row || typeof row !== 'object') continue;
          const id = row.key ?? JSON.stringify(row);
          const old = rows.get(id);
          const at = (item: Record<string, unknown>) => String(item.lastAttemptAt ?? item.completedAt ?? item.at ?? item.firstSeenAt ?? '');
          if (!old || at(row) >= at(old)) rows.set(id, row);
        }
        state.set(key, JSON.stringify([...rows.values()]));
      } else if (value && typeof value === 'object' && (!previous || String((value as UnitProgress).completedAt) >= String(previous.completedAt))) state.set(key, JSON.stringify(value));
    }
  }
  withReplayStore(store, () => {
    for (const event of unique.filter((item) => item.kind !== 'baseline').sort(compareProgressEvents)) {
      const [a, b, c, d, e] = event.args;
      const at = new Date(event.at);
      switch (event.kind) {
        case 'word': recordWordRecall(userId, a as AtomicWord, b as RecallGrade, at, c as RecallDirection, d as RecallError | undefined, e as boolean); break;
        case 'replacement': replaceAssociation(userId, a as AtomicWord, b as string, at); break;
        case 'chunkExposure': recordChunkExposure(userId, a as string, b as UnitSentence, c as number, at); break;
        case 'chunkRecall': recordChunkRecall(userId, a as string, b as RecallGrade, at); break;
        case 'sentenceExposure': recordSentenceExposure(userId, a as string, b as UnitSentence, at); break;
        case 'sentenceRecall': recordSentenceRecall(userId, a as string, b as RecallGrade, at); break;
        case 'attempt': recordAttempt(userId, a as RecallAttempt); break;
        case 'session': recordSession(userId, a as LearningSession); break;
        case 'unit': recordUnitProgress(userId, a as string, b as UnitProgress); break;
        case 'grammar': recordGrammarAttempt(userId, a as GrammarAttempt); break;
        case 'learning': recordLearningActivity(userId, a as LearningActivity); break;
      }
    }
  });
  return state;
}
