import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useSpeechPlayback } from './useSpeechPlayback';
import { playEnglish, type PlaybackResult } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn() }));
let tree: ReactTestRenderer;
function Player({ text }: { text: string }) {
  const player = useSpeechPlayback();
  return <><button onClick={() => player.listen(text)}>listen</button><button onClick={player.reset}>reset</button><p>{player.audio?.status}</p></>;
}
afterEach(() => { if (tree) act(() => tree.unmount()); vi.mocked(playEnglish).mockReset(); });
it('solo el reintento del mismo modelo fallido elige voz local; cambiar texto o reiniciar no hereda fallo', async () => {
  vi.mocked(playEnglish).mockResolvedValue({ status: 'blocked', source: 'kokoro' });
  act(() => { tree = create(<Player text="science" />); });
  const listen = () => act(async () => { await tree.root.findAllByType('button')[0].props.onClick(); });
  await listen(); expect(playEnglish).toHaveBeenLastCalledWith('science', undefined, true, expect.any(Function));
  vi.mocked(playEnglish).mockResolvedValue({ status: 'played', source: 'browser' });
  await listen(); expect(playEnglish).toHaveBeenLastCalledWith('science', undefined, true, expect.any(Function), true);
  expect(tree.root.findByType('p').children).toEqual(['ready']);
  act(() => tree.update(<Player text="music" />)); await listen();
  expect(playEnglish).toHaveBeenLastCalledWith('music', undefined, true, expect.any(Function));
  vi.mocked(playEnglish).mockResolvedValue({ status: 'unavailable', source: null }); await listen();
  act(() => tree.root.findAllByType('button')[1].props.onClick()); await listen();
  expect(playEnglish).toHaveBeenLastCalledWith('music', undefined, true, expect.any(Function));
});
it('resultado tardío tras reset no impone fallo ni contamina el siguiente modelo', async () => {
  let finish!: (value: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ status: 'played', source: 'kokoro' });
  act(() => { tree = create(<Player text="science" />); });
  act(() => { void tree.root.findAllByType('button')[0].props.onClick(); });
  act(() => tree.root.findAllByType('button')[1].props.onClick());
  await act(async () => finish({ status: 'blocked', source: 'kokoro' })); expect(tree.root.findByType('p').children).toEqual([]);
  await act(async () => { await tree.root.findAllByType('button')[0].props.onClick(); });
  expect(playEnglish).toHaveBeenLastCalledWith('science', undefined, true, expect.any(Function));
});
