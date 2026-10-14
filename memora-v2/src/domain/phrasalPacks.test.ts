import { describe, expect, it } from 'vitest';
import { phrasalFamilies } from './phrasalFamilies';
import { makePhrasalPacks, phrasalPreviewPacks } from '../preview/phrasalPacks';
import { validateUnit } from './unit';

describe('phrasal verbs preparados antes de evaluar', () => {
  it('convierte las 20 fusiones en paquetes reales sin inventar gramática', () => {
    const words = phrasalPreviewPacks.flatMap((pack) => pack.words);
    expect(words).toHaveLength(20);
    expect(new Set(words.map((word) => word.en)).size).toBe(20);
    for (const pack of phrasalPreviewPacks) {
      expect(() => validateUnit(pack)).not.toThrow();
      expect(pack.kind).toBe('vocabulary-pack');
      expect(pack.grammar).toEqual([]); expect(pack.sentence.slots).toEqual([]);
      expect(pack.activeRecall).toBe(true);
      expect(pack.words.every((word) => word.status === 'needs_review' && !word.editorialReview)).toBe(true);
    }
  });
  it('cada expresión conserva una historia corta y un ejemplo del sentido enseñado', () => {
    for (const family of phrasalFamilies) {
      const words = makePhrasalPacks(family).flatMap((pack) => pack.words);
      for (const item of family.discoveries) {
        const word = words.find((word) => word.en === `${family.base} ${item.particle}`)!;
        expect(word.usageExample).toEqual({ en: item.sentence, es: item.translation });
        expect(word.bridgeEvidence?.soundRelation).toContain('no como traducción universal');
        expect(word.scene.split(/\s+/).length).toBeLessThanOrEqual(12);
      }
    }
  });
});
