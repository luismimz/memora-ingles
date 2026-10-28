import { progressStorage } from './progressJournal';

export interface TrickContinuationCheckpoint { phase: 'build' | 'conversation'; sentenceIndex: number; filledSlots: number; previousAttempt?: string; failures?: number; modelUsed?: boolean; order?: number[]; preparationStep?: number }
export interface TrickCheckpoint { stage: number; checkIndex: number; input: string; feedback: 'idle' | 'help' | 'correct'; helped: boolean; checkId?: string; order?: number[]; correctionResponse?: string; checkFailures?: number; previousAttemptId?: string; episodeId?: string; episodeStartedAt?: string; promptStartedAt?: string; situationLayout?: 'message-chunks-v1'; presentation?: 'message-overview-v1'; reflection?: { draft: string; compared: boolean }; continuation?: TrickContinuationCheckpoint; review?: { pending: string[]; total: number } }
const key = (userId: string, stopId: string) => `memora-v2.trick.${userId}.${stopId}`;
export function parseTrickCheckpoint(value: unknown): TrickCheckpoint | null {
  try {
    const saved = { state: value as TrickCheckpoint };
    if (!Number.isInteger(saved.state?.stage) || saved.state.stage < 0 || !Number.isInteger(saved.state.checkIndex) || saved.state.checkIndex < 0 || typeof saved.state.input !== 'string' || !['idle', 'help', 'correct'].includes(saved.state.feedback) || typeof saved.state.helped !== 'boolean' || saved.state.checkId !== undefined && typeof saved.state.checkId !== 'string') return null;
    if (saved.state.order !== undefined && (!Array.isArray(saved.state.order) || saved.state.order.length > 8 || new Set(saved.state.order).size !== saved.state.order.length || saved.state.order.some((index: number) => !Number.isInteger(index) || index < 0 || index > 7))) return null;
    if (saved.state.correctionResponse !== undefined && typeof saved.state.correctionResponse !== 'string') return null;
    if (saved.state.checkFailures !== undefined && (!Number.isInteger(saved.state.checkFailures) || saved.state.checkFailures < 0 || saved.state.checkFailures > 2)) return null;
    if (saved.state.previousAttemptId !== undefined && typeof saved.state.previousAttemptId !== 'string') return null;
    if (saved.state.situationLayout !== undefined && saved.state.situationLayout !== 'message-chunks-v1') delete saved.state.situationLayout;
    if (saved.state.presentation !== undefined && saved.state.presentation !== 'message-overview-v1') delete saved.state.presentation;
    if (saved.state.reflection !== undefined && (!saved.state.reflection || typeof saved.state.reflection.draft !== 'string' || saved.state.reflection.draft.length > 500 || typeof saved.state.reflection.compared !== 'boolean')) {
      delete saved.state.reflection;
    }
    if (saved.state.episodeId !== undefined && typeof saved.state.episodeId !== 'string') return null;
    if (saved.state.episodeStartedAt !== undefined && !Number.isFinite(Date.parse(saved.state.episodeStartedAt))) return null;
    if (saved.state.promptStartedAt !== undefined && (typeof saved.state.promptStartedAt !== 'string' || !Number.isFinite(Date.parse(saved.state.promptStartedAt)) || Date.parse(saved.state.promptStartedAt) > Date.now())) delete saved.state.promptStartedAt;
    // Navigation queue only. Due dates remain in the existing sentence SRS.
    const review = saved.state.review;
    if (review !== undefined && (!review || !Array.isArray(review.pending) || !Number.isInteger(review.total) || review.total < 1 || review.total > 8 || review.pending.length > review.total || new Set(review.pending).size !== review.pending.length || review.pending.some((id) => typeof id !== 'string' || !id.trim() || id.length > 80))) return null;
    const continuation = saved.state.continuation;
    if (continuation && (!saved.state.episodeId || !['build', 'conversation'].includes(continuation.phase) || !Number.isInteger(continuation.sentenceIndex) || continuation.sentenceIndex < 0 || !Number.isInteger(continuation.filledSlots) || continuation.filledSlots < 0 || continuation.previousAttempt !== undefined && typeof continuation.previousAttempt !== 'string')) return null;
    if (continuation?.failures !== undefined && (!Number.isInteger(continuation.failures) || continuation.failures < 0 || continuation.failures > 2)) return null;
    if (continuation?.modelUsed !== undefined && typeof continuation.modelUsed !== 'boolean') return null;
    if (continuation?.order !== undefined && (!Array.isArray(continuation.order) || continuation.order.length > 8 || new Set(continuation.order).size !== continuation.order.length || continuation.order.some((index: number) => !Number.isInteger(index) || index < 0 || index > 7))) return null;
    if (continuation?.preparationStep !== undefined && (!Number.isSafeInteger(continuation.preparationStep) || continuation.preparationStep < 0)) {
      const cleaned = { ...continuation };
      delete cleaned.preparationStep;
      return { ...saved.state, continuation: cleaned };
    }
    return saved.state;
  } catch { return null; }
}
export function readTrickCheckpoint(userId: string, stopId: string, version: string): TrickCheckpoint | null {
  try {
    const saved = JSON.parse(progressStorage().getItem(key(userId, stopId)) || 'null');
    return saved?.version === version ? parseTrickCheckpoint(saved.state) : null;
  } catch { return null; }
}
export function writeTrickCheckpoint(userId: string, stopId: string, version: string, state: TrickCheckpoint) {
  try { progressStorage().setItem(key(userId, stopId), JSON.stringify({ version, state })); } catch { /* Practice remains possible without browser storage. */ }
}
export function clearTrickCheckpoint(userId: string, stopId: string) {
  try { progressStorage().setItem(key(userId, stopId), 'null'); } catch { /* No stored checkpoint. */ }
}
