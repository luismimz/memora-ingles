import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ArcadePairs } from './ArcadePairs';
import { arcadePairs, type MicroRound } from '../domain/microArcade';
import { previewUnit } from '../preview/previewUnit';
const rounds: MicroRound[] = previewUnit.words.slice(0, 3).map((word) => ({ word, unit: previewUnit, phrase: { en: '', es: '', key: '' }, options: [], due: false }));
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); });
const pair = vi.fn(), model = vi.fn(), complete = vi.fn();
function mount(paused = false) { pair.mockClear(); model.mockClear(); complete.mockClear(); act(() => { tree = create(<ArcadePairs rounds={rounds} seed={2} paused={paused} onPair={pair} onModel={model} onComplete={complete} />); }); }
function tile(side: string, value: string) { return tree.root.findByProps({ 'aria-label': side === 'en' ? 'Palabras inglesas' : 'Significados en español' }).findAllByType('button').find((node) => node.findAllByType('span')[0].children.join('') === value)!; }
it('deja empezar por cualquier pareja y cualquier lado; seleccionar no evalúa ni completa', () => {
  mount();
  act(() => tile('es', rounds[2].word.es).props.onClick());
  expect(pair).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled();
  expect(tile('es', rounds[2].word.es).props['aria-pressed']).toBe(true);
  act(() => tile('en', rounds[2].word.en).props.onClick());
  expect(pair).toHaveBeenCalledExactlyOnceWith(rounds[2], rounds[2], true);
  expect(tile('en', rounds[2].word.en).props.disabled).toBe(true);
  act(() => tile('en', rounds[2].word.en).props.onClick());
  expect(pair).toHaveBeenCalledOnce();
});
it('un error muestra su conexión sin un acierto fabricado y deja resolver lo restante', () => {
  mount();
  act(() => tile('en', rounds[0].word.en).props.onClick());
  act(() => tile('es', rounds[1].word.es).props.onClick());
  expect(pair).toHaveBeenCalledExactlyOnceWith(rounds[0], rounds[1], false);
  expect(tile('en', rounds[0].word.en).props.className).toContain('is-model');
  expect(tile('es', rounds[0].word.es).props.disabled).toBe(true);
  expect(tile('es', rounds[1].word.es).props.disabled).toBe(false);
  for (const round of rounds.slice(1)) {
    act(() => tile('en', round.word.en).props.onClick());
    act(() => tile('es', round.word.es).props.onClick());
  }
  expect(complete).toHaveBeenCalledOnce(); expect(pair.mock.calls.map((call) => call[2])).toEqual([false, true, true]);
});
it('pausa y modelo no fabrican intentos, y el modelo completa solo pendientes', () => {
  mount(true);
  act(() => tile('en', rounds[0].word.en).props.onClick());
  expect(pair).not.toHaveBeenCalled();
  act(() => tree.update(<ArcadePairs rounds={rounds} seed={2} paused={false} onPair={pair} onModel={model} onComplete={complete} />));
  act(() => tile('en', rounds[0].word.en).props.onClick());
  act(() => tile('es', rounds[0].word.es).props.onClick());
  act(() => tree.root.findAllByType('button').find((node) => node.children[0] === 'Ver conexiones')!.props.onClick());
  expect(pair).toHaveBeenCalledOnce(); expect(model).toHaveBeenCalledTimes(2); expect(complete).toHaveBeenCalledOnce();
});
it('el tablero excluye modelos pendientes, duplicados y significados ambiguos; nunca rellena con catálogo', () => {
  expect(arcadePairs([], 0)).toEqual([]);
  expect(arcadePairs([rounds[0]], 0)).toEqual([]);
  expect(arcadePairs([rounds[0], { ...rounds[1], pendingModel: true }], 0)).toEqual([]);
  expect(arcadePairs([rounds[0], { ...rounds[1], word: { ...rounds[1].word, es: rounds[0].word.es } }], 0)).toEqual([]);
  expect(arcadePairs([...rounds, rounds[0]], 0)).toEqual(rounds);
});
