import { describe, expect, it } from 'vitest';
import { personalRank, summarizeLearning, type LearningSession, type RecallAttempt } from './learningProfile';

const units = [{ id: 'play', title: 'La playa' }, { id: 'dog', title: 'El perro' }];

describe('perfil de aprendizaje', () => {
  it('no inventa retención ni aciertos cuando aún no hay partidas', () => {
    const result = summarizeLearning([], [], units, new Map(), new Date('2026-10-10T12:00:00'));
    expect(result.accuracy).toBeNull();
    expect(result.activeDays).toBe(0);
    expect(result.daysSinceLastSession).toBeNull();
    expect(result.streakDays).toBe(0);
    expect(result.hardestWord).toBeNull();
    expect(result.recalledWords).toBe(0);
    expect(result.weakestCapability).toBeNull();
  });

  it('cuenta días, aciertos y repasos desde datos reales', () => {
    const sessions: LearningSession[] = [
      { unitId: 'play', completedAt: '2026-10-08T12:00:00', correct: 2, attempted: 3 },
      { unitId: 'play', completedAt: '2026-10-09T12:00:00', correct: 3, attempted: 3 },
      { unitId: 'dog', completedAt: '2026-10-10T12:00:00', correct: 1, attempted: 3 },
    ];
    const attempts: RecallAttempt[] = [
      { unitId: 'play', wordId: 1, word: 'PLAY', correct: false, at: '2026-10-10T12:00:00', direction: 'recall', error: 'meaning' },
      { unitId: 'play', wordId: 1, word: 'PLAY', correct: true, at: '2026-10-10T12:01:00', direction: 'recall' },
      { unitId: 'play', wordId: 2, word: 'DOG', correct: true, at: '2026-10-10T12:02:00', direction: 'production' },
    ];
    const progress = new Map([['play', { completedAt: '2026-10-09T12:00:00', nextReviewAt: '2026-10-10T11:00:00' }]]);
    const result = summarizeLearning(sessions, attempts, units, progress, new Date('2026-10-10T12:00:00'));
    expect(result.activeDays).toBe(3);
    expect(result.streakDays).toBe(3);
    expect(result.daysSinceLastSession).toBe(0);
    expect(result.accuracy).toBe(67);
    expect(result.dueReviews).toBe(1);
    expect(result.hardestWord?.word).toBe('PLAY');
    expect(result.recalledWords).toBe(2);
    expect(result.capabilitySummary.recall.accuracy).toBe(50);
    expect(result.capabilitySummary.production.accuracy).toBe(100);
    expect(result.errorCounts.meaning).toBe(1);
    expect(result.weakestCapability).toEqual({ direction: 'recall', accuracy: 50, attempted: 2 });
  });

  it('conserva la racha si el último juego fue ayer', () => {
    const sessions: LearningSession[] = [{ unitId: 'play', completedAt: '2026-10-09T12:00:00', correct: 3, attempted: 3 }];
    const result = summarizeLearning(sessions, [], units, new Map(), new Date('2026-10-10T12:00:00'));
    expect(result.streakDays).toBe(1);
    expect(result.daysSinceLastSession).toBe(1);
  });

  it('usa rangos personales basados en días reales, sin ranking inventado', () => {
    expect(personalRank(0)).toEqual({ name: 'Primer paso', nextAt: 1 });
    expect(personalRank(3)).toEqual({ name: 'Constante', nextAt: 7 });
    expect(personalRank(14)).toEqual({ name: 'Leyenda', nextAt: null });
  });
  it('no convierte una sesión terminada sin fallos en un 100% si hubo errores antes', () => {
    const at = '2026-10-12T10:00:00Z';
    const result = summarizeLearning([{ unitId: 'play', completedAt: at, correct: 1, attempted: 1 }], [
      { unitId: 'play', wordId: 1, word: 'PLAY', correct: false, at },
      { unitId: 'play', wordId: 1, word: 'PLAY', correct: true, at },
    ], units, new Map());
    expect(result.accuracy).toBe(50);
  });
});
