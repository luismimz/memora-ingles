import { initialGame, type GameState } from './game';

const key = (userId: string, unitId: string) => `memora-v2.checkpoint.${userId}.${unitId}`;
const mirrorKey = (userId: string, unitId: string) => `memora-v2.mirror-checkpoint.${userId}.${unitId}`;

/** A local navigation checkpoint, never evidence of learning or a completed attempt. */
export function readGameCheckpoint(userId: string, unitId: string, version: string): GameState | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(userId, unitId)) || 'null');
    if (!value || typeof value !== 'object') return null;
    const saved = value as { version?: string; state?: Partial<GameState> };
    if (saved.version !== version || !saved.state) return null;
    const state = saved.state;
    if (state.recognitionStyle !== undefined && state.recognitionStyle !== 'scene-delivery-v1') return null;
    if (state.recallChoice !== undefined && typeof state.recallChoice !== 'string') return null;
    if (state.recallOutcome !== undefined && !['correct', 'wrong', 'modeled'].includes(state.recallOutcome)) return null;
    if (state.recallOutcome === 'modeled' && state.recognitionStyle !== 'scene-delivery-v1') return null;
    if (!['associate', 'recall', 'reward', 'grammar', 'build', 'conversation'].includes(state.phase ?? '')) return null;
    if (![state.wordIndex, state.recallIndex, state.grammarIndex, state.sentenceIndex].every((index) => Number.isInteger(index) && index! >= 0)) return null;
    if (state.preparationStep !== undefined && (!Number.isInteger(state.preparationStep) || state.preparationStep < 0 || state.preparationStep > 3)) return null;
    if (state.buildModelUsed !== undefined && typeof state.buildModelUsed !== 'boolean') return null;
    if (state.buildRepair !== undefined && (!state.buildRepair || !Number.isInteger(state.buildRepair.failures) || state.buildRepair.failures < 1 || state.buildRepair.failures > 2 || typeof state.buildRepair.choice !== 'string' || (state.buildRepair.previousAttemptId !== undefined && typeof state.buildRepair.previousAttemptId !== 'string'))) return null;
    return { ...initialGame, ...state };
  } catch { return null; }
}

export function writeGameCheckpoint(userId: string, unitId: string, version: string, state: GameState): void {
  try { localStorage.setItem(key(userId, unitId), JSON.stringify({ version, state })); } catch { /* Private mode keeps the game playable. */ }
}

export function clearGameCheckpoint(userId: string, unitId: string): void {
  try { localStorage.removeItem(key(userId, unitId)); } catch { /* No navigation blocker. */ }
}

export function hasGameCheckpoint(userId: string, unitId: string): boolean {
  try { return Boolean(localStorage.getItem(key(userId, unitId)) || localStorage.getItem(mirrorKey(userId, unitId))); } catch { return false; }
}

export interface MirrorCheckpoint { stage: number; person: boolean; reveal: number; index: number; questionReady: boolean; seen: number[]; startedAt: string }

export function readMirrorCheckpoint(userId: string, unitId: string, version: string): MirrorCheckpoint | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(mirrorKey(userId, unitId)) || 'null');
    if (!value || typeof value !== 'object') return null;
    const saved = value as { version?: string; state?: Partial<MirrorCheckpoint> };
    const state = saved.state;
    if (saved.version !== version || !state || !Number.isInteger(state.stage) || state.stage! < 0 || state.stage! > 5 ||
      !Number.isInteger(state.index) || state.index! < 0 || !Number.isInteger(state.reveal) || state.reveal! < 0 || state.reveal! > 3 ||
      !Array.isArray(state.seen) || !state.seen.every((index) => Number.isInteger(index) && index >= 0) ||
      !state.startedAt || !Number.isFinite(Date.parse(state.startedAt))) return null;
    return state as MirrorCheckpoint;
  } catch { return null; }
}

export function writeMirrorCheckpoint(userId: string, unitId: string, version: string, state: MirrorCheckpoint): void {
  try { localStorage.setItem(mirrorKey(userId, unitId), JSON.stringify({ version, state })); } catch { /* Private mode keeps the lesson playable. */ }
}

export function clearMirrorCheckpoint(userId: string, unitId: string): void {
  try { localStorage.removeItem(mirrorKey(userId, unitId)); } catch { /* No navigation blocker. */ }
}
