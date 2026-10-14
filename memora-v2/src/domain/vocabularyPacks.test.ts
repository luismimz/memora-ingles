import { describe, expect, it } from 'vitest';
import { makeVocabularyPacks, vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import { reviewUnits } from '../preview/previewUnit';
import { validateUnit } from './unit';
describe('vocabulario independiente, sin fabricar misiones de gramática', () => {
  it('hace explorables los candidatos sin modificar las misiones originales', () => {
    expect(vocabularyPreviewPacks.flatMap((unit) => unit.words).length).toBe(500);
    expect(new Set(vocabularyPreviewPacks.flatMap((unit) => unit.words.map((word) => word.en))).size).toBe(500);
    expect(reviewUnits).toHaveLength(8);
    for (const pack of vocabularyPreviewPacks) {
      expect(() => validateUnit(pack)).not.toThrow();
      expect(pack.grammar).toEqual([]);
      expect(pack.sentence.slots).toEqual([]);
      expect(pack.words.every((word) => word.status !== 'approved')).toBe(true);
    }
  });
  it('los puentes reales se guardan como candidatos y no como medios o dominio aprobados', () => {
    const mnemonicWords = vocabularyPreviewPacks.flatMap((pack) => pack.words).filter((word) => word.associationMode === 'acoustic_bridge');
    expect(mnemonicWords).toHaveLength(12);
    for (const word of mnemonicWords) {
      expect(word.bridgeEvidence?.spanishCue).toBe(word.bridge);
      expect(word.bridgeEvidence?.familiarMeaning).toBeTruthy();
      expect(word.bridgeEvidence?.soundRelation).toBeTruthy();
      expect(word.audioProvenance).toBeUndefined();
      expect(word.editorialReview).toBeUndefined();
    }
  });
  it('solo permite omitir gramática en paquetes de palabras explícitos', () => {
    expect(() => validateUnit({ ...reviewUnits[0], grammar: [] })).toThrow();
    expect(() => makeVocabularyPacks([{ ...vocabularyPreviewPacks[0].words[0], bridge: 'PUENTE FALSO' }])).toThrow();
  });
});
