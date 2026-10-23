import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarSituation } from './GrammarSituation';
import { meaningFixture } from '../test/grammarPracticeFixtures';

const check = meaningFixture.checks[0];
let tree: ReactTestRenderer;
const answer = vi.fn();
const rootBox = { left: 100, top: 200, right: 500, bottom: 650 };
const boxes = new Map<string, { left: number; top: number; right: number; bottom: number }>();
const token = () => tree.root.findByProps({ 'aria-label': `Mensaje inglés: ${check.situation!.message}` });
const choices = () => tree.root.findAllByType('button').filter((node) => node.props['data-drop-choice']);
const order = () => choices().map((node) => node.props['data-drop-choice']);
const event = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, button: 0, isPrimary: true, clientX: x, clientY: y, currentTarget: { setPointerCapture: vi.fn() }, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra });
function mount(key = 'scene-a') {
  answer.mockClear(); boxes.clear();
  act(() => { tree = create(<GrammarSituation check={check} presentationKey={key} selected="" feedback="idle" onAnswer={answer} onListen={() => {}} />, { createNodeMock: (node) => {
    if (node.props.className === 'grammar-situation') return { getBoundingClientRect: () => rootBox };
    if (node.props['data-drop-choice']) { const choice = node.props['data-drop-choice']; if (!boxes.has(choice)) { const left = 110 + boxes.size * 200; boxes.set(choice, { left, top: 400, right: left + 160, bottom: 550 }); } return { getBoundingClientRect: () => boxes.get(choice) }; }
    return null;
  } }); });
}
function point(choice: string) { const box = boxes.get(choice)!; return [box.left + 50, box.top + 50] as const; }
afterEach(() => { if (tree) act(() => tree.unmount()); });

it('lleva el mensaje a cada escena, solo al soltar y con coordenadas locales al contenedor', () => {
  mount();
  for (const choice of check.choices!) {
    const [x, y] = point(choice); const down = event(200, 250);
    act(() => token().props.onPointerDown(down));
    const move = event(x, y); act(() => token().props.onPointerMove(move));
    expect(down.preventDefault).toHaveBeenCalled(); expect(move.stopPropagation).toHaveBeenCalled();
    const ghost = tree.root.findByProps({ className: 'situation-token-ghost' });
    expect(ghost.props.style).toEqual({ left: x - rootBox.left, top: y - rootBox.top });
    expect(choices().find((node) => node.props.className === 'is-drop-target')!.props['data-drop-choice']).toBe(choice);
    const previous = answer.mock.calls.length;
    expect(previous).toBe(check.choices!.indexOf(choice));
    act(() => { token().props.onPointerUp(event(x, y)); token().props.onPointerUp(event(x, y)); });
    expect(answer).toHaveBeenCalledTimes(previous + 1); expect(answer).toHaveBeenLastCalledWith(choice);
  }
});
it('fuera, cancelación, pérdida de captura y pulsación sin arrastre no inventan respuesta', () => {
  mount();
  act(() => { token().props.onPointerDown(event(200, 250)); token().props.onPointerUp(event(550, 700)); });
  const [x, y] = point(check.answers[0]);
  act(() => { token().props.onPointerDown(event(x, y)); token().props.onPointerUp(event(x + 1, y)); });
  for (const cancel of ['onPointerCancel', 'onLostPointerCapture']) act(() => { token().props.onPointerDown(event(200, 250)); token().props[cancel](); token().props.onPointerUp(event(x, y)); });
  expect(answer).not.toHaveBeenCalled(); expect(tree.root.findAllByProps({ className: 'situation-token-ghost' })).toHaveLength(0);
});
it('pausa o corrección durante el movimiento lo cancela; otro puntero no responde', () => {
  mount(); const [x, y] = point(check.answers[0]);
  act(() => { token().props.onPointerDown(event(200, 250)); token().props.onPointerUp(event(x, y, { pointerId: 2 })); });
  expect(answer).not.toHaveBeenCalled();
  act(() => tree.update(<GrammarSituation check={check} presentationKey="scene-a" selected="" feedback="idle" disabled onAnswer={answer} onListen={() => {}} />));
  act(() => token().props.onPointerUp(event(x, y)));
  expect(answer).not.toHaveBeenCalled(); expect(choices().every((node) => node.props.disabled)).toBe(true);
  act(() => tree.update(<GrammarSituation check={check} presentationKey="scene-a" selected={check.answers[0]} feedback="correct" onAnswer={answer} onListen={() => {}} />));
  act(() => { token().props.onPointerDown(event(200, 250)); token().props.onPointerUp(event(x, y)); });
  expect(answer).not.toHaveBeenCalled();
});
it('la disposición varía por encuentro pero no salta al pedir ayuda o reanudar', () => {
  mount(); const first = order();
  act(() => tree.update(<GrammarSituation check={check} presentationKey="scene-a" selected={check.choices![0]} feedback="help" onAnswer={answer} onListen={() => {}} />));
  expect(order()).toEqual(first);
  act(() => tree.unmount()); mount(); expect(order()).toEqual(first);
  const layouts = new Set<string>();
  for (let index = 0; index < 10; index++) {
    act(() => tree.update(<GrammarSituation check={check} presentationKey={`scene-${index}`} selected="" feedback="idle" onAnswer={answer} onListen={() => {}} />));
    layouts.add(order().join('|'));
  }
  expect(layouts.size).toBe(2);
  expect(check.situation!.scenes.map((scene) => scene.choice)).toEqual(check.choices);
  expect(answer).not.toHaveBeenCalled();
});
it('los mensajes reales de jugar, cepillar y cocinar no colocan todos la respuesta en el mismo lado', () => {
  mount(); const positions = new Set<number>();
  for (const message of ['I am playing', 'I am brushing', 'I am cooking']) {
    const task = { ...check, id: 'meaning-now-v1', situation: { ...check.situation!, message } };
    act(() => tree.update(<GrammarSituation check={task} selected="" feedback="idle" onAnswer={answer} onListen={() => {}} />));
    positions.add(order().indexOf(task.answers[0]));
  }
  expect(positions.size).toBe(2);
  expect(answer).not.toHaveBeenCalled();
});
