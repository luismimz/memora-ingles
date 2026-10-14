import { describe, it, expect } from 'vitest';
import { restoreProgress } from './restoreProgress';
import type { ProgressEvent } from './progressJournal';
import examples from '../../content/review-examples.json';

const word = examples[0].words[0];
const event = (id: string, at: string, correct: boolean): ProgressEvent => ({ id, at, kind: 'word', args: [word, correct ? 'quick' : 'missed', 'recall', undefined, false] });
describe('progreso entre dispositivos', () => {
  it('conserva intentos de dos dispositivos y deduplica reenvíos', () => {
    const first = event('a', '2026-10-10T09:00:00Z', true);
    const second = event('b', '2026-10-12T09:00:00Z', false);
    const data = restoreProgress('learner', [second, first, second]);
    const [memory] = JSON.parse(data.get('memora-v2.memory.learner')!);
    expect(memory.attempts).toBe(2);
    expect(memory.correct).toBe(1);
    expect(memory.nextReviewAt).toBe('2026-10-12T09:10:00.000Z');
  });
  it('reconstruye lo mismo aunque la llegada de eventos esté desordenada', () => {
    const a = event('a', '2026-10-10T09:00:00Z', true);
    const b = event('b', '2026-10-12T09:00:00Z', true);
    expect([...restoreProgress('user', [a, b])]).toEqual([...restoreProgress('user', [b, a])]);
  });
  it('separa cuentas y no infiere dominio a partir de una migración', () => {
    const baseline: ProgressEvent = { id: 'seed', at: '2026-10-12T09:00:00Z', kind: 'baseline', args: [{ sessions: [{ unitId: 'old', completedAt: '2026-10-10T09:00:00Z', correct: 3, attempted: 3 }] }] };
    const restored = restoreProgress('other', [baseline, baseline]);
    expect(restored.has('memora-v2.memory.other')).toBe(false);
    expect(JSON.parse(restored.get('memora-v2.sessions.other')!)).toHaveLength(1);
    expect([...restored.keys()].every((key) => key.endsWith('.other'))).toBe(true);
  });
});
