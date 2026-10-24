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
it('conserva los modos de práctica como opciones secundarias, no como inicios que compiten', () => {
  const html = renderToStaticMarkup(<JourneyHome units={[previewUnit]} userId="learner" onOpen={noop} onConverse={noop} onWords={noop} onGrammar={noop} onExit={noop} onProfile={noop} appearance="light" onToggleAppearance={noop} />);
  const nav = html.match(/<nav aria-label="Navegación principal"[\s\S]*?<\/nav>/)![0];
  expect(nav).not.toContain('>Palabras<');
  expect(nav).not.toContain('Gramática');
  expect(nav).not.toContain('Arcade');
  const practice = html.match(/<details class="home-practice-panel"[\s\S]*?<\/details>/)![0];
  expect(practice).toContain('Gramática'); expect(practice).toContain('Arcade'); expect(practice).toContain('Aprender palabras');
  expect(practice).not.toContain(' open=""');
});
