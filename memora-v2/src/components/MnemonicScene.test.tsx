import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
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

it('PAN recupera al panda con sartén, no el falso amigo del pan de comer', () => {
  const word = reviewUnits.find((unit) => unit.id === 'm1-kitchen-pan')!.words.find((item) => item.en === 'PAN')!;
  const before = JSON.stringify(word);
  expect(mnemonicSceneKind(word)).toBe('pan-panda');
  const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
  expect(hidden).toContain('data-mnemonic-scene="pan-panda"');
  expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
  expect(hidden).not.toContain('PANDA');
  expect(hidden).not.toContain('SARTÉN');
  expect(hidden).not.toContain('memory-english');
  expect(hidden).not.toContain('<text');
  const teaching = renderToStaticMarkup(<SceneVisual word={word} showMemoryLink />);
  expect(teaching).toContain('PANDA'); expect(teaching).toContain('SARTÉN');
  expect(mnemonicSceneKind({ ...word, imageUrl: 'own-image' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, es: 'pan de comer' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, bridge: 'otro' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, scene: 'El panda cocina otra cosa.' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, associationMode: 'cognate' })).toBeUndefined();
  expect(JSON.stringify(word)).toBe(before);
});

it('EGG mantiene su historia de EGO saliendo del huevo sin convertir la vocal española en pronunciación inglesa', () => {
  const word = reviewUnits.find((unit) => unit.id === 'm1-kitchen-pan')!.words.find((item) => item.en === 'EGG')!;
  const before = JSON.stringify(word);
  expect(mnemonicSceneKind(word)).toBe('egg-ego');
  const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
  expect(hidden).toContain('data-mnemonic-scene="egg-ego"');
  expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
  expect(hidden).not.toContain('EGO'); expect(hidden).not.toContain('HUEVO');
  expect(hidden).not.toContain('memory-english'); expect(hidden).not.toContain('<text');
  const teaching = renderToStaticMarkup(<SceneVisual word={word} showMemoryLink />);
  expect(teaching).toContain('EGO'); expect(teaching).toContain('EGG'); expect(teaching).toContain('HUEVO');
  expect(mnemonicSceneKind({ ...word, imageUrl: 'own-image' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, es: 'otro sentido' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, bridge: 'otro' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, scene: 'Un huevo normal.' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, associationMode: 'cognate' })).toBeUndefined();
  expect(JSON.stringify(word)).toBe(before);
});

it('MEAT visualiza el mitin lanzando carne sin sustituir otro sentido o medio propio', () => {
  const word = reviewUnits.find((unit) => unit.id === 'm1-kitchen-pan')!.words.find((item) => item.en === 'MEAT')!;
  const before = JSON.stringify(word);
  expect(mnemonicSceneKind(word)).toBe('meat-mitin');
  const hidden = renderToStaticMarkup(<SceneVisual word={word} hideAnswer />);
  expect(hidden).toContain('data-mnemonic-scene="meat-mitin"');
  expect(hidden).toContain('aria-label="Recuerda la imagen aprendida"');
  expect(hidden).not.toContain('MITIN'); expect(hidden).not.toContain('CARNE');
  expect(hidden).not.toContain('memory-english'); expect(hidden).not.toContain('<text');
  const teaching = renderToStaticMarkup(<SceneVisual word={word} showMemoryLink />);
  expect(teaching).toContain('MITIN'); expect(teaching).toContain('MEAT'); expect(teaching).toContain('CARNE');
  expect(mnemonicSceneKind({ ...word, imageUrl: 'own-image' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, es: 'otro sentido' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, bridge: 'otro' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, scene: 'Otra escena de carne.' })).toBeUndefined();
  expect(mnemonicSceneKind({ ...word, associationMode: 'cognate' })).toBeUndefined();
  expect(JSON.stringify(word)).toBe(before);
});
