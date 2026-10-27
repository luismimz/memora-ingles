import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarCoach } from './GrammarCoach';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { playEnglish, playSpanish } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'kokoro' })), playSpanish: vi.fn(async () => ({ status: 'played', source: 'kokoro' })), stopSpeech: vi.fn(), playSnap: vi.fn() }));
const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
let tree: ReactTestRenderer;
const props = { lesson, form: previewUnit.grammar[0], userId: 'audio-isolated', unitId: previewUnit.id, reviewMode: true, onReady: vi.fn(), onContinue: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  vi.stubGlobal('localStorage', { getItem: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('no narra cada explicación: solo suena el modelo inglés completo y el español se pide expresamente', async () => {
  await act(async () => { tree = create(<GrammarCoach {...props} />); });
  expect(playSpanish).not.toHaveBeenCalled(); expect(playEnglish).not.toHaveBeenCalled();
  const explanation = () => tree.root.findByProps({ 'aria-label': 'Escuchar explicación en español' });
  await act(async () => explanation().props.onClick());
  expect(playSpanish).toHaveBeenCalledOnce();
  for (let stage = 1; stage < lesson.steps.length; stage++) {
    const next = tree.root.findAllByType('button').find((node) => node.props.className === 'primary-action')!;
    await act(async () => next.props.onClick());
  }
  expect(playEnglish).toHaveBeenCalledOnce();
  expect(playEnglish).toHaveBeenLastCalledWith(lesson.steps.at(-1)!.en.map((part) => part.text).join(''));
  expect(playSpanish).toHaveBeenCalledOnce();
});
it('reanudar el último modelo no lo reproduce otra vez automáticamente', async () => {
  await act(async () => { tree = create(<GrammarCoach {...props} checkpoint={{ stage: lesson.steps.length - 1, checkIndex: 0, input: '', feedback: 'idle', helped: false }} />); });
  expect(playEnglish).not.toHaveBeenCalled(); expect(playSpanish).not.toHaveBeenCalled();
});
