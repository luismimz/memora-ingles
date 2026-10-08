import { describe, expect, it } from 'vitest';
import { creativeSentenceIssues, sentenceVariantsFor } from './ExposureCard';
import type { Word } from '../types';

const hang = {
  id: 1, rank: 1, day: 1, en: 'hang', es: 'colgar', pos: 'verb', ipa: null, pron_es: 'JANG',
  example_en: 'Hang your coat here.', example_es: 'Cuelga tu abrigo aquí.', topic: null, kind: 'keyword',
  hint_es: null, arpabet: null, pilot: null,
  examples: [{ en: 'Hang on, Tom.', es: 'Espera, Tom.' }, { en: 'Hang the picture over the sofa.', es: 'Cuelga el cuadro sobre el sofá.' }],
} satisfies Word;

describe('producción propia', () => {
  it('no mezcla hang = colgar con hang on = esperar', () => {
    const variants = sentenceVariantsFor(hang);
    expect(variants[0].en).toBe('Hang your coat here.');
    expect(variants.map((item) => item.en)).not.toContain('Hang on, Tom.');
  });

  it('evalúa requisitos libres y nunca corrige hacia la frase modelo', () => {
    expect(creativeSentenceIssues(hang, 'Hang on tomorrow with my friend', 'Hang your coat here.').join(' ')).toContain('significa «espera»');
    expect(creativeSentenceIssues(hang, 'I hang my coat here every morning', 'Hang your coat here.')).toEqual([]);
  });
});
