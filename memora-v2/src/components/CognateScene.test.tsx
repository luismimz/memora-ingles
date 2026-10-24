import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import { SceneVisual } from './SceneVisual';
import { CognateAssociationCard } from './CognateAssociationCard';
import { cognateSceneKind } from '../domain/wordVisual';
import radioScene from '../assets/cognate-radio-v1.svg?no-inline';
import musicScene from '../assets/cognate-music-v1.svg?no-inline';

const words = vocabularyPreviewPacks.flatMap((pack) => pack.words).filter((word) => word.associationMode === 'cognate');
describe('cognados visuales, no fichas solo informativas', () => {
  it.each(['RADIO', 'MUSIC'])('%s tiene una escena de significado propia sin cambiar aprobación, palabra o ayudas', (en) => {
    const word = words.find((item) => item.en === en)!;
    expect(word).toBeDefined();
    const before = JSON.stringify(word);
    const html = renderToStaticMarkup(<CognateAssociationCard word={word} index={0} total={3} audioState={{ status: 'blocked', source: null }} onConnect={() => {}} />);
    expect(html).toContain(`data-cognate-scene="${en.toLowerCase()}"`);
    const expectedImage = renderToStaticMarkup(<img src={en === 'RADIO' ? radioScene : musicScene} />);
    expect(html).toContain(expectedImage.match(/src="[^"]+"/)![0]);
    expect(html).toContain('round-audio');
    expect(html).toContain('Toca 🔊 para escuchar.');
    expect(html).not.toContain('PUENTE SONORO');
    const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
    expect(hidden).toContain(`data-cognate-scene="${en.toLowerCase()}"`);
    expect(hidden).not.toContain('scene-memory-link');
    expect(hidden).not.toContain('<text');
    expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
    expect(JSON.stringify(word)).toBe(before);
  });
  it('las nuevas escenas no pisan medios propios ni otro sentido o una asociación acústica', () => {
    const radio = words.find((item) => item.en === 'RADIO')!;
    const music = words.find((item) => item.en === 'MUSIC')!;
    expect(cognateSceneKind({ ...radio, imageUrl: 'own-radio-image' })).toBeUndefined();
    expect(cognateSceneKind({ ...radio, es: 'radio de un círculo' })).toBeUndefined();
    expect(cognateSceneKind({ ...radio, cognateEvidence: undefined })).toBeUndefined();
    expect(cognateSceneKind({ ...music, es: 'instrumento' })).toBeUndefined();
    expect(cognateSceneKind({ ...music, associationMode: 'acoustic_bridge', bridge: 'otra' })).toBeUndefined();
    expect(cognateSceneKind({ ...music, bridge: 'asociación propia' })).toBeUndefined();
  });
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
