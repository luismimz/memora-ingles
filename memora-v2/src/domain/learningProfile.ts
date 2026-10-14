import { readUnitProgress } from './journey';
import { appendProgress, progressStorage } from './progressJournal';
import { associationNeedsReview, compareAssociationVersions, readChunkMemories, readSentenceMemories, readWordMemories, type RecallDirection, type RecallError } from './memory';
import type { UnitSummary } from '../services/directus';

export interface LearningSession {
  unitId: string;
  completedAt: string;
  correct: number;
  attempted: number;
  fatigue?: {
    consecutiveMisses: number;
    averageResponseMs: number;
    cueDependency: number;
    abandonedPrompts: number;
  };
}

export interface RecallAttempt {
  unitId: string;
  wordId: number;
  word: string;
  correct: boolean;
  at: string;
  direction?: RecallDirection;
  error?: RecallError;
}

export type CapabilitySummary = Record<RecallDirection, { correct: number; attempted: number; accuracy: number | null }>;

export interface LearningProfile {
  sessions: number;
  activeDays: number;
  daysSinceLastSession: number | null;
  streakDays: number;
  accuracy: number | null;
  dueReviews: number;
  dueWords: number;
  dueChunks: number;
  dueSentences: number;
  learnedUnits: number;
  recalledWords: number;
  hardestWord: { word: string; correct: number; attempted: number } | null;
  capabilitySummary: CapabilitySummary;
  errorCounts: Partial<Record<RecallError, number>>;
  weakestCapability: { direction: RecallDirection; accuracy: number; attempted: number } | null;
  associationsNeedingReview: number;
  associationsImproved: number;
  nextReviewAt: string | null;
  recentDays: { day: string; active: boolean }[];
}

const sessionKey = (userId: string) => `memora-v2.sessions.${userId}`;
const attemptKey = (userId: string) => `memora-v2.attempts.${userId}`;
const avatarKey = (userId: string) => `memora-v2.avatar.${userId}`;

function readList<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(progressStorage().getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch { return []; }
}

export function readSessions(userId: string): LearningSession[] { return readList<LearningSession>(sessionKey(userId)); }
export function readAttempts(userId: string): RecallAttempt[] { return readList<RecallAttempt>(attemptKey(userId)); }

function appendBounded<T>(key: string, item: T, max: number): void {
  try { progressStorage().setItem(key, JSON.stringify([...readList<T>(key), item].slice(-max))); }
  catch { /* Una cuota local llena no bloquea la partida. */ }
}

export function recordSession(userId: string, result: LearningSession): void {
  appendProgress(userId, 'session', [result], result.completedAt);
  appendBounded(sessionKey(userId), result, 500);
}

export function recordAttempt(userId: string, result: RecallAttempt): void {
  appendProgress(userId, 'attempt', [result], result.at);
  appendBounded(attemptKey(userId), result, 1500);
}

export function readAvatar(userId: string): string | null {
  try { return localStorage.getItem(avatarKey(userId)); } catch { return null; }
}

export function saveAvatar(userId: string, dataUrl: string): boolean {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl) || dataUrl.length > 700_000) return false;
  try { localStorage.setItem(avatarKey(userId), dataUrl); return true; } catch { return false; }
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const directions: RecallDirection[] = ['recognition', 'auditory', 'recall', 'production'];

function emptyCapabilitySummary(): CapabilitySummary {
  return Object.fromEntries(directions.map((direction) => [direction, { correct: 0, attempted: 0, accuracy: null }])) as CapabilitySummary;
}

export function summarizeLearning(sessions: LearningSession[], attempts: RecallAttempt[], units: UnitSummary[], progressById: Map<string, { completedAt: string; nextReviewAt: string } | null>, now = new Date()): LearningProfile {
  const validSessions = sessions.filter((item) => Number.isFinite(Date.parse(item.completedAt)));
  const active = new Set(validSessions.map((item) => dayKey(new Date(item.completedAt))));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastSessionDay = validSessions.length ? validSessions.map((item) => dayKey(new Date(item.completedAt))).sort().at(-1)! : null;
  const lastSessionDate = lastSessionDay ? new Date(`${lastSessionDay}T12:00:00`) : null;
  const daysSinceLastSession = lastSessionDate ? Math.max(0, Math.round((today.getTime() - new Date(lastSessionDate.getFullYear(), lastSessionDate.getMonth(), lastSessionDate.getDate()).getTime()) / 86_400_000)) : null;
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const day = dayKey(date);
    return { day, active: active.has(day) };
  });
  let cursor = new Date(today);
  if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (active.has(dayKey(cursor))) { streakDays++; cursor.setDate(cursor.getDate() - 1); }
  const attempted = validSessions.reduce((sum, item) => sum + Math.max(0, item.attempted), 0);
  const correct = validSessions.reduce((sum, item) => sum + Math.max(0, item.correct), 0);
  const byWord = new Map<string, { word: string; correct: number; attempted: number }>();
  for (const item of attempts) {
    if (!item.word?.trim()) continue;
    const key = item.word.trim().toLocaleLowerCase('en-US');
    const stat = byWord.get(key) ?? { word: item.word, correct: 0, attempted: 0 };
    stat.attempted++;
    stat.correct += Number(item.correct);
    byWord.set(key, stat);
  }
  const hardestWord = [...byWord.values()].filter((item) => item.correct < item.attempted)
    .sort((a, b) => a.correct / a.attempted - b.correct / b.attempted || b.attempted - a.attempted)[0] ?? null;
  const recalledWords = [...byWord.values()].filter((item) => item.correct > 0).length;
  // A successful retry at the end of a session must not erase earlier misses.
  const realAttempts = [...byWord.values()].reduce((sum, item) => sum + item.attempted, 0);
  const realCorrect = [...byWord.values()].reduce((sum, item) => sum + item.correct, 0);
  const capabilitySummary = emptyCapabilitySummary();
  const errorCounts: Partial<Record<RecallError, number>> = {};
  for (const item of attempts) {
    if (item.direction) {
      const capability = capabilitySummary[item.direction];
      capability.attempted++;
      capability.correct += Number(item.correct);
      capability.accuracy = Math.round(capability.correct / capability.attempted * 100);
    }
    if (item.error) errorCounts[item.error] = (errorCounts[item.error] ?? 0) + 1;
  }
  const weakestCapability = directions
    .map((direction) => ({ direction, ...capabilitySummary[direction] }))
    .filter((item) => item.attempted > 0 && item.accuracy !== null)
    .sort((a, b) => a.accuracy! - b.accuracy! || b.attempted - a.attempted)[0] ?? null;
  const progress = units.map((unit) => progressById.get(unit.id) ?? null);
  const nextReviewAt = progress.filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => item.nextReviewAt).filter((value) => Number.isFinite(Date.parse(value)))
    .sort()[0] ?? null;
  return {
    sessions: validSessions.length,
    activeDays: active.size,
    daysSinceLastSession,
    streakDays,
    accuracy: realAttempts ? Math.round(realCorrect / realAttempts * 100) : attempted ? Math.round(Math.min(1, correct / attempted) * 100) : null,
    dueReviews: progress.filter((item) => item && Date.parse(item.nextReviewAt) <= now.getTime()).length,
    dueWords: 0,
    dueChunks: 0,
    dueSentences: 0,
    learnedUnits: progress.filter(Boolean).length,
    recalledWords,
    hardestWord,
    capabilitySummary,
    errorCounts,
    weakestCapability: weakestCapability ? {
      direction: weakestCapability.direction,
      accuracy: weakestCapability.accuracy!,
      attempted: weakestCapability.attempted,
    } : null,
    associationsNeedingReview: 0,
    associationsImproved: 0,
    nextReviewAt,
    recentDays,
  };
}

export function personalRank(activeDays: number): { name: string; nextAt: number | null } {
  if (activeDays < 1) return { name: 'Primer paso', nextAt: 1 };
  if (activeDays < 3) return { name: 'En marcha', nextAt: 3 };
  if (activeDays < 7) return { name: 'Constante', nextAt: 7 };
  if (activeDays < 14) return { name: 'Imparable', nextAt: 14 };
  return { name: 'Leyenda', nextAt: null };
}

export function loadLearningProfile(userId: string, units: UnitSummary[], now = new Date()): LearningProfile {
  const currentUnitIds = new Set(units.map((unit) => unit.id));
  const currentWordKeys = new Set(units.flatMap((unit) => unit.words ?? []).map((word) => word.en.trim().toLocaleLowerCase('en-US')));
  const progressById = new Map(units.map((unit) => [unit.id, readUnitProgress(userId, unit.id)]));
  const sessions = readSessions(userId).filter((item) => currentUnitIds.has(item.unitId) || item.unitId === 'daily-arcade');
  const known = new Set(sessions.map((item) => `${item.unitId}:${item.completedAt}`));
  for (const [unitId, progress] of progressById) {
    if (!progress || known.has(`${unitId}:${progress.completedAt}`)) continue;
    sessions.push({ unitId, completedAt: progress.completedAt, correct: progress.correct, attempted: progress.attempted });
  }
  const summary = summarizeLearning(sessions, readAttempts(userId).filter((item) => currentUnitIds.has(item.unitId) || item.unitId === 'daily-arcade'), units, progressById, now);
  const memories = readWordMemories(userId).filter((item) => !currentWordKeys.size || currentWordKeys.has(item.word.en.trim().toLocaleLowerCase('en-US')));
  const chunks = readChunkMemories(userId).filter((item) => currentUnitIds.has(item.unitId));
  const sentences = readSentenceMemories(userId).filter((item) => currentUnitIds.has(item.unitId));
  if (!memories.length && !chunks.length && !sentences.length) return summary;
  const dueWords = memories.filter((item) => Date.parse(item.nextReviewAt) <= now.getTime()).length;
  const comparisons = memories.map(compareAssociationVersions).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const dueChunks = chunks.filter((item) => Date.parse(item.nextReviewAt) <= now.getTime()).length;
  const readySentences = sentences.filter((sentence) => {
    const parts = chunks.filter((chunk) => chunk.unitId === sentence.unitId && chunk.sentenceEn === sentence.sentenceEn);
    // Dialogue utterances have no builder chunks, but still own a review date.
    return parts.length === 0 || parts.length >= 2 && parts.every((part) => part.step >= 2 && part.correct >= 2);
  });
  const dueSentences = readySentences.filter((item) => Date.parse(item.nextReviewAt) <= now.getTime()).length;
  const nextReviewAt = [...memories, ...chunks, ...readySentences].map((item) => item.nextReviewAt).sort()[0] ?? null;
  const hardest = memories.filter((item) => item.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || a.correct / a.attempts - b.correct / b.attempts)[0];
  return {
    ...summary, dueReviews: 0, dueWords, dueChunks, dueSentences, recalledWords: memories.filter((item) => item.correct > 0).length,
    associationsNeedingReview: memories.filter((item) => associationNeedsReview(item)).length,
    associationsImproved: comparisons.filter((item) => item.currentImproved === true).length,
    nextReviewAt, hardestWord: hardest ? { word: hardest.word.en, correct: hardest.correct, attempted: hardest.attempts } : summary.hardestWord,
  };
}
