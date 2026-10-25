import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GameCard } from './GameCard';
let tree: ReactTestRenderer;
const target = { closest: () => null };
const viewport = { scrollTop: 0, scrollHeight: 800, clientHeight: 600 };
const region = () => tree.root.findByProps({ role: 'region' });
const event = (extra: object = {}) => ({ target, currentTarget: viewport, ...extra });
const wheel = (deltaY = 100) => region().props.onWheel(event({ deltaY }));
function mount(advance?: () => void, stepKey = 'one') {
  act(() => { tree = create(<GameCard vertical stepKey={stepKey} onAdvance={advance}>Modelo preparado</GameCard>, { createNodeMock: (node) => node.props.role === 'region' ? viewport : null }); });
}
beforeEach(() => { viewport.scrollTop = 0; vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }), getSelection: () => null }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('leer hasta el final y la inercia de esa rueda no navegan; una rueda nueva sí', () => {
  const advance = vi.fn(); mount(advance);
  act(() => { wheel(); viewport.scrollTop = 200; region().props.onScroll(event()); wheel(70); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { wheel(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('un puzle, campo, ayuda o selección no navega y una pregunta no ofrece avance', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { region().props.onWheel(event({ deltaY: 100, target: { closest: () => ({}) } })); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  vi.stubGlobal('window', { setTimeout, clearTimeout, getSelection: () => ({ toString: () => 'texto' }) });
  act(() => { wheel(); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => tree.update(<GameCard vertical stepKey="question">Responde con las piezas</GameCard>));
  expect(tree.root.findAllByType('button')).toHaveLength(0);
});
it('retirar autorización durante transición cancela la navegación antigua', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => wheel());
  act(() => tree.update(<GameCard vertical stepKey="question">Otra pregunta</GameCard>));
  act(() => { vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
});
it('el control equivalente respeta movimiento reducido', () => {
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }) });
  const advance = vi.fn(); mount(advance);
  act(() => { tree.root.findByType('button').props.onClick(); vi.advanceTimersByTime(0); });
  expect(advance).toHaveBeenCalledOnce();
});
it('una etiqueta editorial con flecha conserva una sola flecha visual y un nombre accesible limpio', () => {
  mount(vi.fn());
  act(() => tree.update(<GameCard vertical onAdvance={() => {}} advanceLabel="Usar mi frase →">Mensaje</GameCard>));
  const control = tree.root.findByType('button');
  expect(control.props['aria-label']).toBe('Usar mi frase');
  expect(control.findAllByType('small')[0].children).toEqual(['Desliza hacia arriba o toca aquí']);
  expect(control.findByProps({ 'aria-hidden': 'true' }).children).toEqual(['↑']);
});
it('la acción está fuera del área de lectura y funciona sin buscar el final del texto', () => {
  const advance = vi.fn(); mount(advance);
  const control = tree.root.findByType('button');
  expect(control.parent!.props.className).toBe('card-vertical-next');
  expect(control.parent!.parent!.props.className).toContain('card-vertical');
  expect(region().findAllByType('footer')).toHaveLength(0);
  expect(viewport.scrollTop).toBe(0);
  act(() => { control.props.onClick(); control.props.onClick(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('el toque que lee hasta abajo no pasa tarjeta; un nuevo gesto al final sí', () => {
  const advance = vi.fn(); mount(advance);
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 400 }] })); viewport.scrollTop = 200; region().props.onTouchMove(event({ touches: [{ clientY: 100 }] })); region().props.onScroll(event()); region().props.onTouchEnd(); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 200 }] })); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('feedback conserva lectura; scroll de layout no navega', () => {
  const advance = vi.fn(); mount(undefined, 'same'); viewport.scrollTop = 150;
  act(() => tree.update(<GameCard vertical stepKey="same" onAdvance={advance}>Resultado</GameCard>));
  expect(viewport.scrollTop).toBe(150);
  act(() => { viewport.scrollTop = 200; region().props.onScroll(event()); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
});
it('la inercia no atraviesa el encuentro siguiente', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { wheel(); vi.advanceTimersByTime(100); wheel(50); vi.advanceTimersByTime(130); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => tree.update(<GameCard vertical stepKey="two" onAdvance={advance}>Dos</GameCard>)); viewport.scrollTop = 200;
  act(() => { wheel(50); vi.advanceTimersByTime(100); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => { vi.advanceTimersByTime(200); wheel(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledTimes(2);
});
it('la región no captura teclas de lectura al final: avanzar por teclado requiere el botón explícito', () => {
  const advance = vi.fn(); mount(advance);
  expect(region().props.onKeyDown).toBeUndefined();
  act(() => { viewport.scrollTop = 200; region().props.onScroll(event()); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { tree.root.findByType('button').props.onClick(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('cancelar toque corta intención anterior', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300 }] })); region().props.onTouchCancel(); region().props.onTouchMove(event({ touches: [{ clientY: 100 }] })); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
});
