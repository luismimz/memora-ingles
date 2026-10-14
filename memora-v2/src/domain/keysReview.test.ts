import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import raw from '../../content/keys-mission.json';
import { validateUnit } from './unit';
import { recordSentenceExposure, readSentenceMemories, dueSentenceMemories, recordSentenceRecall } from './memory';
import { makeDeck } from '../components/DailyArcade';
import { loadLearningProfile } from './learningProfile';

describe('recuperación posterior del diálogo', () => {
  const unit = validateUnit(raw);
  const turn = unit.communication!.dialogue!.turns[0];
  const sentence = { en: turn.en, es: turn.es, slots: [], pronunciationTip: unit.communication!.dialogue!.rhythmTip };
  const start = new Date('2026-10-12T10:00:00Z');
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    vi.useFakeTimers(); vi.setSystemTime(start);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('consultar o volver a exponer la frase no duplica ni retrasa el repaso', () => {
    recordSentenceExposure('test', unit.id, sentence, start);
    recordSentenceExposure('test', unit.id, sentence, new Date(start.getTime() + 1000));
    const memories = readSentenceMemories('test');
    expect(memories).toHaveLength(1);
    expect(memories[0].attempts).toBe(0);
    expect(dueSentenceMemories('test', start.getTime() + 3_600_000)).toHaveLength(1);
  });
  it('Arcade recupera la pregunta escrita al vencer, sin depender de piezas inexistentes', () => {
    recordSentenceExposure('test', unit.id, sentence, start);
    expect(makeDeck('test', [unit], false).some((round) => round.kind === 'sentence')).toBe(false);
    vi.setSystemTime(start.getTime() + 3_600_001);
    const round = makeDeck('test', [unit], false).find((round) => round.kind === 'sentence');
    expect(round?.answer).toBe('What are you looking for?');
    expect(round?.unitId).toBe(unit.id);
    expect(round?.choices).toEqual([]);
    expect(loadLearningProfile('test', [unit]).dueSentences).toBe(1);
  });
  it('el acierto diferido amplía el intervalo, y un fallo programa un nuevo intento', () => {
    recordSentenceExposure('test', unit.id, sentence, start);
    const key = readSentenceMemories('test')[0].key;
    const due = new Date(start.getTime() + 3_600_001);
    const remembered = recordSentenceRecall('test', key, 'quick', due)!;
    expect(remembered.step).toBe(1);
    expect(Date.parse(remembered.nextReviewAt)).toBeGreaterThan(due.getTime() + 3_600_000);
    const missed = recordSentenceRecall('test', key, 'missed', new Date(remembered.nextReviewAt))!;
    expect(missed.lapses).toBe(1);
    expect(Date.parse(missed.nextReviewAt) - Date.parse(missed.lastAttemptAt!)).toBe(600_000);
  });
});
