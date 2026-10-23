import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { GrammarOrder } from './GrammarOrder';
import { previewUnit } from '../preview/previewUnit';
import { grammarTricks } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
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
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
async function advance(double = false) {
  const region = tree.root.findByProps({ role: 'region' });
  const target = { closest: () => null };
  await act(async () => {
    region.props.onTouchStart({ target, touches: [{ clientY: 300 }] });
    region.props.onTouchMove({ target, touches: [{ clientY: 250 }] });
    region.props.onScroll({ currentTarget: { scrollTop: 100, scrollHeight: 700, clientHeight: 600 } });
    if (double) { region.props.onScroll({ currentTarget: { scrollTop: 100, scrollHeight: 700, clientHeight: 600 } }); }
    vi.advanceTimersByTime(230);
  });
}
async function reachPuzzle() {
  for (let count = 0; count < 10 && !tree.root.findAllByType(GrammarOrder).length; count++) await advance();
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toHaveLength(0);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: false }) });
  finished.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('la parada real monta antes de escribir y limita ráfagas, recarga y modelo sin fabricar aciertos', async () => {
  await mount(); await reachPuzzle();
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
  expect(tree.root.findAllByProps({ 'aria-label': 'Continuar con el modelo' })).toHaveLength(1);
  await advance(true);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  const answer = button('Estoy jugando ahora.');
  await act(async () => answer.props.onClick()); await advance();
  expect(tree.root.findAllByType('input')).toHaveLength(1);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I playing' } }));
  const submit = tree.root.findByType('form').props.onSubmit;
  await act(async () => { for (let n = 0; n < 15; n++) submit({ preventDefault() {} }); });
  expect(readGrammarAttempts(user).filter((event) => event.check === 'use')).toHaveLength(2);
  expect(tree.root.findAllByProps({ 'aria-label': 'Continuar con el modelo' })).toHaveLength(1);
  await advance();
  expect(finished).toHaveBeenCalledOnce();
  expect(readLearningActivities(user).filter((event) => event.activityId === 'use').map((event) => event.correct)).toEqual([false, false]);
  expect(readLearningActivities(user).filter((event) => event.activityId === 'model:use')).toHaveLength(1);
});
it('la parada real comprueba al colocar las tres piezas sin buscar Enviar mensaje', async () => {
  await mount(); await reachPuzzle();
  expect(button('Enviar mensaje →')).toBeUndefined();
  for (const label of ['I', 'AM', 'PLAYING']) {
    const bank = tree.root.findByProps({ 'aria-label': 'Piezas disponibles' });
    const piece = bank.findAllByType('button').find((node) => text(node) === label)!;
    await act(async () => piece.props.onClick({ detail: 0 }));
  }
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toMatchObject([{ activityId: 'order-message-v1', correct: true, helped: true }]);
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')).toMatchObject({ order: expect.any(Array), feedback: 'correct' });
  expect(tree.root.findAllByType('input')).toHaveLength(0);
});
it('una estructura ya practicada enseña solo el nuevo ejemplo antes del puzle y respeta una partida reanudada', async () => {
  recordGrammarAttempt(user, { skill: 'present-continuous:brush', unitId: 'prior-isolated', check: 'use', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  await mount();
  expect(text(tree.toJSON())).toContain('UNA ACCIÓN NUEVA');
  expect(text(tree.toJSON())).toContain('Misma estructura');
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')?.stage).toBe(2);
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toHaveLength(0);
  await advance();
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(1);
  const bank = tree.root.findByProps({ 'aria-label': 'Piezas disponibles' });
  await act(async () => bank.findAllByType('button').find((node) => text(node) === 'I')!.props.onClick({ detail: 0 }));
  const saved = readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1');
  expect(saved).toMatchObject({ stage: 3, order: expect.any(Array) });
  act(() => tree.unmount()); await mount();
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(1);
  expect(tree.root.findAllByProps({ 'aria-label': 'Quitar I, posición 1' })).toHaveLength(1);
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toHaveLength(0);
});
it('pedir ayuda y enviar inmediatamente conserva la ayuda en las dos evidencias y al recargar', async () => {
  recordGrammarAttempt(user, { skill: 'present-continuous:brush', unitId: 'prior-isolated', check: 'use', kind: 'write', correct: true, helped: false, at: new Date().toISOString() });
  await mount(); await reachPuzzle();
  for (const label of ['I', 'AM', 'PLAYING']) {
    const bank = tree.root.findByProps({ 'aria-label': 'Piezas disponibles' });
    await act(async () => bank.findAllByType('button').find((node) => text(node) === label)!.props.onClick({ detail: 0 }));
  }
  await advance();
  await act(async () => button('Estoy jugando ahora.').props.onClick());
  await advance();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am playing' } }));
  const submit = tree.root.findByType('form').props.onSubmit;
  const hint = tree.root.findByType('details').props.onToggle;
  await act(async () => { hint({ currentTarget: { open: true } }); submit({ preventDefault() {} }); });
  expect(readGrammarAttempts(user).filter((event) => event.check === 'use' && event.unitId === previewUnit.id)).toMatchObject([{ correct: true, helped: true }]);
  expect(readLearningActivities(user).filter((event) => event.activityId === 'use')).toMatchObject([{ correct: true, helped: true }]);
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')).toMatchObject({ helped: true, feedback: 'correct' });
  act(() => tree.unmount()); await mount();
  expect(readGrammarAttempts(user).filter((event) => event.check === 'use' && event.unitId === previewUnit.id)).toHaveLength(1);
  expect(tree.root.findByType('input').props.disabled).toBe(true);
});
it('el mensaje de jugar cambia la escena según el sentido y conserva el primer error al reparar', async () => {
  await mount(); await reachPuzzle();
  for (const label of ['I', 'AM', 'PLAYING']) {
    const bank = tree.root.findByProps({ 'aria-label': 'Piezas disponibles' });
    await act(async () => bank.findAllByType('button').find((node) => text(node) === label)!.props.onClick({ detail: 0 }));
  }
  await advance();
  expect(tree.root.findAllByProps({ 'aria-label': 'Elige la escena que comunica el mensaje' })).toHaveLength(1);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  await act(async () => button('Todavía no estoy jugando.').props.onClick());
  expect(text(tree.toJSON())).toContain('Has dejado el mando guardado');
  expect(text(tree.toJSON())).not.toContain('Mensaje entregado');
  const attempts = readLearningActivities(user).filter((event) => event.activityId === 'meaning-now-v1');
  expect(attempts).toMatchObject([{ correct: false, helped: true }]);
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Has dejado el mando guardado');
  expect(readLearningActivities(user).filter((event) => event.activityId === 'meaning-now-v1')).toEqual(attempts);
  await act(async () => button('Estoy jugando ahora.').props.onClick());
  expect(text(tree.toJSON())).toContain('Mensaje entregado');
  const repaired = readLearningActivities(user).filter((event) => event.activityId === 'meaning-now-v1');
  expect(repaired).toMatchObject([{ correct: false }, { correct: true, helped: true, parentAttemptId: attempts[0].id }]);
  await advance();
  expect(tree.root.findAllByType('input')).toHaveLength(1);
});
