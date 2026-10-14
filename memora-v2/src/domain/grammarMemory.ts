import { appendProgress, progressStorage } from './progressJournal';

export interface GrammarAttempt { skill: string; unitId: string; check: string; kind: 'choose' | 'explain' | 'write'; correct: boolean; helped: boolean; at: string }
export function readGrammarAttempts(userId: string): GrammarAttempt[] {
  try { const data = JSON.parse(progressStorage().getItem(`memora-v2.grammar.${userId}`) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export function recordGrammarAttempt(userId: string, attempt: GrammarAttempt) {
  appendProgress(userId, 'grammar', [attempt], attempt.at);
  try { progressStorage().setItem(`memora-v2.grammar.${userId}`, JSON.stringify([...readGrammarAttempts(userId), attempt].slice(-2000))); } catch { /* Journal still provides the server copy when available. */ }
}
