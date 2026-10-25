import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LanguageGame } from './LanguageGame';
import { previewUnit } from './preview/previewUnit';
import { initialGame } from './domain/game';
import { getUnitSentences } from './domain/unit';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { readLearningActivities, recordLearningActivity } from './domain/learningActivity';
import { preparedFixture } from './test/grammarPracticeFixtures';

vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), prefetchSpeech: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('./services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'construction-isolated';
const next = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const saved = () => readGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1');
async function mount(unit = previewUnit) {
  await act(async () => { tree = create(<LanguageGame unit={unit} userId={user} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
}
async function swipe() {
  const region = tree.root.findByProps({ role: 'region' });
  const target = { closest: () => null };
  await act(async () => {
    const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
    region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] });
    region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] });
    region.props.onScroll({ currentTarget: { scrollTop: 100, scrollHeight: 700, clientHeight: 600 } });
    vi.advanceTimersByTime(230);
  });
}

it('el cierre real conserva continuación y Eco opcional sin fabricar otro intento', async () => {
  const sentences = getUnitSentences(previewUnit);
  writeGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'build', sentenceIndex: sentences.length - 1, filledSlots: sentences[sentences.length - 1].slots.length });
  await mount({ ...previewUnit, communication: undefined });
  await act(async () => { button('Usar mi frase →').props.onClick(); vi.advanceTimersByTime(230); });
  const actions = tree.root.findByProps({ className: 'practice-closure-actions' }).findAllByType('button');
  expect(actions).toHaveLength(2);
  expect(text(actions[0])).toBe('Seguir →');
  expect(text(actions[1])).toBe('Terminar por hoy');
  const extras = tree.root.findByProps({ className: 'practice-closure-extras' });
  expect(extras.props.open).toBeUndefined();
  expect(extras.findAllByProps({ className: 'echo-practice' })).toHaveLength(1);
  const attempts = readLearningActivities(user).filter((event) => event.source === 'learner');
  await act(async () => { actions[0].props.onClick(); });
  expect(next).toHaveBeenCalledOnce();
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual(attempts);
});
beforeEach(() => {
  vi.useFakeTimers(); next.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: false }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('intento y reparación son finitos, el modelo no crea acierto y el resultado continúa con scroll', async () => {
  writeGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'build' });
  await mount(); await swipe();
  expect(saved()?.filledSlots).toBe(0);
  const wrong = previewUnit.sentence.slots[0].choices.find((choice) => choice !== previewUnit.sentence.slots[0].en)!;
  const staleClick = button(wrong).props.onClick;
  await act(async () => { for (let index = 0; index < 15; index++) staleClick(); });
  const attempts = readLearningActivities(user).filter((event) => event.source === 'learner');
  expect(attempts).toHaveLength(2);
  expect(attempts).toMatchObject([{ correct: false }, { correct: false, parentAttemptId: attempts[0].id }]);
  expect(saved()).toMatchObject({ filledSlots: 0, buildRepair: { failures: 2, choice: wrong, previousAttemptId: attempts[1].id } });
  expect(text(tree.toJSON())).toContain('Queda como modelo consultado');
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Queda como modelo consultado');
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual(attempts);
  const model = button('Colocar con ayuda').props.onClick;
  await act(async () => { model(); model(); });
  expect(saved()).toMatchObject({ filledSlots: 1, buildModelUsed: true });
  await act(async () => model());
  expect(saved()?.filledSlots).toBe(1);
  expect(readLearningActivities(user).filter((event) => event.activityId === 'build-model-0-0')).toMatchObject([{ source: 'authored', correct: null, parentAttemptId: attempts[1].id }]);
  for (let slot = 1; slot < previewUnit.sentence.slots.length; slot++) await act(async () => button(previewUnit.sentence.slots[slot].en).props.onClick());
  expect(readLearningActivities(user).filter((event) => event.activityId === 'constructed-0')).toMatchObject([{ source: 'authored', correct: null, helped: true }]);
  expect(button('Usar mi frase →')).toBeUndefined();
  await swipe();
  expect(saved()).toMatchObject({ phase: 'build', sentenceIndex: 1, filledSlots: 0 });
  expect(saved()?.buildModelUsed).toBeUndefined();
  expect(readLearningActivities(user).filter((event) => event.activityId === 'build-model-0-0')).toHaveLength(1);
});

it('conserva una pista específica al recargar y una corrección real sigue siendo una respuesta ayudada', async () => {
  writeGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'build', filledSlots: 1 });
  await mount();
  const slot = previewUnit.sentence.slots[1];
  const wrong = slot.choices.find((choice) => choice !== slot.en)!;
  await act(async () => button(wrong).props.onClick());
  const feedback = tree.root.findByProps({ className: 'slot-feedback' }).children.join('');
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByProps({ className: 'slot-feedback' }).children.join('')).toBe(feedback);
  expect(saved()?.buildRepair?.failures).toBe(1);
  await act(async () => button(slot.en).props.onClick());
  expect(readLearningActivities(user).filter((event) => event.activityId === 'build-0-1')).toMatchObject([{ correct: false }, { correct: true, helped: true }]);
  expect(readLearningActivities(user).filter((event) => event.activityId.startsWith('build-model'))).toHaveLength(0);
});

it('el gesto prepara una sola pieza por paso, no coloca ni responde y conserva el paso exacto', async () => {
  const unit = { ...preparedFixture, contentVersion: previewUnit.contentVersion };
  writeGameCheckpoint(user, unit.id, unit.contentVersion ?? '1', { ...initialGame, phase: 'build', filledSlots: 1 });
  await mount(unit);
  expect(text(tree.toJSON())).toContain('PREPARA ESTA PIEZA');
  await swipe();
  expect(saved()).toMatchObject({ filledSlots: 1, preparationStep: 1 });
  act(() => tree.unmount()); await mount(unit);
  expect(text(tree.toJSON())).toContain('on my computer');
  await swipe(); await swipe();
  expect(saved()).toMatchObject({ filledSlots: 1, preparationStep: 3 });
  await swipe();
  expect(saved()?.filledSlots).toBe(1);
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('un checkpoint antiguo recupera dos errores del journal sin volver a exigirlos ni escribir intentos', async () => {
  const slot = previewUnit.sentence.slots[0];
  const wrong = slot.choices.find((choice) => choice !== slot.en)!;
  for (let index = 0; index < 2; index++) recordLearningActivity(user, { unitId: previewUnit.id, unitTitle: previewUnit.title, contentVersion: previewUnit.contentVersion ?? '1', activityId: 'build-0-0', skill: 'isolated', phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: wrong, expected: slot.en, correct: false, helped: true });
  const attempts = readLearningActivities(user);
  writeGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'build' });
  await mount();
  expect(text(tree.toJSON())).toContain('Queda como modelo consultado');
  expect(saved()?.buildRepair?.failures).toBe(2);
  expect(readLearningActivities(user)).toEqual(attempts);
});
