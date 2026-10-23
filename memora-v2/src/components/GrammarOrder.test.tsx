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
  act(() => { tree = create(<GrammarOrder puzzle pieces={pieces} selected={[1, 2]} locked={false} onChange={change} onAnswer={answer} />, { createNodeMock: (node) => node.props.className === 'grammar-order is-puzzle' ? { contains: (hit: unknown) => hit === target } : null }); });
  const currentTarget = { setPointerCapture: vi.fn(), ownerDocument: doc };
  const event = { pointerId: 1, clientX: 0, clientY: 0, button: 0, currentTarget };
  act(() => bank()[0].props.onPointerDown(event));
  act(() => bank()[0].props.onPointerMove({ ...event, clientY: -60 }));
  act(() => bank()[0].props.onPointerUp({ ...event, clientY: -60 }));
  expect(change).not.toHaveBeenCalled(); expect(answer).not.toHaveBeenCalled();
  inside = true;
  act(() => bank()[0].props.onPointerDown(event));
  act(() => bank()[0].props.onPointerMove({ ...event, clientY: -60 }));
  act(() => bank()[0].props.onPointerUp({ ...event, clientY: -60 }));
  expect(change).toHaveBeenCalledWith([1, 2, 0]); expect(answer).toHaveBeenCalledExactlyOnceWith('I AM PLAYING');
  act(() => bank()[0].props.onClick({ detail: 1 })); expect(answer).toHaveBeenCalledOnce();
});
it('recargar un puzle completo no lo envía solo ni inventa un acierto', () => {
  const { answer } = mount(true, [1, 2, 0], true);
  expect(answer).not.toHaveBeenCalled(); expect(bank().every((node) => node.props.disabled)).toBe(true);
});
