import { describe, expect, it } from 'vitest';
import { normalizeSentenceAnswer } from './sentenceAnswer';

describe('escritura de frases', () => {
  it('acepta puntuación y contracciones equivalentes', () => {
    expect(normalizeSentenceAnswer("I'm playing with my dog on the beach.")).toBe(
      normalizeSentenceAnswer('I am playing with my dog on the beach'),
    );
    expect(normalizeSentenceAnswer('You’re washing my dog!')).toBe(normalizeSentenceAnswer('You are washing my dog'));
  });

  it('no acepta palabras ausentes ni una estructura distinta', () => {
    expect(normalizeSentenceAnswer('I playing with my dog')).not.toBe(normalizeSentenceAnswer("I'm playing with my dog"));
  });
});
