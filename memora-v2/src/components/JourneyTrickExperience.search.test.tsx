import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { searchKeysIdentity, searchKeysSkill } from '../domain/searchKeysPractice';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const source = reviewUnits.find((unit) => unit.id === 'm1-entry-keys')!;
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'search-episode-isolated';
let tree: ReactTestRenderer;
const finished = vi.fn();
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const learner = () => readLearningActivities(user).filter((event) => event.source === 'learner');
const checkpoint = () => readTrickCheckpoint(user, stop.id, source.contentVersion ?? '1');
async function mount(value = source) { await act(async () => { tree = create(<JourneyTrickExperience unit={value} stop={stop} userId={user} inspection={false} onFinished={finished} onNext={() => {}} onExit={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />); }); }
async function advance() {
  const region = tree.root.findByProps({ role: 'region' }); const target = { closest: () => null }; const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
  await act(async () => { region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] }); region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] }); vi.advanceTimersByTime(230); });
}
async function teach() { await mount(); for (let index = 0; index < 6; index++) { expect(tree.root.findAllByType('input')).toHaveLength(0); expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0); await advance(); } expect(learner()).toHaveLength(0); }
async function build() { await teach(); await act(async () => button('Busca sus llaves.').props.onClick()); await advance(); }
beforeEach(() => {
  vi.useFakeTimers(); finished.mockClear(); vi.mocked(playEnglish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
  for (const word of source.words.filter((item) => ['KEY', 'PHONE'].includes(item.en))) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('llaves/móvil → enseñanza por piezas → significado → montaje reanudable → conversación con una escritura', async () => {
  await teach();
  expect(text(tree.toJSON())).not.toContain('Falta AM');
  await act(async () => button('Busca su móvil.').props.onClick());
  await act(async () => button('Busca sus llaves.').props.onClick());
  expect(learner()).toMatchObject([{ activityId: 'search-meaning-v1', correct: false }, { correct: true, helped: true }]);
  await advance();
  for (const piece of ['I', 'AM', 'LOOKING FOR']) await act(async () => button(piece).props.onClick());
  expect(checkpoint()).toMatchObject({ episodeId: searchKeysIdentity, continuation: { order: [3, 4, 2], filledSlots: 0 } });
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([3, 4, 2]);
  for (const piece of ['MY', 'KEYS']) await act(async () => button(piece).props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ filledSlots: 5 });
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance();
  expect(text(tree.toJSON()).replace(/\s+/gu, '')).toContain('¿Quéestásbuscando?');
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => /what|will|help you/iu.test(message))).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm looking for my keys" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(text(tree.toJSON()).replace(/\s+/gu, '')).toContain('Voy a ayudarte a buscar las llaves'.replace(/\s+/gu, ''));
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toHaveLength(1);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: searchKeysSkill, correct: true }]);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('rescate del mensaje de cinco piezas conserva errores y ayuda tras recargar sin acierto ficticio', async () => {
  await build();
  const puzzle = () => tree.root.findByType(GrammarOrder);
  await act(async () => puzzle().props.onAnswer('I my keys am looking for'));
  await act(async () => puzzle().props.onAnswer('my keys looking for I am'));
  act(() => tree.unmount()); await mount();
  await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [3, 4, 2, 0, 1], filledSlots: 5, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  expect(readLearningActivities(user).filter((event) => event.activityId.startsWith('trick-build-model:'))).toMatchObject([{ correct: null, helped: true }]);
  await advance(); await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am looking for my keys' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ correct: true, helped: true }]);
});
it('conserva una escritura legacy en marcha, sin reiniciar para imponer el episodio nuevo', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 1, checkId: 'use', input: "I'm looking", feedback: 'help', helped: true });
  await mount();
  expect(tree.root.findByType('input').props.value).toBe("I'm looking");
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(checkpoint()?.episodeId).toBeUndefined();
  expect(learner()).toHaveLength(0);
});
it('el Arcade exige el chequeo nuevo preparado y no recupera la antigua pregunta de AM por herencia', () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: 'looking-for-now', check: 'teach', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  expect(grammarArcadeRounds(user, [source])).toEqual([]);
  recordGrammarAttempt(user, { unitId: source.id, skill: searchKeysSkill, check: 'search-meaning-v1', kind: 'explain', correct: true, helped: true, at: new Date().toISOString() });
  expect(grammarArcadeRounds(user, [source])).toMatchObject([{ skill: searchKeysSkill, situation: { id: 'search-meaning-v1' } }]);
});
it('reutiliza I AM solo con escritura previa correcta sin ayudas y nunca salta el checkpoint ni MY/KEYS nuevos', async () => {
  const visible = () => text(tree.toJSON()).replace(/\s+/gu, '');
  const attempt = { unitId: 'earlier', skill: 'present-continuous:play', check: 'use', kind: 'write' as const, correct: true, at: new Date().toISOString() };
  recordGrammarAttempt(user, { ...attempt, helped: true });
  await mount();
  expect(text(tree.toJSON())).toContain('Empieza por quién busca');
  act(() => tree.unmount());
  recordGrammarAttempt(user, { ...attempt, helped: false });
  await mount();
  expect(text(tree.toJSON())).toContain('Empieza por quién busca');
  act(() => tree.unmount()); clearTrickCheckpoint(user, stop.id);
  await mount();
  expect(checkpoint()?.stage).toBe(2);
  expect(visible()).toContain('LOOKINGFORcuenta');
  await advance(); expect(visible()).toContain('MYindica');
  await advance(); expect(visible()).toContain('KEY:unallave');
  await advance(); expect(visible()).toContain('Juntalaspiezas');
  await advance(); expect(button('Busca sus llaves.')).toBeDefined();
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(learner()).toHaveLength(0);
});
