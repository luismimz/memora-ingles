import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CognateAssociationCard } from './CognateAssociationCard';
import { wordVisual } from '../domain/wordVisual';
import { vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import type { AtomicWord } from '../domain/unit';

describe('cognados con la presentación visual original', () => {
  const adult: AtomicWord = { ...vocabularyPreviewPacks[0].words[0], en: 'ADULT', es: 'adulto', associationMode: 'cognate', emojis: ['🏙️'], imageUrl: undefined };
  it('conserva imagen, relación y audio sin inventar un puente', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard word={adult} index={0} total={3} revealed onConnect={() => undefined} />);
    expect(html).toContain('scene-visual');
    expect(html).toContain('🧑');
    expect(html).toContain('SE PARECE A');
    expect(html).toContain('round-audio');
    expect(html).toContain('ASOCIACIÓN 1/3');
    expect(html).not.toContain('PUENTE SONORO');
    expect(html).not.toContain('No necesitas inventar');
  });
  it('preserva las imágenes propias y no modifica el contenido almacenado', () => {
    expect(wordVisual({ ...adult, imageUrl: 'authored-image' }).imageUrl).toBe('authored-image');
    expect(wordVisual(adult).emojis).toEqual(['🧑']);
    expect(adult.emojis).toEqual(['🏙️']);
    const play = { ...adult, associationMode: 'acoustic_bridge' as const, en: 'PLAY' };
    expect(wordVisual(play)).toBe(play);
  });
  it('conserva la palabra larga completa y el estado de escucha', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard word={{ ...adult, en: 'CONFIGURATION', es: 'configuración' }} index={0} total={1} revealed={false} onConnect={() => undefined} />);
    expect(html).toContain('CONFIGURATION');
    expect(html).toContain('word-heading');
    expect(html).toContain('is-listening');
    expect(html).toContain('Escucha antes de leer');
  });
});
