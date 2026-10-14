import { describe, expect, it } from 'vitest';
import { curriculumAnswer, curriculumPieces, grammarCurriculum, validateGrammarCurriculum } from './grammarCurriculum';

describe('catálogo editorial de Fichas Espejo', () => {
  it('conserva 36 patrones distintos y 111 ejemplos, todavía sin aprobar', () => {
    expect(grammarCurriculum).toHaveLength(36);
    expect(grammarCurriculum.flatMap((pattern) => pattern.examples)).toHaveLength(111);
    expect(grammarCurriculum.every((pattern) => pattern.status === 'needs_review')).toBe(true);
    expect(() => validateGrammarCurriculum(grammarCurriculum)).not.toThrow();
  });
  it('acepta las variantes redactadas y no acepta los errores del patrón', () => {
    for (const pattern of grammarCurriculum) {
      for (const sample of pattern.examples) {
        for (const answer of sample.answers) expect(curriculumAnswer(sample, answer)).toBe(true);
        expect(curriculumAnswer(sample, pattern.wrong)).toBe(false);
      }
    }
    const now = grammarCurriculum.find((pattern) => pattern.id === 'present-now')!;
    expect(curriculumAnswer(now.examples[0], "I'm playing")).toBe(true);
    expect(curriculumAnswer(now.examples[0], 'I playing')).toBe(false);
  });
  it('no inventa equivalencias causativas ni confunde LIKE con ENJOY', () => {
    const mirrors = grammarCurriculum.flatMap((pattern) => pattern.examples).map((sample) => sample.mirror.map((piece) => piece.text).join(' '));
    expect(mirrors.some((text) => /har[éí]a? (aprobar|estudiar|comprar|ayudar|llamar)/i.test(text))).toBe(false);
    const like = grammarCurriculum.find((pattern) => pattern.id === 'verb-partners')!.examples[2];
    expect(like.mirror.map((piece) => piece.text).join(' ')).toBe('A MÍ me gusta jugar.');
  });
  it('las dependencias no pueden formar ciclos o referir fichas ausentes', () => {
    const cyclic = grammarCurriculum.map((pattern) => pattern.id === 'possessives' ? { ...pattern, prerequisites: ['be'] } : pattern);
    expect(() => validateGrammarCurriculum(cyclic)).toThrow('Ciclo curricular');
    expect(() => curriculumPieces('X:inventado')).toThrow('Pieza no revisada');
  });
});
