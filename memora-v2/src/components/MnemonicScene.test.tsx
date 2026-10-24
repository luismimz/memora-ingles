import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewUnit } from '../preview/previewUnit';
import { SceneVisual } from './SceneVisual';
import { mnemonicSceneKind } from '../domain/wordVisual';

it.each([['COMPUTER', 'computer-compota'], ['DESK', 'desk-disco']])('%s recupera su historia visual exacta sin escribir la respuesta en la imagen', (en, kind) => {
  const word = previewUnit.words.find((item) => item.en === en)!;
  expect(word).toBeDefined();
  const before = JSON.stringify(word);
  expect(mnemonicSceneKind(word)).toBe(kind);
  const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
  expect(hidden).toContain(`data-mnemonic-scene="${kind}"`);
  expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
  expect(hidden).not.toContain('scene-memory-link');
  expect(hidden).not.toContain('memory-english');
  expect(hidden).not.toContain('<text');
  expect(hidden).not.toContain(en);
  expect(hidden).toContain('draggable="false"');
  const teaching = renderToStaticMarkup(<SceneVisual word={word} showMemoryLink />);
  expect(teaching).toContain(word.bridge);
  expect(teaching).toContain(en);
  expect(JSON.stringify(word)).toBe(before);
});

it('otra escena, puente, sentido o imagen propia conserva su presentación, no hereda el dibujo', () => {
  for (const en of ['COMPUTER', 'DESK']) {
    const word = previewUnit.words.find((item) => item.en === en)!;
    expect(mnemonicSceneKind({ ...word, imageUrl: 'authored-image' })).toBeUndefined();
    expect(mnemonicSceneKind({ ...word, bridge: 'otro puente' })).toBeUndefined();
    expect(mnemonicSceneKind({ ...word, scene: 'Otra historia aprobada.' })).toBeUndefined();
    expect(mnemonicSceneKind({ ...word, es: 'otro sentido' })).toBeUndefined();
    expect(mnemonicSceneKind({ ...word, associationMode: 'cognate' })).toBeUndefined();
  }
});
