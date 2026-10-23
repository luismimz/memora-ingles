import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { bedMakingIdentity, bedMakingSkill } from '../domain/bedMakingPractice';
import { searchKeysSkill } from '../domain/searchKeysPractice';
import { playEnglish } from '../services/audio';
import { eligibleMixedUnits } from './ArcadeExperience';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const source = reviewUnits.find((unit) => unit.id === 'm1-bedroom-bed')!;
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'bed-episode-isolated';
let tree: ReactTestRenderer;
const finished = vi.fn();
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const visible = () => text(tree.toJSON()).replace(/\s+/gu, '');
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const learner = () => readLearningActivities(user).filter((event) => event.source === 'learner');
const checkpoint = () => readTrickCheckpoint(user, stop.id, source.contentVersion ?? '1');
async function mount(value = source) { await act(async () => { tree = create(<JourneyTrickExperience unit={value} stop={stop} userId={user} inspection={false} onFinished={finished} onNext={() => {}} onExit={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />); }); }
async function advance() {
  const region = tree.root.findByProps({ role: 'region' }); const target = { closest: () => null }; const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
  await act(async () => { region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] }); region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] }); vi.advanceTimersByTime(230); });
}
async function build() { await mount(); for (let index = 0; index < 6; index++) { expect(tree.root.findAllByType('input')).toHaveLength(0); await advance(); } expect(learner()).toHaveLength(0); await act(async () => button('Está haciendo su cama.').props.onClick()); await advance(); }
beforeEach(() => {
  vi.useFakeTimers(); finished.mockClear(); vi.mocked(playEnglish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
  for (const word of source.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('prepara las piezas, comprende, monta, retoma y comunica qué hace antes de recibir la almohada', async () => {
  await build();
  expect(checkpoint()?.episodeId).toBe(bedMakingIdentity);
  for (const piece of ['I', 'AM', 'MAKING']) await act(async () => button(piece).props.onClick());
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([3, 4, 2]);
  for (const piece of ['MY', 'BED']) await act(async () => button(piece).props.onClick());
  expect(checkpoint()?.continuation?.filledSlots).toBe(5);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance();
  expect(visible()).toContain('¿Quéestáshaciendo?');
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => /what|will|pillow|with/iu.test(message))).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm making my bed" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('Dejolaalmohadaatulado');
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toHaveLength(1);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: bedMakingSkill, correct: true }]);
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('dos errores dan un modelo ordenado de cinco piezas y conservan ayuda al responder tras recargar', async () => {
  await build(); const puzzle = () => tree.root.findByType(GrammarOrder);
  await act(async () => puzzle().props.onAnswer('I making am my bed'));
  await act(async () => puzzle().props.onAnswer('bed my making I am'));
  act(() => tree.unmount()); await mount();
  await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [3, 4, 2, 1, 0], filledSlots: 5, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  expect(readLearningActivities(user).filter((event) => event.activityId.startsWith('trick-build-model:'))).toMatchObject([{ correct: null, helped: true }]);
  await advance(); await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am making my bed' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ correct: true, helped: true }]);
});
it('la escritura larga legacy sigue donde estaba y el Arcade no hereda su pregunta de ortografía', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 1, checkIndex: 1, checkId: 'use', input: "I'm making my bed with", feedback: 'idle', helped: false });
  await mount(); expect(tree.root.findByType('input').props.value).toBe("I'm making my bed with");
  expect(checkpoint()?.episodeId).toBeUndefined(); expect(learner()).toHaveLength(0);
  recordGrammarAttempt(user, { unitId: source.id, skill: 'make-drop-e', check: 'explain', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  expect(grammarArcadeRounds(user, [source])).toEqual([]);
  recordGrammarAttempt(user, { unitId: source.id, skill: bedMakingSkill, check: 'bed-meaning-v1', kind: 'explain', correct: true, helped: true, at: new Date().toISOString() });
  expect(grammarArcadeRounds(user, [source])).toMatchObject([{ skill: bedMakingSkill, situation: { id: 'bed-meaning-v1' } }]);
});
it('reutiliza I AM demostrado en llaves, pero no omite MY BED ni MAKE→MAKING', async () => {
  recordGrammarAttempt(user, { unitId: 'keys-earlier', skill: searchKeysSkill, check: 'turn-respond', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  await mount(); expect(checkpoint()?.stage).toBe(2); expect(visible()).toContain('MYBEDesmicama');
  await advance(); expect(visible()).toContain('MAKE MY BED'.replace(/\s/gu, ''));
  await advance(); expect(visible()).toContain('MAKE→MAKING');
  expect(tree.root.findAllByType('input')).toHaveLength(0); expect(learner()).toHaveLength(0);
});
it('el diálogo corto no prepara WITH A PILLOW; una respuesta legacy propia y de la versión vigente sí conserva su acceso', () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: bedMakingSkill, check: 'bed-meaning-v1', kind: 'explain', correct: true, helped: true, at: new Date().toISOString() });
  const attempt = { unitId: source.id, unitTitle: source.title, contentVersion: source.contentVersion ?? '1', activityId: 'legacy-dialogue', skill: 'legacy-dialogue', phase: 'dialogue' as const, source: 'learner' as const, modality: 'writing' as const, prompt: '¿Qué haces?', expected: source.sentence.en, correct: true, helped: false };
  recordLearningActivity(user, { ...attempt, response: 'I am making my bed.' });
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  recordLearningActivity(user, { ...attempt, contentVersion: 'another-version', response: source.sentence.en });
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  recordLearningActivity(user, { ...attempt, response: source.sentence.en });
  expect(eligibleMixedUnits(user, [source])).toEqual([source]);
});
