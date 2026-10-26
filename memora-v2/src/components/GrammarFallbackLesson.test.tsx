import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GrammarFallbackLesson } from './GrammarFallbackLesson';
import { GameCard } from './GameCard';
import { GrammarMorphology } from './GrammarMorphology';
import { previewUnit } from '../preview/previewUnit';
import { makeGrammarChecks } from '../domain/grammarPractice';
import { playEnglish, stopSpeech, type PlaybackResult } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const form = previewUnit.grammar[0], checks = makeGrammarChecks(form);
const ready = vi.fn(), next = vi.fn();
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const advance = async () => { await act(async () => tree.root.findByType(GameCard).props.onAdvance?.()); };
const choose = async (value: string) => { await act(async () => tree.root.findAllByType('button').find((node) => text(node) === value)!.props.onClick()); };
async function mount(value = form, vertical = true) { await act(async () => { tree = create(<GrammarFallbackLesson form={value} index={0} total={1} onReady={ready} onContinue={next} vertical={vertical} />); }); }
beforeEach(() => { vi.useFakeTimers(); ready.mockClear(); next.mockClear(); vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'blocked', source: null }); vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }) }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([true, false])('consultar enseñanza progressive=%s ignora posición de práctica y no acredita ni guarda', async (progressive) => {
  const progress = vi.fn();
  const value = progressive ? form : { ...form, id: 'isolated-other', visualContract: undefined };
  await act(async () => { tree = create(<GrammarFallbackLesson form={value} index={0} total={1} onReady={ready} onContinue={next} explanationOnly vertical initialPosition={{ step: 4, subjectIndex: 0, checkIndex: 0, prepared: true, outcome: 'pending', failures: 0 }} onProgress={progress} />); });
  for (let i = 0; i < (progressive ? 3 : 0); i++) await advance();
  expect(tree.root.findByType(GameCard).props.advanceLabel).toBe('Volver a mi mensaje');
  expect(tree.root.findAllByProps({ className: 'grammar-check' })).toHaveLength(0);
  const finish = tree.root.findByType(GameCard).props.onAdvance;
  await act(async () => { finish(); finish(); });
  expect(next).toHaveBeenCalledOnce();
  expect(ready).not.toHaveBeenCalled();
  expect(progress).not.toHaveBeenCalled();
});
it('cada modelo espera el slide; sonido/tiempo no saltan enseñanza ni resuelven retos', async () => {
  await mount();
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(tree.root.findByType(GrammarMorphology).props.step).toBe(0);
  expect(ready).not.toHaveBeenCalled();
  for (let step = 1; step <= 4; step++) await advance();
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeUndefined();
  const calls = vi.mocked(playEnglish).mock.calls.length;
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(playEnglish).toHaveBeenCalledTimes(calls);
  expect(text(tree.toJSON())).toContain(checks[0].prompt);
  expect(ready).not.toHaveBeenCalled();
});
it('acierto es un resultado separado y otra persona se enseña antes de preguntar', async () => {
  await mount(); for (let i = 0; i < 4; i++) await advance();
  await choose(checks[0].answer);
  expect(text(tree.toJSON())).toContain('✓ Acertaste');
  expect(text(tree.toJSON())).not.toContain(checks[0].prompt);
  expect(tree.root.findAllByProps({ className: 'grammar-check' })).toHaveLength(0);
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(text(tree.toJSON())).toContain('✓ Acertaste');
  await advance();
  expect(tree.root.findByType(GrammarMorphology).props.subjectIndex).toBe(form.subjects.findIndex((subject) => subject.phrase === checks[1].answer));
  expect(tree.root.findAllByProps({ className: 'grammar-check' })).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('They are');
  await advance(); await choose(checks[1].answer); await advance();
  expect(ready).toHaveBeenCalledOnce();
  expect(next).toHaveBeenCalledOnce();
  await advance(); await advance(); expect(next).toHaveBeenCalledOnce();
});
it('una reparación breve lleva al modelo sin llamarlo acierto ni esperar un temporizador', async () => {
  await mount(); for (let i = 0; i < 4; i++) await advance();
  const wrong = checks[0].choices.find((value) => value !== checks[0].answer)!;
  await choose(wrong);
  expect(text(tree.toJSON())).toContain(checks[0].hint);
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeUndefined();
  await choose(wrong);
  expect(text(tree.toJSON())).toContain('Vamos con el modelo');
  expect(text(tree.toJSON())).not.toContain('✓ Acertaste');
  expect(tree.root.findAllByProps({ className: 'grammar-check' })).toHaveLength(0);
  expect(ready).not.toHaveBeenCalled(); await advance();
  expect(tree.root.findByType(GrammarMorphology)).toBeTruthy();
});
it('otras formas conservan su explicación revisada sin inventar ING/I AM ni ejercicios', async () => {
  const value = { ...form, id: 'reviewed-other', visualContract: 'imperative', memoryTrick: { ...form.memoryTrick!, explanation: 'Explicación revisada para esta forma.' } };
  await mount(value, false);
  expect(tree.root.findByType(GameCard).props.vertical).toBe(false);
  expect(text(tree.toJSON())).toContain(value.memoryTrick.explanation);
  expect(text(tree.toJSON())).not.toContain('Primera pista');
  await advance(); expect(ready).toHaveBeenCalledOnce(); await advance(); expect(next).toHaveBeenCalledOnce();
});
it('un final de audio de la pantalla anterior no cambia el estado de la nueva', async () => {
  let resolve!: (value: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await mount(); await advance();
  vi.mocked(playEnglish).mockResolvedValue({ status: 'played', source: 'kokoro' });
  await advance();
  await act(async () => resolve({ status: 'blocked', source: null }));
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(tree.root.findByType(GrammarMorphology).props.step).toBe(2);
});
it('replay tras restaurar se cancela al salir aunque no se haya iniciado audio automático', async () => {
  let resolve!: (value: PlaybackResult) => void;
  const position = { step: 4, subjectIndex: 0, checkIndex: 0, prepared: true, outcome: 'correct' as const, failures: 0 };
  await act(async () => { tree = create(<GrammarFallbackLesson form={form} index={0} total={1} onReady={ready} onContinue={next} vertical initialPosition={position} />); });
  expect(playEnglish).not.toHaveBeenCalled();
  vi.mocked(playEnglish).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await act(async () => tree.root.findByProps({ 'aria-label': 'Escuchar el modelo' }).props.onClick());
  vi.mocked(stopSpeech).mockClear(); act(() => tree.unmount());
  expect(stopSpeech).toHaveBeenCalledOnce();
  await act(async () => resolve({ status: 'blocked', source: null }));
  expect(next).not.toHaveBeenCalled(); expect(ready).not.toHaveBeenCalled();
});
