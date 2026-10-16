import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GrammarJourney } from './GrammarJourney';
import { JourneyHome } from './JourneyHomeV2';
import { previewUnit } from '../preview/previewUnit';
const noop = () => {};
beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null }));
it('sustituye las tarjetas por el mapa y explica por qué los trucos están bloqueados', () => {
  const html = renderToStaticMarkup(<GrammarJourney units={[previewUnit]} userId="learner" inspection={false} notice="Una misión no se pudo cargar" onRetry={noop} onOpen={noop} onBack={noop} onArcade={noop} appearance="light" onToggleAppearance={noop} />);
  expect(html).toContain('Mapa de tu recorrido');
  expect(html).toContain('journey-map-node is-trick');
  expect(html).toContain('PREPARA SUS PALABRAS');
  expect(html).toContain('Preparar palabras en Inicio');
  expect(html).toContain('Una misión no se pudo cargar');
  expect(html).toContain('Ver qué falta');
  expect(html).not.toMatch(/disabled=""[^>]*>Ver qué falta/);
  expect(html).toContain('Ver palabras pendientes');
  expect(html).not.toContain('learning-library-grid');
});
it('quita Palabras del menú principal sin retirar el aprendizaje de vocabulario', () => {
  const html = renderToStaticMarkup(<JourneyHome units={[previewUnit]} userId="learner" onOpen={noop} onConverse={noop} onWords={noop} onGrammar={noop} onExit={noop} onProfile={noop} appearance="light" onToggleAppearance={noop} />);
  const nav = html.match(/<nav class="home-nav"[\s\S]*?<\/nav>/)![0];
  expect(nav).not.toContain('>Palabras<');
  expect(nav).toContain('Gramática');
  expect(nav).toContain('Arcade');
  expect(html).toContain('Aprender palabras');
});
