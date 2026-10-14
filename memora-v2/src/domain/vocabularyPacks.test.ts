import { describe, expect, it } from 'vitest';
import { makeVocabularyPacks, vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import { reviewUnits } from '../preview/previewUnit';
import { validateUnit } from './unit';
describe('vocabulario independiente, sin fabricar misiones de gramática', () => {
  it('hace explorables los candidatos sin modificar las misiones originales', () => {
    expect(vocabularyPreviewPacks.flatMap((unit) => unit.words).length).toBe(488);
    expect(new Set(vocabularyPreviewPacks.flatMap((unit) => unit.words.map((word) => word.en))).size).toBe(488);
    expect(reviewUnits).toHaveLength(8);
    for (const pack of vocabularyPreviewPacks) {
      expect(() => validateUnit(pack)).not.toThrow();
      expect(pack.grammar).toEqual([]);
      expect(pack.sentence.slots).toEqual([]);
      expect(pack.words.every((word) => word.status !== 'approved')).toBe(true);
    }
  });
  it('solo permite omitir gramática en paquetes de palabras explícitos', () => {
    expect(() => validateUnit({ ...reviewUnits[0], grammar: [] })).toThrow();
    expect(() => makeVocabularyPacks([{ ...vocabularyPreviewPacks[0].words[0], bridge: 'PUENTE FALSO' }])).toThrow();
  });
});
