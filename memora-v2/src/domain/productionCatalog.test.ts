import { describe, expect, it } from 'vitest';
import source from '../../../content/wordlist.txt?raw';
import { parseProductionCandidates, countUniqueVocabulary } from './productionCatalog';

describe('inventario para la expansión sin inflar el progreso', () => {
  it('no cuenta repeticiones, clases gramaticales ni chunks como palabras adicionales', () => {
    const input = '## 1 | Casa\nwork|trabajar|v\nwork|trabajo|n\nlook for|buscar|phr\n## 2 | Oficina\nwork|trabajar|v';
    const candidates = parseProductionCandidates(input);
    expect(candidates).toHaveLength(3);
    expect(countUniqueVocabulary(candidates)).toBe(1);
    expect(candidates[0].domains).toEqual(['Casa', 'Oficina']);
    expect(candidates.every((candidate) => candidate.status === 'needs_review')).toBe(true);
  });
  it('conserva más de mil candidatos históricos sin fingir que estén aprobados', () => {
    const candidates = parseProductionCandidates(source);
    expect(countUniqueVocabulary(candidates)).toBeGreaterThan(1000);
    expect(candidates.some((candidate) => candidate.itemType === 'chunk')).toBe(true);
    expect(candidates.some((candidate) => candidate.lemma === 'bread')).toBe(true);
  });
});
