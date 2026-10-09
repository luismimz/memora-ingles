import { describe, expect, it } from 'vitest';
import { sentenceContainsSource, sentenceMissionFromWord } from './sentenceMission';

describe('Directus sentence mission adapter', () => {
  it('maps the complete Directus contract without local content', () => {
    const mission = sentenceMissionFromWord({
      en: 'hide', es: 'esconder', ipa: '/haɪd/', bridge_word: 'JAIBA',
      scene_es: 'Una JAIBA se esconde dentro de mi ZAPATILLA.',
      target_sentence_es: 'El cangrejo se esconde en mi zapato.',
      target_sentence_en: 'The crab hides in my shoe.', distractor: 'find',
    });
    expect(mission).not.toBeNull();
    expect(mission?.context).toContain('ZAPATILLA');
    expect(mission?.bridgeEs).toBe('JAIBA');
    expect(mission?.targetSentenceEn).toBe('The crab hides in my shoe.');
    expect(mission?.correctWords.length).toBeGreaterThanOrEqual(5);
    expect(mission?.distractors).toEqual(['find']);
  });

  it('excludes incomplete Directus rows instead of fabricating a sentence', () => {
    const mission = sentenceMissionFromWord({ en: 'unknown', es: 'desconocido', ipa: null });
    expect(mission).toBeNull();
  });

  it('accepts an irregular inflected form present in the Directus sentence', () => {
    const mission = sentenceMissionFromWord({
      en: 'break', es: 'romper', bridge_word: 'BREAK-DANCE', scene_es: 'Un robot rompe una impresora.',
      target_sentence_es: 'El robot rompió la impresora durante el karaoke.',
      target_sentence_en: 'The robot broke the printer during karaoke.', distractor: 'fix',
      irregular_forms: { v1: 'break', v2: 'broke', v3: 'broken' },
    });
    expect(mission?.sourceWord).toBe('break');
  });

  it.each([
    ['move', 'We moved to Madrid last year.'],
    ['hire', 'The company hired three developers yesterday.'],
    ['dig', 'The dog is digging in the garden.'],
    ['butcher', "The butcher's is closed today."],
  ])('accepts the regular/genitive form for %s', (source, sentence) => {
    expect(sentenceContainsSource(sentence, source)).toBe(true);
  });

  it('maps the four previously rejected valid rows into missions', () => {
    const rows = [
      ['move', 'mover', 'MOVE-MÓVIL', 'Un móvil se mueve solo por Madrid.', 'El móvil se movió por Madrid.', 'We moved to Madrid last year.', 'stay'],
      ['hire', 'contratar', 'JAIR', 'Jair contrata a un robot para cocinar.', 'La empresa contrató a tres desarrolladores.', 'The company hired three developers yesterday.', 'fire'],
      ['dig', 'cavar', 'DIG-DIG', 'Un perro cava un túnel hasta el servidor.', 'El perro está cavando en el jardín.', 'The dog is digging in the garden.', 'fill'],
      ['butcher', 'carnicero', 'BÚCHE', 'El carnicero guarda una llave en su tienda.', 'La carnicería está cerrada hoy.', "The butcher's is closed today.", 'open'],
    ] as const;

    for (const [en, es, bridge_word, scene_es, target_sentence_es, target_sentence_en, distractor] of rows) {
      expect(sentenceMissionFromWord({
        en, es, bridge_word, scene_es, target_sentence_es, target_sentence_en, distractor,
      })).not.toBeNull();
    }
  });
});
