import { describe, expect, it } from 'vitest';
import { catalogueStats } from './catalogueStats';
import type { UnitSummary } from '../services/directus';

const unit = (id: string, terms: string[]): UnitSummary => ({ id, title: id, words: terms.map((en) => ({ en, es: en })) });
describe('available catalogue, independent of learner mastery', () => {
  it('deduplicates across missions, case, spaces and Unicode forms', () => {
    expect(catalogueStats([unit('a', ['KEY', 'key ', ' ＫＥＹ ', 'BOOK']), unit('b', ['book', 'PHONE'])])).toEqual({ words: 3, expressions: 0 });
  });
  it('counts phrasal expressions separately, without counting each as a word', () => {
    expect(catalogueStats([unit('a', ['TURN', 'TURN ON', 'turn   on', 'LOOK FOR', ''])])).toEqual({ words: 1, expressions: 2 });
  });
  it('handles missing or empty catalogue without inventing totals', () => {
    expect(catalogueStats([{ id: 'empty', title: 'empty' }])).toEqual({ words: 0, expressions: 0 });
    expect(catalogueStats([])).toEqual({ words: 0, expressions: 0 });
  });
});
