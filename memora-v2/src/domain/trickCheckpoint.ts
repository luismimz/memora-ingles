import { progressStorage } from './progressJournal';

export interface TrickCheckpoint { stage: number; checkIndex: number; input: string; feedback: 'idle' | 'help' | 'correct'; helped: boolean }
const key = (userId: string, stopId: string) => `memora-v2.trick.${userId}.${stopId}`;
export function readTrickCheckpoint(userId: string, stopId: string, version: string): TrickCheckpoint | null {
  try {
    const saved = JSON.parse(progressStorage().getItem(key(userId, stopId)) || 'null');
    if (!saved || saved.version !== version || !Number.isInteger(saved.state?.stage) || saved.state.stage < 0 || !Number.isInteger(saved.state.checkIndex) || saved.state.checkIndex < 0 || typeof saved.state.input !== 'string' || !['idle', 'help', 'correct'].includes(saved.state.feedback) || typeof saved.state.helped !== 'boolean') return null;
    return saved.state;
  } catch { return null; }
}
export function writeTrickCheckpoint(userId: string, stopId: string, version: string, state: TrickCheckpoint) {
  try { progressStorage().setItem(key(userId, stopId), JSON.stringify({ version, state })); } catch { /* Practice remains possible without browser storage. */ }
}
export function clearTrickCheckpoint(userId: string, stopId: string) {
  try { progressStorage().setItem(key(userId, stopId), 'null'); } catch { /* No stored checkpoint. */ }
}
