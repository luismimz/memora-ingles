import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { dinnerCookingIdentity, dinnerCookingSkill } from '../domain/dinnerCookingPractice';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { eligibleMixedUnits } from './ArcadeExperience';
import { playEnglish } from '../services/audio';
import { kitchenLocationIdentity, kitchenLocationSkill } from '../domain/kitchenLocationPractice';
import { distinctGrammarMessages } from '../domain/arcadeSession';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const source = reviewUnits.find((unit) => unit.id === 'm1-test-kitchen')!;
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'dinner-episode-isolated';
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
it('enseña→comprende con error conservado→monta→avisa una sola vez; Nora no encarga otra cena', async () => {
  await mount();
  expect(text(tree.root.findByProps({ className: 'play-intention' }))).toBe('Avisa para que Nora no encargue otra cena');
  for (let index = 0; index < 6; index++) { expect(tree.root.findAllByType('input')).toHaveLength(0); await advance(); }
  expect(learner()).toHaveLength(0);
  await act(async () => button('La cena ya está servida.').props.onClick());
  expect(visible()).toContain('siguepreparándose');
  const error = learner()[0];
  act(() => tree.unmount()); await mount();
  expect(checkpoint()?.episodeId).toBe(dinnerCookingIdentity);
  await act(async () => button('Está cocinando la cena.').props.onClick());
  expect(learner()).toMatchObject([{ id: error.id, correct: false }, { correct: true, parentAttemptId: error.id, helped: true }]);
  await advance();
  for (const part of ['I', 'AM']) await act(async () => button(part).props.onClick());
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([2, 3]);
  for (const part of ['COOKING', 'DINNER']) await act(async () => button(part).props.onClick());
  expect(checkpoint()?.continuation?.filledSlots).toBe(4);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance(); expect(visible()).toContain('¿Quéestáscocinando?');
  expect(vi.mocked(playEnglish).mock.calls.some(([phrase]) => phrase === 'What are you cooking?')).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm cooking dinner" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('Noencargootracena');
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: dinnerCookingSkill, correct: true }]);
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  expect(grammarArcadeRounds(user, [source]).filter((round) => !round.conceptual).every((round) => !round.slot.choices.some((choice) => /soap|desk/.test(choice)))).toBe(true);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('la partida corta en curso conserva su identidad y no exige DINNER a mitad', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 0, checkId: 'meaning-now-v1', input: '', feedback: 'idle', helped: false, episodeId: 'ing:short-cooking-v1' });
  await mount();
  expect(checkpoint()?.episodeId).toBe('ing:short-cooking-v1');
  expect(visible()).toContain('Estoycocinandoahora.');
  expect(visible()).not.toContain('Lacenayaestáservida.');
  expect(learner()).toHaveLength(0);
});
it('dos errores de montaje ofrecen modelo finito de cuatro piezas y conservan ayuda al escribir', async () => {
  await mount(); for (let index = 0; index < 6; index++) await advance();
  await act(async () => button('Está cocinando la cena.').props.onClick()); await advance();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I cooking am dinner'));
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('dinner am cooking I'));
  act(() => tree.unmount()); await mount();
  await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [2, 3, 1, 0], filledSlots: 4, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  await advance();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am cooking dinner' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: dinnerCookingSkill, correct: true, helped: true }]);
});
it('el significado corto anterior no acredita DINNER ni sus rondas nuevas', () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: 'present-continuous:cook', check: 'meaning-now-v1', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  expect(grammarArcadeRounds(user, [source]).some((round) => round.skill === dinnerCookingSkill)).toBe(false);
});

it('una práctica posterior prepara ubicación y Nora lleva el paño al lugar comunicado, no repite la cena', async () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: dinnerCookingSkill, check: 'turn-respond', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  recordGrammarAttempt(user, { unitId: source.id, skill: dinnerCookingSkill, check: 'dinner-meaning-v1', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  await mount();
  expect(checkpoint()?.stage).toBe(2);
  expect(text(tree.root.findByProps({ className: 'play-intention' }))).toBe('Dile a Nora dónde estás cocinando');
  for (let index = 0; index < 4; index++) await advance();
  expect(checkpoint()?.episodeId).toBe(kitchenLocationIdentity);
  await act(async () => button('Está cocinando en el jardín.').props.onClick());
  expect(visible()).toContain('estaestáeneljardín');
  const first = learner()[0];
  act(() => tree.unmount()); await mount();
  await act(async () => button('Está cocinando en la cocina.').props.onClick());
  expect(learner()).toMatchObject([{ id: first.id, correct: false }, { correct: true, parentAttemptId: first.id, helped: true }]);
  await advance();
  for (const part of ['I', 'AM', 'COOKING', 'IN THE KITCHEN']) await act(async () => button(part).props.onClick());
  expect(readGrammarAttempts(user).filter((attempt) => attempt.skill === kitchenLocationSkill && attempt.kind === 'write')).toHaveLength(0);
  await advance();
  expect(visible()).toContain('¿Dóndeestáscocinando?');
  expect(vi.mocked(playEnglish).mock.calls.some(([phrase]) => phrase === 'Where are you cooking?')).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm cooking in the kitchen" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('Teacercoelpañoalacocina');
  expect(readGrammarAttempts(user).filter((attempt) => attempt.skill === kitchenLocationSkill && attempt.kind === 'write')).toHaveLength(1);
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  const rounds = grammarArcadeRounds(user, [source]);
  expect(rounds.some((round) => round.skill === dinnerCookingSkill)).toBe(true);
  expect(rounds.some((round) => round.skill === kitchenLocationSkill)).toBe(true);
  const messages = distinctGrammarMessages(rounds).map((round) => round.situation?.situation?.message ?? round.sentence.en);
  expect(messages).toContain('I am cooking dinner');
  expect(messages).toContain('I am cooking in the kitchen');
  expect(rounds.filter((round) => !round.conceptual).every((round) => !round.slot.choices.some((choice) => /soap|desk/.test(choice)))).toBe(true);
});

it('el checkpoint de cena prevalece aunque ahora exista evidencia para la ubicación', async () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: dinnerCookingSkill, check: 'turn-respond', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 0, checkId: 'dinner-meaning-v1', input: '', feedback: 'idle', helped: false, episodeId: dinnerCookingIdentity });
  await mount();
  expect(checkpoint()?.episodeId).toBe(dinnerCookingIdentity);
  expect(text(tree.root.findByProps({ className: 'play-intention' }))).toBe('Avisa para que Nora no encargue otra cena');
  expect(visible()).not.toContain('¿Dóndeestáscocinando?');
});
