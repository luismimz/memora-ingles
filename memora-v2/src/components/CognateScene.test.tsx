import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import { SceneVisual } from './SceneVisual';
import { CognateAssociationCard } from './CognateAssociationCard';
import { cognateSceneKind } from '../domain/wordVisual';

const words = vocabularyPreviewPacks.flatMap((pack) => pack.words).filter((word) => word.associationMode === 'cognate');
describe('cognados visuales, no fichas solo informativas', () => {
  it.each(['HOTEL', 'INFORMATION'])('%s conserva una escena tanto al aprender como en Arcade', (en) => {
    const word = words.find((item) => item.en === en)!;
    const html = renderToStaticMarkup(<CognateAssociationCard word={word} index={0} total={3} onConnect={() => {}} />);
    expect(html).toContain(`data-cognate-scene="${en.toLowerCase()}"`);
    expect(html).toContain('round-audio');
    const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
    expect(hidden).toContain('cognate-scene');
    expect(hidden).not.toContain('scene-memory-link');
    expect(hidden).not.toContain('<text');
    expect(hidden).not.toContain(word.en);
    expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
  });
  it('todos los cognados mantienen un bloque visual aunque no tengan foto', () => {
    expect(words.length).toBeGreaterThan(400);
    for (const word of words) {
      const html = renderToStaticMarkup(<SceneVisual word={word} />);
      expect(html).toContain('role="img"');
      expect(html.includes('cognate-scene') || html.includes('scene-emoji')).toBe(true);
      expect(html).not.toContain('<span></span>');
    }
  });
  it('no sustituye una asociación acústica por una imagen directa de cognados', () => {
    const hotel = words.find((item) => item.en === 'HOTEL')!;
    expect(cognateSceneKind({ ...hotel, associationMode: 'acoustic_bridge', bridge: 'otro' })).toBeUndefined();
  });
});
