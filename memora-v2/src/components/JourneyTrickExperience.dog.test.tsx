import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { dogWalkingIdentity, dogWalkingSkill } from '../domain/dogWalkingPractice';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { eligibleMixedUnits } from './ArcadeExperience';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const source = reviewUnits.find((unit) => unit.id === 'm1-outside-dog')!;
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'dog-episode-isolated';
let tree: ReactTestRenderer;
const finished = vi.fn();
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const visible = () => text(tree.toJSON()).replace(/\s+/gu, '');
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const checkpoint = () => readTrickCheckpoint(user, stop.id, source.contentVersion ?? '1');
const learner = () => readLearningActivities(user).filter((event) => event.source === 'learner');
async function mount() { await act(async () => { tree = create(<JourneyTrickExperience unit={source} stop={stop} userId={user} inspection={false} onFinished={finished} onNext={() => {}} onExit={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />); }); }
async function advance() {
  const region = tree.root.findByProps({ role: 'region' }); const target = { closest: () => null }; const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
  await act(async () => { region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] }); region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] }); vi.advanceTimersByTime(230); });
}
beforeEach(() => {
  vi.useFakeTimers(); finished.mockClear(); vi.mocked(playEnglish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
  for (const word of source.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('enseña el paseo antes de pedirlo y Nora deja de buscar dentro tras una única escritura', async () => {
  await mount();
  expect(text(tree.root.findByProps({ className: 'play-intention' }))).toBe('Avisa de que ya estás paseando a tu perro');
  for (let index = 0; index < 6; index++) { expect(tree.root.findAllByType('input')).toHaveLength(0); await advance(); }
  expect(learner()).toHaveLength(0);
  await act(async () => button('Espera quieto con su perro.').props.onClick());
  expect(visible()).toContain('esperandoquietos');
  const error = learner()[0];
  act(() => tree.unmount()); await mount();
  expect(checkpoint()?.episodeId).toBe(dogWalkingIdentity);
  await act(async () => button('Está paseando a su perro.').props.onClick());
  expect(learner()).toMatchObject([{ id: error.id, correct: false }, { correct: true, parentAttemptId: error.id, helped: true }]);
  await advance();
  for (const part of ['I', 'AM']) await act(async () => button(part).props.onClick());
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([2, 3]);
  for (const part of ['WALKING', 'MY DOG']) await act(async () => button(part).props.onClick());
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance();
  expect(vi.mocked(playEnglish).mock.calls.some(([phrase]) => phrase === 'What are you doing?')).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm walking my dog" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('Dejodebuscartedentro');
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: dogWalkingSkill, correct: true }]);
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  expect(grammarArcadeRounds(user, [source]).filter((round) => !round.conceptual).every((round) => !round.slot.choices.some((choice) => /tree|near|phone|desk/.test(choice)))).toBe(true);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('el borrador escrito anterior conserva texto, tarea y ayuda sin imponer MY DOG', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 2, checkId: 'use', input: 'I am walk', feedback: 'help', helped: true });
  await mount();
  expect(checkpoint()?.episodeId).toBeUndefined();
  expect(tree.root.findByType('input').props.value).toBe('I am walk');
  expect(checkpoint()?.helped).toBe(true);
  expect(learner()).toHaveLength(0);
});
it('el modelo finito de cuatro piezas conserva ayuda en el aviso del paseo', async () => {
  await mount(); for (let index = 0; index < 6; index++) await advance();
  await act(async () => button('Está paseando a su perro.').props.onClick()); await advance();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I walking am my dog'));
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('my dog I am walking'));
  act(() => tree.unmount()); await mount();
  await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [2, 3, 1, 0], filledSlots: 4, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  await advance();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am walking my dog' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: dogWalkingSkill, correct: true, helped: true }]);
});
