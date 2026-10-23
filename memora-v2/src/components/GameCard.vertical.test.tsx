import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GameCard } from './GameCard';
let tree: ReactTestRenderer;
const target = { closest: () => null };
const bottom = { currentTarget: { scrollTop: 200, scrollHeight: 800, clientHeight: 600 } };
const region = () => tree.root.findByProps({ role: 'region' });
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }), getSelection: () => null }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('solo avanza tras desplazamiento del alumno al final, sin responder ni repetir por ráfaga', () => {
  const advance = vi.fn();
  act(() => { tree = create(<GameCard vertical stepKey="teach-1" onAdvance={advance}>Modelo preparado</GameCard>); });
  act(() => region().props.onScroll(bottom));
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onWheel({ deltaY: 100, target }); region().props.onScroll({ currentTarget: { ...bottom.currentTarget, scrollTop: 100 } }); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onScroll(bottom); region().props.onScroll(bottom); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('un puzle, campo o texto seleccionado no arma avance; tampoco una pregunta pendiente', () => {
  const advance = vi.fn();
  act(() => { tree = create(<GameCard vertical stepKey="check" onAdvance={advance}>Piezas</GameCard>); });
  act(() => { region().props.onPointerDown({ target: { closest: () => ({}) } }); region().props.onScroll(bottom); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  vi.stubGlobal('window', { setTimeout, clearTimeout, getSelection: () => ({ toString: () => 'texto' }) });
  act(() => { region().props.onWheel({ deltaY: 100, target }); region().props.onScroll(bottom); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => tree.update(<GameCard vertical stepKey="unanswered">Responde con las piezas</GameCard>));
  expect(tree.root.findAllByType('button')).toHaveLength(0);
});
it('retirar la autorización durante la transición cancela la navegación antigua', () => {
  const advance = vi.fn();
  act(() => { tree = create(<GameCard vertical stepKey="feedback" onAdvance={advance}>Resultado</GameCard>); });
  act(() => { region().props.onWheel({ deltaY: 100, target }); region().props.onScroll(bottom); });
  act(() => tree.update(<GameCard vertical stepKey="question">Otra pregunta</GameCard>));
  act(() => { vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
});
it('el control equivalente de teclado respeta movimiento reducido', () => {
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }) });
  const advance = vi.fn();
  act(() => { tree = create(<GameCard vertical onAdvance={advance}>Modelo</GameCard>); });
  act(() => { tree.root.findByType('button').props.onClick(); vi.advanceTimersByTime(0); });
  expect(advance).toHaveBeenCalledOnce();
});
it('un toque no navega, pero el gesto hacia arriba funciona también al estar ya al final', () => {
  const advance = vi.fn();
  const viewport = { scrollTop: 200, scrollHeight: 800, clientHeight: 600 };
  act(() => { tree = create(<GameCard vertical onAdvance={advance}>Resultado legible</GameCard>, { createNodeMock: (node) => node.props.role === 'region' ? viewport : null }); });
  // Mount resets position; simulate having reached the bottom by reading.
  viewport.scrollTop = 200;
  act(() => { region().props.onTouchStart({ target, touches: [{ clientY: 300 }] }); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onTouchMove({ target, touches: [{ clientY: 200 }] }); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('al aparecer feedback conserva la lectura pero exige una nueva intención de continuar', () => {
  const advance = vi.fn();
  const viewport = { scrollTop: 0, scrollHeight: 800, clientHeight: 600 };
  act(() => { tree = create(<GameCard vertical stepKey="same-task">Puzle</GameCard>, { createNodeMock: (node) => node.props.role === 'region' ? viewport : null }); });
  viewport.scrollTop = 150;
  act(() => tree.update(<GameCard vertical stepKey="same-task" onAdvance={advance}>Resultado</GameCard>));
  expect(viewport.scrollTop).toBe(150);
  act(() => { region().props.onScroll(bottom); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
});
it('la inercia de una misma rueda no atraviesa el encuentro siguiente', () => {
  const advance = vi.fn();
  act(() => { tree = create(<GameCard vertical stepKey="one" onAdvance={advance}>Uno</GameCard>); });
  act(() => { region().props.onWheel({ deltaY: 100, target }); region().props.onScroll(bottom); vi.advanceTimersByTime(100); region().props.onWheel({ deltaY: 50, target }); vi.advanceTimersByTime(130); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => tree.update(<GameCard vertical stepKey="two" onAdvance={advance}>Dos</GameCard>));
  act(() => { region().props.onWheel({ deltaY: 50, target }); region().props.onScroll(bottom); vi.advanceTimersByTime(100); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => { vi.advanceTimersByTime(200); region().props.onWheel({ deltaY: 100, target }); region().props.onScroll(bottom); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledTimes(2);
});
