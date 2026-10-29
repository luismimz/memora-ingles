import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GameCard, PlayFeed } from './GameCard';
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
it('la escena inmersiva recorre su altura sin reservar pie y avanza una sola vez', () => {
  const advance=vi.fn();
  act(()=>{tree=create(<GameCard vertical immersive showAdvanceButton={false} onAdvance={advance}>Escena</GameCard>,{createNodeMock:node=>node.props.role==='region'?viewport:null});});
  expect(tree.root.findAllByProps({className:'card-vertical-rest'})).toHaveLength(0);
  viewport.scrollTop=200;
  act(()=>wheel());
  expect(region().props.style.transform).toBe('translate3d(0, -600px, 0)');
  act(()=>{wheel();vi.advanceTimersByTime(230);});
  expect(advance).toHaveBeenCalledOnce();
});
it('el feed compartido cambia presentación sin responder, mantiene teclado y no salta lo pendiente', () => {
  const advance = vi.fn(), preventDefault = vi.fn();
  act(() => { tree = create(<PlayFeed><GameCard vertical>Pendiente</GameCard></PlayFeed>); });
  viewport.scrollTop = 200;
  act(() => region().props.onKeyDown(event({ key: 'ArrowDown', preventDefault })));
  expect(advance).not.toHaveBeenCalled(); expect(tree.root.findAllByType('button')).toHaveLength(0);
  expect(tree.root.findByProps({ className: 'card-feed-hint' }).children).toEqual([]);
  act(() => tree.update(<PlayFeed><GameCard vertical onAdvance={advance}>Preparado</GameCard></PlayFeed>));
  expect(tree.root.findAllByType('button')).toHaveLength(1);
  expect(tree.root.findByType('button').props.className).toBe('sr-only feed-accessible-next');
  act(() => { region().props.onKeyDown(event({ key: 'ArrowDown', preventDefault })); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
  act(() => tree.update(<PlayFeed enabled={false}><GameCard vertical onAdvance={advance}>Revisión</GameCard></PlayFeed>));
  expect(tree.root.findAllByType('button')).toHaveLength(1);
  expect(region().props.onKeyDown).toBeUndefined();
});
it('el feed ofrece una acción para lector de pantalla sin volver al botón visual repetido', () => {
  const advance = vi.fn();
  act(() => { tree = create(<PlayFeed><GameCard vertical onAdvance={advance}>Modelo</GameCard></PlayFeed>); });
  const accessible = tree.root.findByProps({ 'aria-label': 'Pasar a la siguiente escena' });
  expect(accessible.props.className).toContain('sr-only');
  act(() => { accessible.props.onClick(); accessible.props.onClick(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('el modo sin botón conserva teclado/gesto y nunca permite saltarse una tarea pendiente', () => {
  const advance = vi.fn(), preventDefault = vi.fn();
  act(() => { tree = create(<GameCard vertical showAdvanceButton={false}>Pendiente</GameCard>); });
  viewport.scrollTop = 200;
  act(() => region().props.onKeyDown(event({ key: 'ArrowDown', preventDefault })));
  expect(preventDefault).not.toHaveBeenCalled();
  act(() => tree.update(<GameCard vertical showAdvanceButton={false} onAdvance={advance}>Preparado</GameCard>));
  expect(tree.root.findAllByProps({ className: 'card-vertical-next' })).toHaveLength(0);
  act(() => { region().props.onKeyDown(event({ key: 'ArrowDown', preventDefault })); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('leer hasta el final y la inercia de esa rueda no navegan; una rueda nueva sí', () => {
  const advance = vi.fn(); mount(advance);
  act(() => { wheel(); viewport.scrollTop = 200; region().props.onScroll(event()); wheel(70); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { wheel(); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('acumula un gesto de trackpad suave, no exige un golpe de rueda ni suma gestos separados', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { wheel(20); vi.advanceTimersByTime(200); wheel(20); vi.advanceTimersByTime(200); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { wheel(10); wheel(10); wheel(10); wheel(10); wheel(20); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('cambiar tarea descarta el gesto parcial y su inercia antes de permitir otro nuevo', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => wheel(20));
  act(() => tree.update(<GameCard vertical stepKey="two" onAdvance={advance}>Otra tarjeta</GameCard>)); viewport.scrollTop = 200;
  act(() => { wheel(50); vi.advanceTimersByTime(130); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(200); wheel(60); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('respeta unidades de rueda y no convierte zoom o desplazamiento lateral en avance', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { region().props.onWheel(event({ deltaY: 100, ctrlKey: true })); vi.advanceTimersByTime(200); region().props.onWheel(event({ deltaY: 100, deltaX: 200 })); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onWheel(event({ deltaY: 4, deltaMode: 1 })); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('acompaña un gesto táctil corto, vuelve si se suelta y no exige arrastrar 75 píxeles', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300, clientX: 100 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 280, clientX: 100 }] })); });
  expect(region().props.style.transform).toBe('translate3d(0, -8.4px, 0)');
  act(() => { region().props.onTouchEnd(); vi.advanceTimersByTime(230); });
  expect(region().props.style.transform).toBe('translate3d(0, 0px, 0)'); expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300, clientX: 100 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 252, clientX: 100 }] })); vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
});
it('un gesto lateral o cancelar el contacto descarta el arrastre sin navegar', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300, clientX: 100 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 270, clientX: 180 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 100, clientX: 180 }] })); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300 }] })); region().props.onTouchMove(event({ touches: [{ clientY: 280 }] })); region().props.onTouchCancel(); });
  expect(region().props.style.transform).toBe('translate3d(0, 0px, 0)');
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

it('una escena opt-in acepta el gesto desde la imagen, pero nunca habilita una tarea sin resolver', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  const sceneTarget = { closest: (selector: string) => selector.startsWith('input,') || selector === 'button:disabled' ? null : { getAttribute: (name: string) => name === 'data-feed-surface' ? 'true' : null } };
  act(() => {
    region().props.onTouchStart(event({ target: sceneTarget, touches: [{ clientY: 350 }] }));
    region().props.onTouchMove(event({ target: sceneTarget, touches: [{ clientY: 200 }] }));
    vi.advanceTimersByTime(230);
  });
  expect(advance).toHaveBeenCalledOnce();
  act(() => tree.update(<GameCard vertical stepKey="unanswered">Responde primero</GameCard>));
  act(() => {
    region().props.onTouchStart(event({ target: sceneTarget, touches: [{ clientY: 350 }] }));
    region().props.onTouchMove(event({ target: sceneTarget, touches: [{ clientY: 200 }] }));
    vi.advanceTimersByTime(230);
  });
  expect(advance).toHaveBeenCalledOnce();
});
it.each(['audio','locked'])('un resultado admite deslizar sobre %s sin activar también un botón', (kind) => {
  const advance = vi.fn(), preventDefault = vi.fn(), stopPropagation = vi.fn(); mount(advance); viewport.scrollTop = 200;
  const button = { getAttribute: () => 'true' };
  const control = { closest: (selector: string) => selector.startsWith('input,') ? null : selector === '[data-feed-surface]' ? kind === 'audio' ? button : null : selector === 'button:disabled' ? kind === 'locked' ? button : null : button };
  act(() => {
    region().props.onTouchStart(event({ target: control, touches: [{ clientY: 300 }] }));
    region().props.onTouchMove(event({ target: control, touches: [{ clientY: 240 }] }));
    region().props.onClickCapture({ detail: 1, preventDefault, stopPropagation });
    vi.advanceTimersByTime(230);
  });
  expect(advance).toHaveBeenCalledOnce(); expect(preventDefault).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce();
  // A fresh tap is a tap, not a swallowed leftover from the previous swipe.
  act(() => { region().props.onTouchStart(event({ touches: [{ clientY: 300 }] })); region().props.onTouchEnd(); region().props.onClickCapture({ detail: 1, preventDefault, stopPropagation }); });
  expect(preventDefault).toHaveBeenCalledOnce();
});
it('una superficie opt-in no permite pasar desde un campo o una pieza todavía arrastrable', () => {
  const advance = vi.fn(); mount(advance); viewport.scrollTop = 200;
  const field = { closest: () => ({ getAttribute: () => 'true' }) };
  act(() => { region().props.onTouchStart(event({ target: field, touches: [{ clientY: 300 }] })); region().props.onTouchMove(event({ target: field, touches: [{ clientY: 100 }] })); vi.advanceTimersByTime(230); });
  expect(advance).not.toHaveBeenCalled();
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
  expect(control.findAllByType('small')).toHaveLength(0);
  expect(control.props.title).toBe('Desliza hacia arriba o toca para seguir');
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
it('reserva la zona inferior sin fingir una acción mientras la pregunta está pendiente', () => {
  mount(undefined);
  expect(tree.root.findByProps({ className: 'card-vertical-rest' }).props['aria-hidden']).toBe('true');
  expect(tree.root.findAllByType('button')).toHaveLength(0);
  act(() => tree.update(<GameCard vertical onAdvance={() => {}}>Resultado</GameCard>));
  expect(tree.root.findAllByProps({ className: 'card-vertical-rest' })).toHaveLength(0);
  expect(tree.root.findAllByType('button')).toHaveLength(1);
});
it('la salida vertical es corta, no expulsa el contenido una pantalla entera', () => {
  const advance = vi.fn(); mount(advance);
  act(() => tree.root.findByType('button').props.onClick());
  expect(region().props.style.transform).toBe('translate3d(0, -32px, 0)');
  expect(advance).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(230); });
  expect(advance).toHaveBeenCalledOnce();
  expect(region().props.style.transform).toBe('translate3d(0, 0px, 0)');
});
