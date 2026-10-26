import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { contextualProcessFixture as unit } from '../test/contextualProcessFixture';
import { GameCard } from './GameCard';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playMiss: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const pick = vi.fn(), attempt = vi.fn(), next = vi.fn();
const target = {};
let inside = false;
const currentTarget = { setPointerCapture: vi.fn(), ownerDocument: { elementFromPoint: () => ({ closest: () => inside ? target : null }) }, getBoundingClientRect: () => ({ left: 80, top: 320, width: 90 }) };
const event = { pointerId: 1, button: 0, clientX: 100, clientY: 400, currentTarget };
const moved = { ...event, clientX: 90, clientY: 250 };
const render = (filledSlots = 1, needsModel = false) => <SentenceBuilderCard vertical compactPreparation vocabulary={unit.words} sentence={unit.sentence} filledSlots={filledSlots} sceneWord={unit.words[0]} processForm={unit.grammar[0]} index={0} total={1} choiceSeed={0} needsModel={needsModel} onPick={pick} onAttempt={attempt} onNext={next} />;
const choice = (word = 'am') => tree.root.findAllByType('button').find((node) => node.props.children === word)!;
function mount() {
  act(() => { tree = create(render(), { createNodeMock: (node) => String(node.props.className).includes('builder-workbench') ? { contains: (hit: unknown) => hit === target, getBoundingClientRect: () => ({ left: 20, top: 50 }) } : null }); });
}
beforeEach(() => {
  inside = false; vi.clearAllMocks();
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('la pieza sigue el dedo en coordenadas locales y solo el hueco propio responde una vez', () => {
  mount(); inside = true;
  act(() => choice().props.onPointerDown(event));
  act(() => choice().props.onPointerMove(moved));
  expect(tree.root.findByProps({ className: 'builder-drag-piece' }).props.style).toMatchObject({ left: 50, top: 120, width: 90 });
  expect(tree.root.findAllByProps({ 'data-builder-drop': '' })).toHaveLength(1);
  expect(attempt).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeUndefined();
  act(() => choice().props.onPointerUp(moved));
  expect(attempt).toHaveBeenCalledExactlyOnceWith('am', true, 1); expect(pick).toHaveBeenCalledOnce();
  act(() => { choice().props.onClick({ detail: 1 }); choice().props.onPointerUp(moved); });
  expect(attempt).toHaveBeenCalledOnce(); expect(next).not.toHaveBeenCalled();
});
it('soltar fuera o cancelar no fabrica intentos; conserva tocar y teclado como alternativa', () => {
  mount();
  act(() => choice().props.onPointerDown(event)); act(() => choice().props.onPointerMove(moved)); act(() => choice().props.onPointerUp(moved));
  act(() => choice().props.onClick({ detail: 1 }));
  expect(attempt).not.toHaveBeenCalled();
  inside = true;
  act(() => choice().props.onPointerDown(event)); act(() => choice().props.onPointerMove(moved)); act(() => choice().props.onPointerCancel());
  act(() => choice().props.onClick({ detail: 1 }));
  expect(attempt).not.toHaveBeenCalled();
  act(() => choice().props.onClick({ detail: 0 }));
  expect(attempt).toHaveBeenCalledExactlyOnceWith('am', true, 1);
});
it('cambiar de pieza cancela el arrastre anterior; el rescate no es un destino', () => {
  mount(); inside = true;
  const stale = choice();
  act(() => stale.props.onPointerDown(event)); act(() => stale.props.onPointerMove(moved));
  act(() => tree.update(render(1, true)));
  expect(tree.root.findAllByProps({ className: 'builder-drag-piece' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ 'data-builder-drop': '' })).toHaveLength(0);
  expect(attempt).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
});
it('la frase terminada aparece unida y no exige colocar ni vuelve a narrar al restaurar', () => {
  act(() => { tree = create(render(unit.sentence.slots.length)); });
  expect(tree.root.findByProps({ className: 'builder-message' }).props.lang).toBe('en');
  expect(tree.root.findAllByProps({ className: 'slot-options' })).toHaveLength(0);
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeTypeOf('function');
  expect(attempt).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
});
