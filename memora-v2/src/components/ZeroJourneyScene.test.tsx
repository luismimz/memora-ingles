import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZeroDoorScene, ZeroJourneyScene } from './ZeroJourneyScene';

it('la imagen de memoria contiene al actor causal, no solo una taza decorativa', () => {
  const water = renderToStaticMarkup(<ZeroJourneyScene mnemonic="water" active />);
  expect(water).toContain('Un wáter estornuda');
  expect(water).toContain('zero-wc'); expect(water).toContain('zero-water-arc'); expect(water).toContain('zero-flood');
  const coffee = renderToStaticMarkup(<ZeroJourneyScene mnemonic="coffee" drink="coffee" active />);
  expect(coffee).toContain('El café salta fuera de la taza'); expect(coffee).toContain('zero-coffee-splash');
  expect(water + coffee).not.toMatch(/<image|https?:\/\//u);
});
it('distingue la bufanda robada de la reparación, y el rechazo del agua fría', () => {
  expect(renderToStaticMarkup(<ZeroJourneyScene cold active />)).toContain('La col ha robado la bufanda');
  expect(renderToStaticMarkup(<ZeroJourneyScene cold active celebrate />)).toContain('La bufanda vuelve');
  expect(renderToStaticMarkup(<ZeroJourneyScene drink="coffee" served rejected />)).toContain('Byte aparta la taza de café');
  expect(renderToStaticMarkup(<ZeroJourneyScene active iced />)).toContain('taza de agua fría');
});
it('la puerta no se abre por mostrar un modelo o tener una llave; la acción debe resolverla', () => {
  const before = renderToStaticMarkup(<ZeroDoorScene mnemonic />);
  expect(before).toContain('zero-kiwi'); expect(before).not.toContain('is-open');
  const discovered = renderToStaticMarkup(<ZeroDoorScene mnemonic discovered />);
  expect(discovered).toContain('El kiwi se convierte en una llave'); expect(discovered).not.toContain('zero-kiwi');
  const owned = renderToStaticMarkup(<ZeroDoorScene discovered owned />);
  expect(owned).toContain('Ya tienes una llave en la mano'); expect(owned).not.toContain('is-open');
  expect(renderToStaticMarkup(<ZeroDoorScene discovered opened />)).toContain('La llave gira y la puerta se abre');
});
