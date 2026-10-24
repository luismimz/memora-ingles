import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { previewUnit as source } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { computerPlayingIdentity, computerPlayingSkill } from '../domain/computerPlayingPractice';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { eligibleMixedUnits } from './ArcadeExperience';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const stop = trickStop(source, grammarTricks(source)[0]);
const user = 'computer-episode-isolated';
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
it('enseña el bloque, distingue el aparato, retoma piezas y avisa una sola vez sin apagar el ordenador', async () => {
  await mount();
  for (let i = 0; i < 6; i++) { expect(tree.root.findAllByType('input')).toHaveLength(0); await advance(); }
  expect(learner()).toHaveLength(0);
  await act(async () => button('Está jugando con una consola.').props.onClick());
  expect(visible()).toContain('estausaunaconsola');
  const error = learner()[0];
  act(() => tree.unmount()); await mount();
  expect(checkpoint()?.episodeId).toBe(computerPlayingIdentity);
  await act(async () => button('Está jugando en su ordenador.').props.onClick());
  expect(learner()).toMatchObject([{ id: error.id, correct: false }, { correct: true, parentAttemptId: error.id, helped: true }]);
  await advance();
  for (const part of ['I', 'AM']) await act(async () => button(part).props.onClick());
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([2, 3]);
  for (const part of ['PLAYING', 'ON MY COMPUTER']) await act(async () => button(part).props.onClick());
  expect(checkpoint()?.continuation?.filledSlots).toBe(4);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance(); expect(visible()).toContain('¿Estásusandoelordenador?');
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => /are you|will|desk/iu.test(message))).toBe(false);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm playing on my computer" } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(visible()).toContain('Dejoelordenadorencendido');
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toHaveLength(1);
  expect(eligibleMixedUnits(user, [source])).toEqual([]);
  expect(grammarArcadeRounds(user, [source]).some((round) => round.slot.choices.some((choice) => /at my desk/iu.test(choice)))).toBe(false);
  await advance(); expect(finished).toHaveBeenCalledOnce();
});
it('un episodio corto guardado sigue corto, aunque ahora COMPUTER esté preparado', async () => {
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 0, checkId: 'meaning-now-v1', input: '', feedback: 'idle', helped: false, episodeId: 'ing:short-playing-v1' });
  await mount(); expect(checkpoint()?.episodeId).toBe('ing:short-playing-v1');
  expect(visible()).toContain('Estoyjugandoahora.');
  expect(visible()).not.toContain('Estájugandoensuordenador.');
  expect(learner()).toHaveLength(0);
});
it('la reparación del puzle termina en modelo de cuatro bloques sin fabricar acierto', async () => {
  await mount(); for (let i = 0; i < 6; i++) await advance();
  await act(async () => button('Está jugando en su ordenador.').props.onClick()); await advance();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I playing am on my computer'));
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('computer my on I am playing'));
  act(() => tree.unmount()); await mount();
  await act(async () => button('Colocar con ayuda').props.onClick());
  expect(checkpoint()?.continuation).toMatchObject({ order: [2, 3, 1, 0], filledSlots: 4, modelUsed: true });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  await advance();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am playing on my computer' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: computerPlayingSkill, correct: true, helped: true }]);
});
it('I AM demostrado no omite el bloque nuevo ni un checkpoint; el viejo significado no acredita el nuevo', async () => {
  recordGrammarAttempt(user, { unitId: source.id, skill: 'present-continuous:play', check: 'turn-respond', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  await mount(); expect(checkpoint()?.stage).toBe(2);
  await advance(); expect(visible()).toContain('MYCOMPUTER');
  await advance(); expect(visible()).toContain('notraducesiempre');
  expect(grammarArcadeRounds(user, [source]).some((round) => round.skill === computerPlayingSkill)).toBe(false);
});
