import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CognateAssociationCard } from './CognateAssociationCard';
import { wordVisual } from '../domain/wordVisual';
import { vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import type { AtomicWord } from '../domain/unit';

describe('cognados con la presentación visual original', () => {
  const adult: AtomicWord = { ...vocabularyPreviewPacks[0].words[0], en: 'ADULT', es: 'adulto', associationMode: 'cognate', emojis: ['🏙️'], imageUrl: undefined };
  it('conserva imagen, relación y audio sin inventar un puente', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard word={adult} index={0} total={3} onConnect={() => undefined} />);
    expect(html).toContain('scene-visual');
    expect(html).toContain('🧑');
    expect(html).toContain('Se parece al español y comparte este significado.');
    expect(html).toContain('round-audio');
    expect(html).toContain('PALABRA 1/3');
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
  it('conserva la palabra larga visible aunque el audio esté bloqueado', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard word={{ ...adult, en: 'CONFIGURATION', es: 'configuración' }} index={0} total={1} audioState={{ status: 'blocked', source: 'recording' }} onConnect={() => undefined} />);
    expect(html).toContain('CONFIGURATION');
    expect(html).toContain('word-heading');
    expect(html).toContain('is-revealed');
    expect(html).not.toContain('audio-glass');
    expect(html).toContain('Audio no disponible · toca 🔊');
    expect(html.indexOf('role="status"')).toBeLessThan(html.indexOf('<details'));
    expect(html.match(/role="status"/gu)).toHaveLength(1);
  });
  it('SCIENCE vertical compara con ciencia; la imagen de libros queda como ayuda opcional', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard vertical word={{ ...adult, en: 'SCIENCE', es: 'ciencia' }} index={1} total={3} onConnect={() => {}} />);
    expect(html).toContain('cognate-connection'); expect(html).toContain('Ya lo conoces');
    expect(html).toContain('aria-label="SCIENCE"'); expect(html).toContain('aria-label="ciencia"');
    expect(html).toContain('is-shared'); expect(html).toContain('is-different');
    expect(html.indexOf('scene-visual')).toBeGreaterThan(html.indexOf('<details'));
  });
  it('el cognado de una escena enseña el inglés y propone recuperación, no copiarlo en letras', () => {
    const html = renderToStaticMarkup(<CognateAssociationCard vertical rehearseWord={false} word={adult} index={2} total={3} onConnect={() => {}} />);
    expect(html).toContain('aria-label="ADULT"');
    expect(html).toContain('Recuerda las palabras');
    expect(html).not.toContain('Armar la palabra');
  });
});
