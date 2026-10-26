import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GrammarContractionLab } from './GrammarContractionLab';
import { lessonForForm } from '../domain/grammarLesson';
import { previewUnit } from '../preview/previewUnit';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const user = 'lab-isolated';
const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
const props = { step: lesson.steps.at(-1)!, lessonId: lesson.id, unitId: previewUnit.id, unitTitle: previewUnit.title, contentVersion: '1', userId: user, reviewMode: false };
beforeEach(() => {
  vi.mocked(playEnglish).mockClear();
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
async function mount(overrides = {}) { await act(async () => { tree = create(<GrammarContractionLab {...props} {...overrides} />); }); }
it('transforma y revierte el modelo con voz inglesa, sin evaluar ni repetir el modelo en el journal', async () => {
  await mount();
  expect(playEnglish).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual([]);
  await act(async () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' }).props.onClick());
  expect(playEnglish).toHaveBeenLastCalledWith("I'm playing", undefined, true, expect.any(Function));
  await act(async () => tree.root.findByProps({ 'aria-label': "Separar I'M" }).props.onClick());
  expect(playEnglish).toHaveBeenLastCalledWith('I am playing', undefined, true, expect.any(Function));
  await act(async () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' }).props.onClick());
  expect(readLearningActivities(user)).toMatchObject([{ source: 'authored', correct: null, helped: true, prompt: 'I am playing', response: "I'm playing" }]);
  expect(readGrammarAttempts(user)).toEqual([]);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
});
it('reanuda el modelo ya explorado sin autoaudio ni nuevos eventos; fallo de voz permite reintentar', async () => {
  await mount();
  await act(async () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' }).props.onClick());
  const before = readLearningActivities(user);
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); await mount();
  expect(tree.root.findByProps({ 'aria-label': "Separar I'M" }).props['aria-pressed']).toBe(true);
  expect(playEnglish).not.toHaveBeenCalled();
  await act(async () => tree.root.findByProps({ 'aria-label': 'Escuchar este mensaje' }).props.onClick());
  expect(tree.root.findByProps({ className: 'association-audio-status' }).children).toEqual(['Audio no disponible · toca 🔊']);
  expect(readLearningActivities(user)).toEqual(before);
});
it('otra versión vuelve al modelo expandido y la inspección no guarda exploración', async () => {
  await mount({ reviewMode: true });
  await act(async () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' }).props.onClick());
  expect(readLearningActivities(user)).toEqual([]);
  act(() => tree.unmount()); await mount();
  await act(async () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' }).props.onClick());
  act(() => tree.unmount()); await mount({ contentVersion: 'other' });
  expect(tree.root.findByProps({ 'aria-label': 'Juntar I y AM' })).toBeDefined();
});
it('deslizar junta y separa con movimiento, sin doble click ni evaluar la demostración', async () => {
  await mount();
  const currentTarget = { setPointerCapture: vi.fn() };
  const start = { pointerId: 1, button: 0, clientX: 100, clientY: 100, currentTarget };
  const left = { ...start, clientX: 60 };
  const control = () => tree.root.findByProps({ 'aria-label': 'Juntar I y AM' });
  act(() => control().props.onPointerDown(start));
  act(() => control().props.onPointerMove(left));
  expect(readLearningActivities(user)).toEqual([]);
  await act(async () => control().props.onPointerUp(left));
  const joined = () => tree.root.findByProps({ 'aria-label': "Separar I'M" });
  await act(async () => joined().props.onClick({ detail: 1 }));
  expect(joined().props['aria-pressed']).toBe(true);
  expect(playEnglish).toHaveBeenCalledOnce();
  act(() => joined().props.onPointerDown(start));
  act(() => joined().props.onPointerMove({ ...start, clientX: 140 }));
  await act(async () => joined().props.onPointerUp({ ...start, clientX: 140 }));
  expect(control().props['aria-pressed']).toBe(false);
  expect(readLearningActivities(user)).toHaveLength(1);
  expect(readGrammarAttempts(user)).toEqual([]);
});
it('el gesto vertical, corto, cancelado o secundario no transforma ni reproduce', async () => {
  await mount();
  const control = tree.root.findByProps({ 'aria-label': 'Juntar I y AM' });
  const start = { pointerId: 1, button: 0, clientX: 100, clientY: 100, currentTarget: { setPointerCapture: vi.fn() } };
  for (const end of [{ ...start, clientY: 160 }, { ...start, clientX: 90 }]) {
    act(() => control.props.onPointerDown(start)); act(() => control.props.onPointerMove(end)); act(() => control.props.onPointerUp(end));
    act(() => control.props.onClick({ detail: 1 }));
  }
  act(() => control.props.onPointerDown(start)); act(() => control.props.onPointerMove({ ...start, clientX: 40 })); act(() => control.props.onPointerCancel());
  act(() => control.props.onClick({ detail: 1 }));
  expect(readLearningActivities(user)).toEqual([]); expect(playEnglish).not.toHaveBeenCalled();
  await act(async () => control.props.onClick({ detail: 0 }));
  expect(readLearningActivities(user)).toHaveLength(1);
});
