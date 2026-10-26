import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { reviewUnits } from '../preview/previewUnit';
import { BridgeSoundNote, bridgeSoundExplanation } from './BridgeSoundNote';
import { phrasalPreviewPacks } from '../preview/phrasalPacks';
import { ArcadeWordReminder } from './ArcadeWordReminder';

it('GO OUT no presenta GOTA como pronunciación ni oculta la diferencia en su enseñanza', () => {
  const word = phrasalPreviewPacks.flatMap((unit) => unit.words).find((item) => item.en === 'GO OUT')!;
  const html = renderToStaticMarkup(<BridgeSoundNote word={word} explain />);
  expect(html).toContain('no es la pronunciación inglesa');
  expect(html).toContain(word.bridgeEvidence!.soundRelation.replaceAll('&', '&amp;'));
  const reminder = renderToStaticMarkup(<ArcadeWordReminder word={word} paused={false} />);
  expect(reminder).toContain('GO OUT'); expect(reminder).toContain('GOTA');
  expect(reminder).toContain('no es la pronunciación inglesa');
  expect(reminder).not.toContain('<details>'); // no long explanation against an Arcade clock
});
it('no inventa puente ni explicación si es cognado o no tiene puente', () => {
  const word = phrasalPreviewPacks[0].words[0];
  expect(renderToStaticMarkup(<BridgeSoundNote word={{ ...word, associationMode: 'cognate' }} explain />)).toBe('');
  expect(renderToStaticMarkup(<BridgeSoundNote word={{ ...word, bridge: '' }} explain />)).toBe('');
});

it('separa el puente familiar de la pronunciación en las dos notas legacy inspeccionadas, sin editar el contenido', () => {
  const words = reviewUnits.flatMap((unit) => unit.words);
  for (const en of ['BED', 'PILLOW']) {
    const word = words.find((item) => item.en === en)!;
    const before = JSON.stringify(word);
    const html = renderToStaticMarkup(<BridgeSoundNote word={word} explain />);
    expect(html).toContain(word.bridgeEvidence!.familiarMeaning);
    expect(html).toContain(`https://dictionary.cambridge.org/pronunciation/english/${en.toLowerCase()}`);
    expect(html).not.toContain('empieza exactamente');
    expect(JSON.stringify(word)).toBe(before);
    expect(bridgeSoundExplanation({ ...word, scene: 'Otra historia.' })).toEqual({ text: word.bridgeEvidence!.soundRelation });
    expect(bridgeSoundExplanation({ ...word, bridgeEvidence: { ...word.bridgeEvidence!, soundRelation: 'Otra nota revisada.' } })).toEqual({ text: 'Otra nota revisada.' });
  }
  expect(renderToStaticMarkup(<BridgeSoundNote word={words.find((item) => item.en === 'PILLOW')!} explain />)).toContain('golpe de voz va al principio');
});
