import { describe, expect, it } from 'vitest';
import { afterExam, afterReview, gradeByTime, isDue, isLeech, MASTERED_STEP } from './srs';
import { checkAnswer, makeCloze, sentenceScore } from './answer';
import { retentionTable, streak } from './stats';
import type { Attempt } from '../types';

const H = 3600_000;
const T0 = Date.parse('2026-09-24T10:00:00Z');

describe('srs', () => {
  it('programa +1h tras el examen', () => {
    const s = afterExam('ok', 3000, T0);
    expect(s.step).toBe(1);
    expect(Date.parse(s.due_at!)).toBe(T0 + H);
  });

  it('respondiendo a tiempo recorre 1h, 24h, 3d, 7d, 14d, 30d y queda dominada', () => {
    let s = afterExam('ok', 2000, T0);
    const expected = [24, 72, 168, 336, 720];
    let now = T0 + H;
    for (const h of expected) {
      s = afterReview(s, 'ok', 2000, now);
      expect(Date.parse(s.due_at!)).toBe(T0 + h * H);
      now = T0 + h * H;
    }
    s = afterReview(s, 'ok', 2000, now);
    expect(s.step).toBe(MASTERED_STEP);
    expect(s.status).toBe('mastered');
  });

  it('un fallo retrocede un escalón, suma lapso y vuelve mañana', () => {
    let s = afterExam('ok', 2000, T0);
    s = afterReview(s, 'ok', 2000, T0 + H); // step 2
    s = afterReview(s, 'fail', 2000, T0 + 24 * H);
    expect(s.step).toBe(1);
    expect(s.lapses).toBe(1);
    expect(Date.parse(s.due_at!)).toBe(T0 + 44 * H);
  });

  it('dudar avanza con medio intervalo', () => {
    let s = afterExam('ok', 2000, T0);
    s = afterReview(s, 'doubt', 12000, T0 + H);
    expect(s.step).toBe(2);
    expect(Date.parse(s.due_at!)).toBe(T0 + H + 11.5 * H);
  });

  it('isDue / leech / gradeByTime', () => {
    expect(isDue({ status: 'learning', due_at: new Date(T0).toISOString() }, T0 + 1)).toBe(true);
    expect(isDue({ status: 'known', due_at: new Date(T0).toISOString() }, T0 + 1)).toBe(false);
    expect(isLeech({ lapses: 3, fail: 3 })).toBe(true);
    expect(gradeByTime(true, 12000)).toBe('doubt');
    expect(gradeByTime(true, 2000)).toBe('ok');
    expect(gradeByTime(false, 1000)).toBe('fail');
  });
});

describe('answer', () => {
  it('acepta alternativas, artículos y erratas', () => {
    expect(checkAnswer('borrow', 'borrow').correct).toBe(true);
    expect(checkAnswer('to borrow', 'borrow').correct).toBe(true);
    expect(checkAnswer('borow', 'borrow')).toEqual({ correct: true, typo: true });
    expect(checkAnswer('dejar', 'irse / dejar', 'es').correct).toBe(true);
    expect(checkAnswer('el tejado', 'tejado', 'es').correct).toBe(true);
    expect(checkAnswer('wall', 'roof').correct).toBe(false);
    expect(checkAnswer('cut', 'cat').correct).toBe(false); // palabras cortas: sin tolerancia
  });
  it('cloze y frases', () => {
    expect(makeCloze('I borrowed your pen.', 'borrow')).toBe('I _____ your pen.');
    expect(makeCloze('Nothing here', 'roof')).toBeNull();
    expect(sentenceScore("There's a cat on the roof", 'There is a cat on the roof')).toBeGreaterThan(0.6);
    expect(sentenceScore('a cat on the roof', 'a cat on the roof')).toBe(1);
  });
});

describe('stats', () => {
  it('usa solo el primer intento por palabra y ventana', () => {
    const at: Attempt[] = [
      { word: 1, study_day: 1, step: 0, kind: 'exam', mode: 'x', result: 'ok', ms: 1, hours_since_learned: 0, created_at: '1' },
      { word: 2, study_day: 1, step: 0, kind: 'exam', mode: 'x', result: 'fail', ms: 1, hours_since_learned: 0, created_at: '2' },
      { word: 2, study_day: 1, step: 0, kind: 'retry', mode: 'x', result: 'ok', ms: 1, hours_since_learned: 0, created_at: '3' },
      { word: 1, study_day: 1, step: 2, kind: 'review', mode: 'x', result: 'doubt', ms: 1, hours_since_learned: 25, created_at: '4' },
      { word: 1, study_day: 1, step: 2, kind: 'review', mode: 'x', result: 'ok', ms: 1, hours_since_learned: 26, created_at: '5' },
    ];
    const [row] = retentionTable(at, new Map([[1, 2]]));
    expect(row.cells.exam).toEqual({ n: 2, rate: 0.5 });
    expect(row.cells['24h']).toEqual({ n: 1, rate: 0.5 });
    expect(row.cells['7d'].rate).toBeNull();
  });
  it('racha', () => {
    expect(streak(['2026-09-22', '2026-09-23', '2026-09-24'], '2026-09-24')).toBe(3);
    expect(streak(['2026-09-22', '2026-09-23'], '2026-09-24')).toBe(2);
    expect(streak(['2026-09-20'], '2026-09-24')).toBe(0);
  });
});

describe('corrección de frases palabra a palabra', () => {
  it('«bog» no es «dog»: señala la palabra equivocada', async () => {
    const { diffWords } = await import('./answer');
    const d = diffWords('There is a bog', 'There is a dog');
    expect(d.filter((t) => t.status !== 'ok')).toEqual([{ word: 'dog', status: 'wrong', given: 'bog' }]);
  });
  it('contracciones equivalentes y erratas en palabras largas', async () => {
    const { diffWords, sentenceScore } = await import('./answer');
    expect(sentenceScore("There's a dog", 'There is a dog')).toBe(1);
    expect(sentenceScore('I want to lern English', 'I want to learn English')).toBe(1);
    expect(diffWords('I want to lern English', 'I want to learn English').find((t) => t.status === 'typo')?.given).toBe('lern');
  });
  it('detecta palabras que faltan y que sobran', async () => {
    const { diffWords } = await import('./answer');
    const d = diffWords('I want learn the English', 'I want to learn English');
    expect(d.find((t) => t.status === 'missing')?.word).toBe('to');
    expect(d.find((t) => t.status === 'extra')?.word).toBe('the');
  });
});
