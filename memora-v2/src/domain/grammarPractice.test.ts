import { describe, it, expect } from 'vitest';
import { grammarCaption, makeGrammarChecks } from './grammarPractice';
import { previewUnit } from '../preview/previewUnit';
describe('comprobación visual gramatical', () => {
  it('comprueba ING y cambio de persona con formas realmente enseñadas', () => {
    const checks = makeGrammarChecks(previewUnit.grammar[0]);
    expect(checks).toHaveLength(2);
    expect(checks[0].answer).toBe("I'm playing");
    expect(checks[1].answer).toBe("They're playing");
    for (const check of checks) expect(new Set(check.choices).size).toBe(2);
  });
  it('no inventa un ejercicio de ING para otra gramática', () => {
    expect(makeGrammarChecks({ ...previewUnit.grammar[0], id: 'imperatives', visualContract: 'imperative' })).toEqual([]);
  });
  it('explica las señales de detección una por paso', () => {
    const form = previewUnit.grammar[0];
    expect(grammarCaption(form, 1)).toContain('ANDO');
    expect(grammarCaption(form, 2)).toContain('ESTOY');
    expect(grammarCaption(form, 3)).toContain("I'M");
  });
});
