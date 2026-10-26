import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { preparedFixture } from '../test/grammarPracticeFixtures';
import { playEnglish, type PlaybackResult } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), stopSpeech: vi.fn(), playMiss: vi.fn(), playSnap: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const attempt = vi.fn(); const accept = vi.fn(); const prepare = vi.fn();
const pick = vi.fn(); const next = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const render = (step = 0, model = false, filledSlots = 1) => <SentenceBuilderCard sentence={preparedFixture.sentence} vocabulary={preparedFixture.words} sceneWord={preparedFixture.words[0]} processForm={preparedFixture.grammar[0]} index={0} total={1} filledSlots={filledSlots} choiceSeed={0} preparationStep={step} needsModel={model} onAcceptModel={accept} onPreparationChange={prepare} onAttempt={attempt} onPick={pick} onNext={next} />;
const speaker = () => tree.root.findAllByType('button').find((node) => text(node).includes('Escuchar la pieza') || node.props['aria-busy'])!;
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'played', source: 'kokoro' });
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('preparación muestra fallo recuperable y reintento sin completar ni responder por escuchar', async () => {
  await act(async () => { tree = create(render()); });
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => { speaker().props.onClick(); });
  expect(speaker().props['aria-busy']).toBe(true);
  await act(async () => { resolve({ status: 'blocked', source: null }); });
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  await act(async () => { speaker().props.onClick(); });
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(attempt).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled(); expect(accept).not.toHaveBeenCalled();
  expect(pick).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
});
it('cambiar pieza ignora un resultado tardío y deja seguir aunque no termine la voz', async () => {
  await act(async () => { tree = create(render()); });
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => { speaker().props.onClick(); });
  const next = tree.root.findAllByType('button').find((node) => text(node).includes('Ver la siguiente pieza'))!;
  act(() => { next.props.onClick(); });
  expect(prepare).toHaveBeenCalledWith(1);
  await act(async () => { tree.update(render(1)); resolve({ status: 'unavailable', source: null }); });
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(speaker().props['aria-busy']).toBe(false);
  expect(attempt).not.toHaveBeenCalled();
});
it('rescate permite reintentar y colocar con ayuda sin esperar al audio', async () => {
  await act(async () => { tree = create(render(3, true)); });
  vi.mocked(playEnglish).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { speaker().props.onClick(); });
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => { speaker().props.onClick(); });
  act(() => { tree.root.findAllByType('button').find((node) => text(node) === 'Colocar con ayuda')!.props.onClick(); });
  expect(accept).toHaveBeenCalledOnce();
  await act(async () => { tree.update(render(0, false, 2)); resolve({ status: 'unavailable', source: null }); });
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(attempt).not.toHaveBeenCalled();
});
