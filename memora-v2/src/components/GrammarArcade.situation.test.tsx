import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarArcade } from './GrammarArcade';
import { GrammarSituation } from './GrammarSituation';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { recordWordRecall } from '../domain/memory';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { readLearningActivities } from '../domain/learningActivity';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
const user = 'arcade-scene-isolated'; const exit = vi.fn();
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
beforeEach(() => {
  vi.useFakeTimers(); exit.mockClear(); vi.mocked(playEnglish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval, dispatchEvent: vi.fn() });
  recordWordRecall(user, previewUnit.words[0], 'quick');
  const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
  recordGrammarAttempt(user, { unitId: previewUnit.id, skill: lesson.id, check: 'meaning-now-v1', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(<GrammarArcade units={[previewUnit]} userId={user} inspection={false} onExit={exit} onWords={() => {}} automatic />); }); }

it('la recuperación de significado usa escenas preparadas y no una casilla de palabra faltante', async () => {
  await mount();
  expect(tree.root.findAllByType(GrammarSituation)).toHaveLength(1);
  expect(text(tree.toJSON())).toContain('Sin cuenta atrás');
  expect(text(tree.toJSON())).not.toContain('COMPUTER');
  expect(tree.root.findAllByProps({ className: 'grammar-gap' })).toHaveLength(0);
  await act(async () => tree.root.findByType(GrammarSituation).props.onAnswer('Estoy jugando ahora.'));
  expect(text(tree.toJSON())).toContain('Mensaje entregado');
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toMatchObject([{ correct: true, helped: true, modality: 'choice' }]);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(exit).not.toHaveBeenCalled();
  await act(async () => { tree.root.findByProps({ 'aria-label': 'Volver a la aventura' }).props.onClick(); vi.advanceTimersByTime(230); });
  expect(exit).toHaveBeenCalledOnce();
});

it('error muestra consecuencia y modelo sin puntuar otro acierto; audio solicitado no acredita escucha', async () => {
  await mount();
  await act(async () => tree.root.findByType(GrammarSituation).props.onListen());
  expect(playEnglish).toHaveBeenCalledWith('I am playing');
  expect(readLearningActivities(user)).toMatchObject([{ source: 'authored', correct: null }]);
  const answer = tree.root.findByType(GrammarSituation).props.onAnswer;
  await act(async () => { answer('Todavía no estoy jugando.'); answer('Estoy jugando ahora.'); });
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toMatchObject([{ correct: false }]);
  expect(text(tree.toJSON())).toContain('Modelo:');
  expect(tree.root.findByType(GrammarSituation).props.disabled).toBe(true);
  await act(async () => tree.root.findByType(GrammarSituation).props.onListen());
  expect(playEnglish).toHaveBeenCalledTimes(2);
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toHaveLength(1);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(exit).not.toHaveBeenCalled();
});
