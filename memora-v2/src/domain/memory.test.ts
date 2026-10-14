import { beforeEach, describe, expect, it, vi } from 'vitest';
import { associationNeedsReview, associationsNeedingReview, chunkKey, compareAssociationVersions, isKnownForDirection, isKnownWord, isSentenceReady, recordWordRecall, replaceAssociation, shouldReduceDifficulty, type ChunkMemory, type WordMemory } from './memory';
import legacyPlay from '../../content/stage0-play-dog-beach.json';
import { validateUnit } from './unit';
const previewUnit = validateUnit(legacyPlay);

describe('desbloqueo de escritura', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  const sentence = previewUnit.sentence;
  const chunks = sentence.slots.map((slot, index): ChunkMemory => ({
    key: chunkKey(previewUnit.id, sentence, index), unitId: previewUnit.id,
    sentenceEn: sentence.en, sentenceEs: sentence.es, slot,
    firstSeenAt: '2026-10-10T10:00:00.000Z', lastAttemptAt: '2026-10-12T10:00:00.000Z',
    nextReviewAt: '2026-10-15T10:00:00.000Z', step: 2, attempts: 2, correct: 2, lapses: 0,
  }));

  it('exige que cada pieza se haya recordado en dos repasos', () => {
    expect(isSentenceReady(chunks, previewUnit.id, sentence)).toBe(true);
    expect(isSentenceReady(chunks.slice(1), previewUnit.id, sentence)).toBe(false);
    expect(isSentenceReady(chunks.map((chunk, index) => index === 2 ? { ...chunk, step: 1 } : chunk), previewUnit.id, sentence)).toBe(false);
  });

  describe('dominio adaptativo por capacidad', () => {
    const word = previewUnit.words[0];
    const known: WordMemory = {
      key: word.en.toLowerCase(), word, firstSeenAt: '2026-10-01T10:00:00.000Z',
      lastAttemptAt: '2026-10-10T10:00:00.000Z', nextReviewAt: '2026-10-20T10:00:00.000Z',
      step: 5, attempts: 12, correct: 12, lapses: 0,
      capabilities: {
        recognition: { attempts: 3, correct: 3, independentAttempts: 3, independentCorrect: 3, deferredCorrect: 1, lastAttemptAt: '2026-10-10T10:00:00.000Z' },
        auditory: { attempts: 3, correct: 3, independentAttempts: 3, independentCorrect: 3, deferredCorrect: 1, lastAttemptAt: '2026-10-10T10:00:00.000Z' },
        recall: { attempts: 3, correct: 3, independentAttempts: 3, independentCorrect: 3, deferredCorrect: 1, lastAttemptAt: '2026-10-10T10:00:00.000Z' },
        production: { attempts: 3, correct: 3, independentAttempts: 3, independentCorrect: 3, deferredCorrect: 1, lastAttemptAt: '2026-10-10T10:00:00.000Z' },
      },
    };

    it('solo marca conocida una palabra dominada en las cuatro capacidades', () => {
      expect(isKnownWord(known)).toBe(true);
      expect(isKnownForDirection(known, 'production')).toBe(true);
      expect(isKnownForDirection({ ...known, capabilities: { ...known.capabilities, production: { attempts: 3, correct: 2, lastAttemptAt: known.lastAttemptAt } } }, 'production')).toBe(false);
    });

    it('no considera dominio una exposición antigua sin intentos por capacidad', () => {
      expect(isKnownWord({ ...known, capabilities: undefined })).toBe(false);
    });
    it('no cuenta respuestas con ayuda como dominio autónomo', () => {
      let result: WordMemory | undefined;
      for (let day = 1; day <= 4; day++) result = recordWordRecall('cued', word, 'quick', new Date(`2026-10-0${day}T10:00:00Z`), 'production', undefined, true);
      expect(result?.capabilities?.production?.independentCorrect).toBe(0);
      expect(isKnownForDirection(result, 'production')).toBe(false);
    });
    it('exige recuerdo diferido y mantiene calendarios separados', () => {
      const at = new Date('2026-10-01T10:00:00Z');
      for (let i = 0; i < 3; i++) recordWordRecall('timed', word, 'quick', new Date(at.getTime() + i * 60_000), 'recall');
      const audio = recordWordRecall('timed', word, 'missed', new Date(at.getTime() + 4 * 60_000), 'auditory');
      expect(isKnownForDirection(audio, 'recall')).toBe(false);
      expect(audio.capabilities?.recall?.nextReviewAt).not.toBe(audio.capabilities?.auditory?.nextReviewAt);
      const delayed = recordWordRecall('timed', word, 'quick', new Date('2026-10-03T10:00:00Z'), 'recall');
      expect(isKnownForDirection(delayed, 'recall')).toBe(true);
    });

    it('reduce dificultad ante señales combinadas de fatiga', () => {
      expect(shouldReduceDifficulty({ consecutiveMisses: 3, averageResponseMs: 4_000, cueDependency: 0, abandonedPrompts: 0 })).toBe(true);
      expect(shouldReduceDifficulty({ consecutiveMisses: 1, averageResponseMs: 4_000, cueDependency: 0, abandonedPrompts: 0 })).toBe(false);
    });

    it('conserva el calendario anterior y recalibra una asociación nueva', () => {
      const userId = 'association-version-test';
      const oldWord = { ...word, associationId: 'play-scene', associationVersion: 1 };
      const first = recordWordRecall(userId, oldWord, 'quick', new Date('2026-10-01T10:00:00.000Z'), 'recall');
      const updated = recordWordRecall(userId, { ...word, associationId: 'play-scene', associationVersion: 2, changeReason: 'escena más directa' }, 'quick', new Date('2026-10-10T10:00:00.000Z'), 'recall');
      expect(first.step).toBe(0);
      expect(updated.step).toBe(0);
      expect(updated.attempts).toBe(1);
      expect(updated.supersedes).toBe('play-scene:v1');
      expect(updated.changeReason).toBe('escena más directa');
      expect(updated.associationHistory).toHaveLength(1);
      expect(updated.associationHistory?.[0].attempts).toBe(1);
    });

    it('registra un fallo de repaso diferido y marca la asociación para revisión', () => {
      const userId = 'deferred-review-test';
      const oldWord = { ...word, associationId: 'play-scene', associationVersion: 1 };
      recordWordRecall(userId, oldWord, 'quick', new Date('2026-10-01T10:00:00.000Z'), 'recall');
      const reviewed = recordWordRecall(userId, oldWord, 'missed', new Date('2026-10-09T10:00:00.000Z'), 'recall');
      expect(reviewed.sevenDayFailures).toBe(1);
      expect(reviewed.lastSevenDayReviewAt).toBe('2026-10-09T10:00:00.000Z');
      expect(associationNeedsReview(reviewed)).toBe(false);
      const second = recordWordRecall(userId, oldWord, 'missed', new Date('2026-10-17T10:00:00.000Z'), 'recall');
      expect(second.sevenDayFailures).toBe(2);
      expect(associationNeedsReview(second)).toBe(true);
    });

    it('ordena la cola de revisión por fallos diferidos y después por precisión', () => {
      const userId = 'review-queue-test';
      const firstWord = { ...word, associationId: 'first', associationVersion: 1 };
      const secondWord = { ...previewUnit.words[1], associationId: 'second', associationVersion: 1 };
      recordWordRecall(userId, firstWord, 'missed', new Date('2026-10-01T10:00:00.000Z'), 'recall');
      recordWordRecall(userId, firstWord, 'missed', new Date('2026-10-09T10:00:00.000Z'), 'recall');
      recordWordRecall(userId, firstWord, 'missed', new Date('2026-10-17T10:00:00.000Z'), 'recall');
      recordWordRecall(userId, secondWord, 'missed', new Date('2026-10-01T10:00:00.000Z'), 'recall');
      recordWordRecall(userId, secondWord, 'missed', new Date('2026-10-09T10:00:00.000Z'), 'recall');
      recordWordRecall(userId, secondWord, 'missed', new Date('2026-10-17T10:00:00.000Z'), 'recall');
      const queue = associationsNeedingReview(userId);
      expect(queue.map((item) => item.word.en)).toEqual([firstWord.en, secondWord.en]);
    });

    it('instala una asociación aprobada antes del siguiente intento', () => {
      const userId = 'association-replace-test';
      const oldWord = { ...word, associationId: 'play-scene', associationVersion: 1 };
      recordWordRecall(userId, oldWord, 'quick', new Date('2026-10-01T10:00:00.000Z'), 'recall');
      const replacement = replaceAssociation(userId, { ...word, associationId: 'play-scene', associationVersion: 2 }, 'puente anterior poco claro', new Date('2026-10-12T10:00:00.000Z'));
      expect(replacement?.attempts).toBe(0);
      expect(replacement?.step).toBe(0);
      expect(replacement?.supersedes).toBe('play-scene:v1');
      expect(replacement?.associationHistory?.[0].changeReason).toBe('puente anterior poco claro');
      expect(compareAssociationVersions(replacement)).toEqual({
        previousAccuracy: 1, currentAccuracy: null, previousAttempts: 1, currentAttempts: 0, currentImproved: null,
        basis: 'overall',
      });
      const recallComparison = compareAssociationVersions({
        ...replacement!,
        attempts: 4,
        correct: 1,
        capabilities: {
          recall: { attempts: 4, correct: 3, lastAttemptAt: '2026-10-12T10:00:00.000Z' },
        },
        associationHistory: [{
          ...replacement!.associationHistory![0],
          attempts: 4,
          correct: 1,
          capabilities: {
            recall: { attempts: 4, correct: 1, lastAttemptAt: '2026-10-01T10:00:00.000Z' },
          },
        }],
      });
      expect(recallComparison).toMatchObject({
        previousAccuracy: 0.25, currentAccuracy: 0.75, previousAttempts: 4, currentAttempts: 4,
        basis: 'recall', currentImproved: true,
      });
      expect(replaceAssociation(userId, { ...word, associationId: 'play-scene', associationVersion: 2 }, 'duplicada')).toBeNull();
    });
  });
});
