import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarCoach } from './GrammarCoach';
import { ExplainBack } from './ExplainBack';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readSentenceMemories } from '../domain/memory';
import type { TrickCheckpoint } from '../domain/trickCheckpoint';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'kokoro' })), playSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn() }));
const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
let tree: ReactTestRenderer, saved: TrickCheckpoint;
const next = vi.fn();
const props = { lesson, form: previewUnit.grammar[0], userId: 'reflection-isolated', unitId: previewUnit.id, reviewMode: false, onReady: vi.fn(), onContinue: next, onProgress: (value: TrickCheckpoint) => { saved = value; } };
beforeEach(() => {
  vi.clearAllMocks(); const local = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) }));
  saved = { stage: lesson.steps.length, checkId: 'use', checkIndex: 2, input: 'I am playing', feedback: 'correct', helped: false };
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
const mount = async (reviewMode = false) => { await act(async () => { tree = create(<GrammarCoach {...props} reviewMode={reviewMode} checkpoint={saved} />); }); };
it('ofrece explicar el truco tras practicar, guarda el borrador y no lo califica como un nuevo acierto', async () => {
  await mount(); const explain = () => tree.root.findByType(ExplainBack);
  await act(async () => explain().props.onDraft('I dice quién y AM acompaña a PLAYING.'));
  expect(readLearningActivities('reflection-isolated')).toEqual([]);
  expect(saved.reflection?.draft).toContain('I dice quién');
  act(() => tree.unmount()); await mount();
  expect(explain().props.draft).toContain('I dice quién');
  await act(async () => { explain().props.onCompare(); explain().props.onCompare(); });
  expect(readLearningActivities('reflection-isolated')).toHaveLength(2);
  expect(readLearningActivities('reflection-isolated').every((event) => event.correct === null && event.expected === '')).toBe(true);
  expect(readGrammarAttempts('reflection-isolated')).toEqual([]);
  expect(readSentenceMemories('reflection-isolated')).toEqual([]);
  expect(saved.reflection?.compared).toBe(true);
});
it('la reflexión es opcional y la inspección no registra aprendizaje', async () => {
  await mount(true);
  await act(async () => tree.root.findByType(ExplainBack).props.onCompare());
  expect(readLearningActivities('reflection-isolated')).toEqual([]);
  const finish = tree.root.findAllByType('button').find((node) => node.children.join('') === 'Seguir →')!;
  await act(async () => finish.props.onClick());
  expect(next).toHaveBeenCalledOnce();
});
