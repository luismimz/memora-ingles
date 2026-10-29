import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WordAssembly } from './WordAssembly';
import { PlayFeed, GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { writeArcadeCalm } from '../domain/arcadeCadence';
import { playEnglish, type PlaybackResult } from '../services/audio';
import { zeroWords } from '../domain/zeroJourney';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'unavailable', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
const next = vi.fn();
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  const values = new Map<string,string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key,value) });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
const mount = (complete = false) => act(() => { tree = create(<PlayFeed><WordAssembly userId="assembly-feed-isolated" vertical sceneAsHelp word={{ ...zeroWords[0], en: 'I', es: 'yo' }} initialPosition={complete ? { selected: [0], hinted: true, modelUsed: false, layout: 'letters-v2' } : undefined} onContinue={next} /></PlayFeed>); });
const complete = async () => act(async () => tree.root.findByProps({ 'aria-label': 'Colocar I, pieza 1' }).props.onClick());
const wait = async (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });
it('mantiene la imagen antes/después y sigue en feed sin otra confirmación, incluso sin audio', async () => {
  mount();
  expect(tree.root.findByType(SceneVisual).parent!.props.className).toBe('assembly-context has-scene');
  expect(next).not.toHaveBeenCalled();
  await complete();
  expect(tree.root.findByType(SceneVisual).props.hideAnswer).toBe(false);
  expect(tree.root.findByType('h2').children).toEqual(['Armada con ayuda']);
  await wait(1299); expect(next).not.toHaveBeenCalled();
  await wait(1); expect(next).toHaveBeenCalledOnce();
  act(() => tree.root.findByType(GameCard).props.onAdvance()); expect(next).toHaveBeenCalledOnce();
});
it('respeta modo tranquilo y un resultado restaurado no arranca otro avance automático', async () => {
  writeArcadeCalm('assembly-feed-isolated', true); mount(); await complete(); await wait(10000);
  expect(next).not.toHaveBeenCalled();
  act(() => tree.root.findByType(GameCard).props.onAdvance()); expect(next).toHaveBeenCalledOnce();
  act(() => tree.unmount()); next.mockClear(); writeArcadeCalm('assembly-feed-isolated', false);
  mount(true); await wait(10000); expect(next).not.toHaveBeenCalled();
});
it('no corta una escucha pedida y desmontar cancela la transición del resultado', async () => {
  let finish!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  mount(); await complete(); await wait(10000); expect(next).not.toHaveBeenCalled();
  await act(async () => finish({ status: 'played', source: 'kokoro' }));
  await wait(1000); act(() => tree.unmount()); await wait(5000); expect(next).not.toHaveBeenCalled();
});
