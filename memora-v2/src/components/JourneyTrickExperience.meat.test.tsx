import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { grammarJourney } from '../domain/grammarJourney';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { meatCookingIdentity, meatCookingSkill } from '../domain/meatCookingPractice';
import { dinnerCookingSkill } from '../domain/dinnerCookingPractice';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { eligibleMixedUnits } from './ArcadeExperience';
import { playEnglish } from '../services/audio';
import type { AtomicUnit } from '../domain/unit';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const source = reviewUnits.find((unit) => unit.id === 'm1-kitchen-pan')!;
const kitchen = reviewUnits.find((unit) => unit.id === 'm1-test-kitchen')!;
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'meat-episode-isolated';
let tree: ReactTestRenderer;
const finished = vi.fn();
const prepare = vi.fn();
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const visible = () => text(tree.toJSON()).replace(/\s+/gu, '');
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const checkpoint = () => readTrickCheckpoint(user, stop.id, source.contentVersion ?? '1');
const learner = () => readLearningActivities(user).filter((event) => event.source === 'learner');
async function mount(sources: AtomicUnit[] = [kitchen]) { await act(async () => { tree = create(<JourneyTrickExperience unit={source} stop={stop} preparationSources={sources} onPrepare={prepare} userId={user} inspection={false} onFinished={finished} onNext={() => {}} onExit={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />); }); }
async function advance() {
  const region = tree.root.findByProps({ role: 'region' }); const target = { closest: () => null }; const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
  await act(async () => { region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] }); region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] }); vi.advanceTimersByTime(230); });
}
beforeEach(() => {
  vi.useFakeTimers(); finished.mockClear(); prepare.mockClear(); vi.mocked(playEnglish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
  for (const word of [...source.words, ...kitchen.words]) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  recordGrammarAttempt(user, { unitId: kitchen.id, skill: dinnerCookingSkill, check: 'turn-respond', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('la aplicación alimentaria no desaparece del mapa por compartir COOK con otra ficha', () => {
  expect(stop.routeTrick?.vocabulary).toEqual(['cook', 'meat']);
  expect(grammarJourney([kitchen, source]).some((item) => item.id === stop.id && item.routeTrick?.skill === meatCookingSkill)).toBe(true);
});
it('comprende carne en preparación, reanuda piezas y coordina el acompañamiento con una escritura', async () => {
  await mount(); expect(checkpoint()?.stage).toBe(2);
  for (let index = 0; index < 4; index++) { expect(tree.root.findAllByType('input')).toHaveLength(0); await advance(); }
  expect(learner()).toHaveLength(0);
  await act(async () => button('La carne sigue guardada sin cocinar.').props.onClick());
  expect(visible()).toContain('guardadaenlanevera'); const error = learner()[0];
  act(() => tree.unmount()); await mount(); expect(checkpoint()?.episodeId).toBe(meatCookingIdentity);
  await act(async () => button('Está cocinando carne.').props.onClick());
  expect(learner()).toMatchObject([{ id: error.id, correct: false }, { correct: true, parentAttemptId: error.id, helped: true }]);
  await advance(); for (const part of ['I', 'AM']) await act(async () => button(part).props.onClick());
  act(() => tree.unmount()); await mount(); expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([2, 3]);
  for (const part of ['COOKING', 'MEAT']) await act(async () => button(part).props.onClick());
  expect(readGrammarAttempts(user).filter((attempt) => attempt.unitId === source.id && attempt.kind === 'write')).toHaveLength(0);
  await advance(); expect(vi.mocked(playEnglish).mock.calls.some(([phrase]) => phrase === 'What are you cooking?')).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm cooking meat" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('preparoelacompañamiento');
  expect(readGrammarAttempts(user).filter((attempt) => attempt.unitId === source.id && attempt.kind === 'write')).toMatchObject([{ skill: meatCookingSkill, correct: true }]);
  expect(eligibleMixedUnits(user, [kitchen, source]).some((unit) => unit.id === source.id)).toBe(false);
  const rounds = grammarArcadeRounds(user, [kitchen, source]).filter((round) => round.unit.id === source.id);
  expect(rounds.some((round) => round.situation?.id === 'meat-meaning-v1')).toBe(true);
  expect(rounds.filter((round) => !round.conceptual).every((round) => !round.slot.choices.some((choice) => /\b(eggs|and|pan|keys|desk)\b/.test(choice)))).toBe(true);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('el formato sin versión exige su presentación exacta y no crea intentos al faltar', async () => {
  await mount([{ ...kitchen, words: kitchen.words.map((word) => ({ ...word, scene: 'Otra historia.' })) }]);
  expect(visible()).toContain('PrepararCOOK:cocinar'); expect(learner()).toHaveLength(0);
  const before = readLearningActivities(user);
  await act(async () => button('Preparar COOK: cocinar').props.onClick());
  expect(prepare).toHaveBeenCalledWith({ unitId: kitchen.id, mode: 'vocabulary', label: 'Preparar COOK: cocinar' });
  expect(readLearningActivities(user)).toEqual(before);
});
it('un borrador sin lección legacy compatible no se borra ni se sustituye por la aplicación nueva', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 2, checkId: 'use', input: 'I am cook', feedback: 'help', helped: true });
  await mount(); expect(checkpoint()).toMatchObject({ input: 'I am cook', helped: true }); expect(checkpoint()?.episodeId).toBeUndefined(); expect(visible()).toContain('Estaescenanecesitapreparación'); expect(learner()).toHaveLength(0);
});
it('el modelo finito mantiene ayuda en la escritura final de carne', async () => {
  await mount(); for (let index = 0; index < 4; index++) await advance();
  await act(async () => button('Está cocinando carne.').props.onClick()); await advance();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I cooking am meat'));
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('meat I am cooking'));
  act(() => tree.unmount()); await mount(); await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [2, 3, 1, 0], filledSlots: 4, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  await advance(); await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am cooking meat' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.skill === meatCookingSkill && attempt.kind === 'write')).toMatchObject([{ correct: true, helped: true }]);
});
