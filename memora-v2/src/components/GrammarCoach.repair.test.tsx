import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { previewUnit } from '../preview/previewUnit';
import { grammarTricks } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readTrickCheckpoint } from '../domain/trickCheckpoint';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'repair-isolated';
const stop = { id: 'isolated-trick', title: 'Práctica aislada', routeTrick: grammarTricks(previewUnit)[0] };
const finished = vi.fn();
async function mount() {
  await act(async () => { tree = create(<JourneyTrickExperience unit={previewUnit} stop={stop} userId={user} inspection={false} onFinished={finished} onExit={() => {}} onNext={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />); });
}
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node) === label)!;
const press = async (label: string) => { await act(async () => button(label).props.onClick()); };
beforeEach(() => {
  finished.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('la parada real monta antes de escribir y limita ráfagas, recarga y modelo sin fabricar aciertos', async () => {
  await mount(); await press('Ya lo entiendo · probarlo');
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  const staleSubmit = tree.root.findByType(GrammarOrder).props.onAnswer;
  await act(async () => { for (let n = 0; n < 15; n++) staleSubmit('PLAYING I AM'); });
  const errors = readLearningActivities(user).filter((event) => event.source === 'learner');
  expect(errors).toHaveLength(2); expect(errors.every((event) => event.correct === false)).toBe(true);
  expect(errors[1].parentAttemptId).toBe(errors[0].id);
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')).toMatchObject({ checkFailures: 2, previousAttemptId: errors[1].id });
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(readLearningActivities(user).filter((event) => event.activityId === 'model:order-message-v1')).toHaveLength(1);
  await act(async () => tree.unmount()); await mount();
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual(errors);
  expect(button('Seguir con el modelo →')).toBeDefined();
  const advance = button('Seguir con el modelo →').props.onClick;
  await act(async () => { advance(); advance(); });
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  const answer = tree.root.findAllByType('button').find((node) => text(node).startsWith('Estoy ') && text(node).endsWith('ahora.'))!;
  await act(async () => answer.props.onClick()); await press('Seguir →');
  expect(tree.root.findAllByType('input')).toHaveLength(1);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I playing' } }));
  const submit = tree.root.findByType('form').props.onSubmit;
  await act(async () => { for (let n = 0; n < 15; n++) submit({ preventDefault() {} }); });
  expect(readGrammarAttempts(user).filter((event) => event.check === 'use')).toHaveLength(2);
  expect(button('Seguir con el modelo →')).toBeDefined();
  await press('Seguir con el modelo →');
  expect(finished).toHaveBeenCalledOnce();
  expect(readLearningActivities(user).filter((event) => event.activityId === 'use').map((event) => event.correct)).toEqual([false, false]);
  expect(readLearningActivities(user).filter((event) => event.activityId === 'model:use')).toHaveLength(1);
});
