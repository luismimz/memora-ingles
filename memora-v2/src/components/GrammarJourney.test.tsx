import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { GrammarJourney } from './GrammarJourney';
import { JourneyHome } from './JourneyHomeV2';
import { previewUnit } from '../preview/previewUnit';
import { grammarJourney } from '../domain/grammarJourney';
const noop = () => {};
beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null }));
it('prepara palabras cuando faltan y deja el mapa secundario cerrado', () => {
  const html = renderToStaticMarkup(<GrammarJourney units={[previewUnit]} userId="learner" inspection={false} notice="Una misión no se pudo cargar" onRetry={noop} onOpen={noop} onBack={noop} onArcade={noop} appearance="light" onToggleAppearance={noop} />);
  expect(html).toContain('Ver mi recorrido de frases');
  expect(html).not.toContain('Mapa de tu recorrido');
  expect(html).toContain('PRIMERO, SUS PALABRAS');
  expect(html).toContain('Preparar palabras en Inicio');
  expect(html).toContain('Una misión no se pudo cargar');
  expect(html).not.toContain('Continuar con esta frase');
  expect(html).not.toContain('learning-library-grid');
});

it('retoma la parada real sin exigir explorar el mapa ni escribir progreso al navegar', () => {
  const write = vi.fn(); vi.stubGlobal('localStorage', { getItem: () => null, setItem: write });
  const route = grammarJourney([previewUnit]);
  const resume = route[1] ?? route[0];
  expect(resume).toBeDefined();
  const open = vi.fn();
  const tree = create(<GrammarJourney units={[previewUnit]} userId="learner" inspection resumeId={resume.id} onRetry={noop} onOpen={open} onBack={noop} onArcade={noop} appearance="light" onToggleAppearance={noop} />);
  expect(tree.root.findByType('h1').children).toEqual([resume.title]);
  expect(tree.root.findAllByProps({ className: 'journey-map-viewport' })).toHaveLength(0);
  const next = tree.root.findAllByType('button').find((button) => button.children.includes('Continuar con esta frase →'))!;
  act(() => next.props.onClick()); expect(open).toHaveBeenCalledWith(resume);
  const map = tree.root.findByProps({ className: 'grammar-route' });
  act(() => map.props.onToggle({ currentTarget: { open: true } }));
  expect(tree.root.findAllByProps({ className: 'journey-map-viewport' })).toHaveLength(1);
  expect(write).not.toHaveBeenCalled();
  tree.unmount();
});

it('la preparación abre la fuente requerida y la ruta vacía no fabrica una próxima frase', () => {
  const prepare = vi.fn();
  const tree = create(<GrammarJourney units={[previewUnit]} userId="learner" inspection={false} onPrepare={prepare} onRetry={noop} onOpen={noop} onBack={noop} onArcade={noop} appearance="light" onToggleAppearance={noop} />);
  const button = tree.root.findAllByType('button').find((button) => button.children.includes('Aprender estas palabras →'))!;
  act(() => button.props.onClick());
  expect(prepare).toHaveBeenCalledWith(grammarJourney([previewUnit])[0]);
  tree.unmount();
  const html = renderToStaticMarkup(<GrammarJourney units={[]} userId="learner" inspection={false} onRetry={noop} onOpen={noop} onBack={noop} onArcade={noop} appearance="light" onToggleAppearance={noop} />);
  expect(html).toContain('Este camino está preparándose');
  expect(html).not.toContain('Continuar con esta frase');
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
