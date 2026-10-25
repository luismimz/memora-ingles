import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarOrder } from './GrammarOrder';
import { orderedFixture } from '../test/grammarPracticeFixtures';
const pieces = orderedFixture.checks[0].ordering!;
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); });
function mount(puzzle = false, selected: number[] = [], locked = false) {
  const change = vi.fn(); const answer = vi.fn();
  act(() => { tree = create(<GrammarOrder puzzle={puzzle} pieces={pieces} selected={selected} locked={locked} onChange={change} onAnswer={answer} />); });
  return { change, answer, update: (selection: number[]) => act(() => tree.update(<GrammarOrder puzzle={puzzle} pieces={pieces} selected={selection} locked={locked} onChange={change} onAnswer={answer} />)) };
}
const bank = () => tree.root.findByProps({ 'aria-label': 'Piezas disponibles' }).findAllByType('button');
it('coach puede comprobar al completar sin activar arrastre ni enviar un orden restaurado', () => {
  const change = vi.fn(), answer = vi.fn();
  const render = (selected: number[]) => <GrammarOrder autoCheck pieces={pieces} selected={selected} locked={false} onChange={change} onAnswer={answer} />;
  act(() => { tree = create(render([1, 2, 0])); });
  expect(answer).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
  act(() => tree.update(render([1, 2])));
  act(() => bank()[0].props.onClick({ detail: 0 }));
  expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
  act(() => bank()[0].props.onClick({ detail: 0 }));
  expect(answer).toHaveBeenCalledOnce();
});
it('legacy mantiene envío explícito; una pieza parcial no responde', () => {
  const { change, answer } = mount();
  act(() => bank()[1].props.onClick({ detail: 0 }));
  expect(change).toHaveBeenCalledWith([1]); expect(answer).not.toHaveBeenCalled();
  act(() => tree.unmount());
  const { answer: full } = mount(false, [1, 2, 0]);
  act(() => tree.root.findByProps({ className: 'primary-action' }).props.onClick());
  expect(full).toHaveBeenCalledWith('I AM PLAYING');
});
it('el puzle comprueba solo al colocar la última pieza, una vez, sin Enviar', () => {
  const { change, answer, update } = mount(true, [1, 2]);
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
  act(() => { bank()[0].props.onClick({ detail: 0 }); bank()[0].props.onClick({ detail: 0 }); });
  expect(change).toHaveBeenCalledWith([1, 2, 0]);
  expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
  update([1, 2, 0]);
  act(() => tree.root.findByProps({ 'aria-label': 'Quitar I, posición 1' }).props.onClick());
  expect(change).toHaveBeenLastCalledWith([2, 0]); expect(answer).toHaveBeenCalledOnce();
});
it('soltar fuera no responde; el destino propio añade una pieza sin duplicar el click posterior', () => {
  const change = vi.fn(), answer = vi.fn(), target = {};
  let inside = false;
  const doc = { elementFromPoint: vi.fn(() => ({ closest: () => inside ? target : null })) };
  const line = [1, 2].map((id, index) => ({ dataset: { orderPiece: String(id) }, getBoundingClientRect: () => ({ top: -100, bottom: -50, left: index * 80, width: 70 }) }));
  act(() => { tree = create(<GrammarOrder puzzle pieces={pieces} selected={[1, 2]} locked={false} onChange={change} onAnswer={answer} />, { createNodeMock: (node) => node.props.className === 'grammar-order is-puzzle' ? { contains: (hit: unknown) => hit === target, querySelectorAll: () => line } : null }); });
  const currentTarget = { setPointerCapture: vi.fn(), ownerDocument: doc, getBoundingClientRect: () => ({ left: 0, top: 0, width: 70 }) };
  const event = { pointerId: 1, clientX: 0, clientY: 0, button: 0, currentTarget };
  act(() => bank()[0].props.onPointerDown(event));
  act(() => bank()[0].props.onPointerMove({ ...event, clientY: -60, clientX: 190 }));
  act(() => bank()[0].props.onPointerUp({ ...event, clientY: -60, clientX: 190 }));
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
  inside = true;
  act(() => bank()[0].props.onPointerDown(event));
  act(() => bank()[0].props.onPointerMove({ ...event, clientY: -60, clientX: 190 }));
  act(() => bank()[0].props.onPointerUp({ ...event, clientY: -60, clientX: 190 }));
  expect(change).toHaveBeenCalledWith([1, 2, 0]); expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
  act(() => bank()[0].props.onClick({ detail: 1 })); expect(answer).toHaveBeenCalledOnce();
});
it('recargar un puzle completo no lo envía solo ni inventa un acierto', () => {
  const { answer } = mount(true, [1, 2, 0], true);
  expect(answer).not.toHaveBeenCalled(); expect(bank().every((node) => node.props.disabled)).toBe(true);
});

it('inserta en medio y reordena dentro de la frase con hueco visible, sin responder durante el arrastre', () => {
  const change = vi.fn(), answer = vi.fn(), target = {};
  let selected = [1, 0];
  const doc = { elementFromPoint: () => ({ closest: () => target }) };
  const line = () => selected.map((id, index) => ({ dataset: { orderPiece: String(id) }, getBoundingClientRect: () => ({ top: 50, bottom: 100, left: index * 100, width: 90 }) }));
  const render = () => <GrammarOrder puzzle pieces={pieces} selected={selected} locked={false} onChange={change} onAnswer={answer} />;
  act(() => { tree = create(render(), { createNodeMock: (node) => node.props.className === 'grammar-order is-puzzle' ? { contains: (hit: unknown) => hit === target, querySelectorAll: line, getBoundingClientRect: () => ({ left: 30, top: 40 }) } : null }); });
  const currentTarget = { setPointerCapture: vi.fn(), ownerDocument: doc, getBoundingClientRect: () => ({ left: 0, top: 200, width: 90 }) };
  const event = { pointerId: 1, clientX: 0, clientY: 200, button: 0, currentTarget };
  act(() => bank()[2].props.onPointerDown(event));
  act(() => bank()[2].props.onPointerMove({ ...event, clientX: 110, clientY: 80 }));
  expect(bank()[2].props.style).toMatchObject({ position: 'absolute', left: -30, top: 160, transform: 'translate(110px, -120px)' });
  expect(tree.root.findAllByProps({ className: 'order-insert' })).toHaveLength(1);
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
  act(() => bank()[2].props.onPointerUp({ ...event, clientX: 110, clientY: 80 }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 0]); expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
  selected = [0, 1, 2]; act(() => tree.update(render()));
  answer.mockClear(); change.mockClear();
  const placed = () => tree.root.findByProps({ 'aria-label': 'Quitar PLAYING, posición 1' });
  act(() => placed().props.onPointerDown(event));
  act(() => placed().props.onPointerMove({ ...event, clientX: 400, clientY: 80 }));
  expect(answer).not.toHaveBeenCalled();
  act(() => placed().props.onPointerUp({ ...event, clientX: 400, clientY: 80 }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 0]);
  // Same already-submitted arrangement is not a second attempt merely because of a drag.
  expect(answer).not.toHaveBeenCalled();
});

it('flechas en una pieza permiten reordenar sin gesto ni propagación hacia el feed; límites no responden', () => {
  const { change, answer } = mount(true, [2, 1]);
  const event = { key: 'ArrowLeft', repeat: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
  act(() => tree.root.findByProps({ 'aria-label': 'Quitar I, posición 2' }).props.onKeyDown(event));
  expect(change).toHaveBeenLastCalledWith([1, 2]); expect(answer).not.toHaveBeenCalled();
  expect(event.stopPropagation).toHaveBeenCalledOnce();
  change.mockClear();
  act(() => tree.root.findByProps({ 'aria-label': 'Quitar AM, posición 1' }).props.onKeyDown(event));
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
});

it('cancelar o soltar fuera conserva la pieza colocada; filas distintas respetan el punto de inserción', () => {
  const change = vi.fn(), answer = vi.fn(), target = {};
  let inside = false;
  const doc = { elementFromPoint: () => ({ closest: () => inside ? target : null }) };
  const line = [1, 0].map((id, index) => ({ dataset: { orderPiece: String(id) }, getBoundingClientRect: () => ({ top: 50 + index * 80, bottom: 100 + index * 80, left: 0, width: 90 }) }));
  act(() => { tree = create(<GrammarOrder puzzle pieces={pieces} selected={[1, 0]} locked={false} onChange={change} onAnswer={answer} />, { createNodeMock: (node) => node.props.className === 'grammar-order is-puzzle' ? { contains: (hit: unknown) => hit === target, querySelectorAll: () => line } : null }); });
  const currentTarget = { setPointerCapture: vi.fn(), ownerDocument: doc, getBoundingClientRect: () => ({ left: 0, top: 50, width: 90 }) };
  const event = { pointerId: 1, clientX: 0, clientY: 50, button: 0, currentTarget };
  const placed = () => tree.root.findByProps({ 'aria-label': 'Quitar I, posición 1' });
  act(() => placed().props.onPointerDown(event));
  act(() => placed().props.onPointerMove({ ...event, clientX: 200 }));
  act(() => placed().props.onPointerUp({ ...event, clientX: 200 }));
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
  act(() => bank()[2].props.onPointerDown(event));
  act(() => bank()[2].props.onPointerMove({ ...event, clientX: 200 }));
  act(() => bank()[2].props.onPointerCancel());
  act(() => bank()[2].props.onClick({ detail: 1 }));
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
  inside = true;
  act(() => bank()[2].props.onPointerDown(event));
  act(() => bank()[2].props.onPointerMove({ ...event, clientY: 120, clientX: 200 }));
  act(() => bank()[2].props.onPointerUp({ ...event, clientY: 120, clientX: 200 }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 0]); expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
});
