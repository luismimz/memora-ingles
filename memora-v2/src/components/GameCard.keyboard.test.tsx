import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameCard } from './GameCard';

let tree: ReactTestRenderer;
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }) }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each(['input', 'summary', '[contenteditable="true"]', '[draggable="true"]', '[role="button"]'])('no convierte teclas o arrastre en avance al interactuar con %s', (selector) => {
  const advance = vi.fn(), preventDefault = vi.fn(), capture = vi.fn();
  act(() => { tree = create(<GameCard onAdvance={advance} back="Ayuda">Modelo</GameCard>); });
  const surface = tree.root.findByProps({ role: 'group' });
  const target = { closest: (query: string) => query.split(',').includes(selector) ? {} : null };
  act(() => {
    surface.props.onKeyDown({ key: 'ArrowLeft', repeat: false, target, preventDefault });
    surface.props.onKeyDown({ key: 'ArrowRight', repeat: false, target, preventDefault });
    surface.props.onPointerDown({ target, clientX: 300, pointerId: 1, currentTarget: { setPointerCapture: capture } });
    surface.props.onPointerMove({ clientX: 100 }); surface.props.onPointerUp({ clientX: 100 });
    vi.advanceTimersByTime(1500);
  });
  expect(preventDefault).not.toHaveBeenCalled(); expect(capture).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
});
it('mantener una flecha no encadena tarjetas; una pulsación nueva sigue disponible', () => {
  const advance = vi.fn(), preventDefault = vi.fn(), target = { closest: () => null };
  act(() => { tree = create(<GameCard onAdvance={advance}>Modelo</GameCard>); });
  const key = (repeat: boolean) => tree.root.findByProps({ role: 'group' }).props.onKeyDown({ key: 'ArrowLeft', repeat, target, preventDefault });
  act(() => { key(true); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled(); expect(preventDefault).not.toHaveBeenCalled();
  act(() => { key(false); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => { key(true); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
