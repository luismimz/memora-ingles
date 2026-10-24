import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LanguageGame } from './LanguageGame';
import { previewUnit } from './preview/previewUnit';
import { initialGame } from './domain/game';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { readLearningActivities } from './domain/learningActivity';
import { initializeJournal } from './domain/progressJournal';
import type { AtomicUnit } from './domain/unit';
import { recalledWordIndex } from './domain/activeRecall';
import { readWordMemories } from './domain/memory';

vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('./services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'vertical-isolated';
const next = vi.fn();
const finished = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const unit: AtomicUnit = { ...previewUnit, activeRecall: false, words: previewUnit.words.map((word, index) => ({ ...word, reconstruction: undefined, ...(index === 1 ? { associationMode: 'cognate' as const } : {}) })) };
const checkpoint = () => readGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1');
async function mount(value = unit) {
  await act(async () => { tree = create(<LanguageGame unit={value} userId={user} learningMode="vocabulary" onFinished={finished} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
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
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node) === label)!;
beforeEach(() => {
  vi.useFakeTimers(); next.mockClear(); finished.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {} });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: false }), getSelection: () => null });
  initializeJournal(user);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('el mismo gesto recorre asociaciones y cognado, pero nunca responde una pregunta pendiente', async () => {
  await mount();
  for (let index = 0; index < unit.words.length; index++) {
    expect(checkpoint()).toMatchObject({ phase: 'associate', wordIndex: index });
    expect(tree.root.findAllByProps({ className: 'card-advance' })).toHaveLength(0);
    await swipe();
  }
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallAnswered: false });
  await swipe();
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallIndex: 0, recallAnswered: false });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it('el error permanece al leer y recargar; continuar no borra el fallo ni crea otro intento', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall' });
  await mount();
  const choices = tree.root.findByProps({ className: 'recall-choices' }).findAllByType('button');
  const wrong = choices.find((choice) => text(choice) !== unit.words[recalledWordIndex(unit, 0)].en)!;
  await act(async () => { wrong.props.onClick(); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1); expect(attempts[0].correct).toBe(false);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallOutcome: 'wrong', recallAnswered: true });
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Vuelve a la escena');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: 0 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

it('el resultado legacy sin desenlace muestra el modelo, no reinventa un acierto y espera al alumno', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallAnswered: true, correct: 1 });
  await mount();
  expect(text(tree.toJSON())).toContain('Vuelve a la escena');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, correct: 1 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it('aciertos avanzan una vez, cierre guarda una vez y su gesto enlaza el recorrido sin CTA duplicado', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallIndex: unit.words.length - 1, recallAnswered: true, recallOutcome: 'correct', correct: 2 });
  await mount();
  expect(text(tree.toJSON())).toContain('¡CLAC!');
  await act(async () => { vi.advanceTimersByTime(1100); });
  expect(finished).toHaveBeenCalledOnce(); expect(next).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
  expect(readLearningActivities(user).filter((row) => row.activityId === 'vocabulary-completed')).toHaveLength(1);
  await swipe();
  expect(next).toHaveBeenCalledOnce(); expect(finished).toHaveBeenCalledOnce();
});

it('el gesto de la asociación no salta su reconstrucción y el resultado conserva el mismo avance', async () => {
  const value: AtomicUnit = { ...unit, words: [{ ...unit.words[0], reconstruction: { prompt: 'Reconstruye esta escena', choices: ['La playa', 'El bosque'], answer: 'La playa', cue: 'Imagina la playa' } }, ...unit.words.slice(1)] };
  await mount(value); await swipe();
  expect(text(tree.toJSON())).toContain('Reconstruye esta escena');
  await swipe(); expect(checkpoint()?.wordIndex).toBe(0);
  await act(async () => { button('La playa').props.onClick(); });
  expect(text(tree.toJSON())).toContain('¡Esa es la escena!');
  await swipe(); expect(checkpoint()?.wordIndex).toBe(1);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(1);
});

it('el recuerdo sin ayudas no admite scroll como respuesta y conserva el intento al reanudar su resultado', async () => {
  const value = { ...unit, activeRecall: true };
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall' });
  await mount(value); await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallAnswered: false });
  const answer = value.words[recalledWordIndex(value, 0)].en;
  await act(async () => { tree.root.findByType('input').props.onChange({ target: { value: answer } }); });
  await act(async () => { tree.root.findByType('form').props.onSubmit({ preventDefault: () => {} }); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1); expect(attempts[0]).toMatchObject({ correct: true, helped: false });
  act(() => tree.unmount()); await mount(value);
  expect(text(tree.toJSON())).toContain('¡Te has acordado sin pistas!');
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, correct: 1 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

const sceneButtons = () => tree.root.findAllByType('button').filter((node) => node.props['data-drop-choice']);

it('tanda nueva enseña primero y conecta inglés con dos escenas conocidas sin responder al desplazar', async () => {
  await mount();
  expect(checkpoint()?.recognitionStyle).toBe('scene-delivery-v1');
  for (const _word of unit.words) await swipe();
  expect(text(tree.toJSON())).toContain('¿A qué escena va?');
  const targets = sceneButtons();
  expect(targets).toHaveLength(2);
  expect(targets.map((node) => node.props['data-drop-choice'])).toContain(unit.words[0].en);
  for (const node of targets) {
    const word = unit.words.find((item) => item.en === node.props['data-drop-choice'])!;
    expect(text(node)).toContain(word.es);
  }
  await swipe();
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallIndex: 0, recallAnswered: false });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it.each([true, false])('entrega nueva acierto=%s espera, reanuda elección y registra exactamente un reconocimiento ayudado', async (correct) => {
  await mount();
  for (const _word of unit.words) await swipe();
  const before = sceneButtons().map((node) => node.props['data-drop-choice']);
  const choice = sceneButtons().find((node) => (node.props['data-drop-choice'] === unit.words[0].en) === correct)!;
  const response = choice.props['data-drop-choice'];
  await act(async () => { choice.props.onClick(); choice.props.onClick(); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({ activityId: `word-scene-v1:${unit.words[0].en}`, prompt: unit.words[0].en, response: unit.words.find((word) => word.en === response)!.es, expected: unit.words[0].es, correct, helped: true, modality: 'choice' });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallAnswered: true, recallChoice: response });
  act(() => tree.unmount()); await mount();
  expect(sceneButtons().map((node) => node.props['data-drop-choice'])).toEqual(before);
  expect(sceneButtons().find((node) => node.props['aria-pressed'])?.props['data-drop-choice']).toBe(response);
  expect(sceneButtons().every((node) => node.props.disabled)).toBe(true);
  expect(text(tree.toJSON())).toContain(correct ? 'La palabra ha llegado a su escena.' : 'Mira la conexión:');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: Number(correct) });
  expect(checkpoint()?.recallChoice).toBeUndefined();
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

it('la tanda anterior conserva sus opciones escritas aunque estuviese todavía en la enseñanza', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, wordIndex: unit.words.length - 1 });
  await mount(); await swipe();
  expect(checkpoint()?.recognitionStyle).toBeUndefined();
  expect(tree.root.findAllByProps({ className: 'recall-choices' })).toHaveLength(1);
  expect(sceneButtons()).toHaveLength(0);
});

it('sin dos significados distintos no inventa una escena ni un distractor externo', async () => {
  const single: AtomicUnit = { ...unit, words: [unit.words[0]] };
  await mount(single); await swipe();
  expect(sceneButtons()).toHaveLength(0);
  expect(tree.root.findByProps({ className: 'recall-choices' }).findAllByType('button')).toHaveLength(1);
});

it('consultar la conexión antes de responder no inventa fallo, acierto ni memoria y se reanuda sin duplicarse', async () => {
  await mount();
  for (const _word of unit.words) await swipe();
  const before = readWordMemories(user);
  const model = button('No me sale: ver la conexión');
  await act(async () => { model.props.onClick(); model.props.onClick(); });
  const records = readLearningActivities(user);
  expect(records.filter((row) => row.source === 'learner')).toHaveLength(0);
  expect(records.filter((row) => row.activityId === `word-scene-model-v1:${unit.words[0].en}`)).toHaveLength(1);
  expect(records.find((row) => row.activityId.startsWith('word-scene-model-v1:'))).toMatchObject({ source: 'authored', correct: null, helped: true, expected: '' });
  expect(readWordMemories(user)).toEqual(before);
  expect(checkpoint()).toMatchObject({ recallAnswered: true, recallOutcome: 'modeled', correct: 0 });
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('No hace falta adivinar');
  expect(sceneButtons().every((node) => node.props.disabled)).toBe(true);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: 0 });
  expect(readLearningActivities(user)).toEqual(records);
  expect(readWordMemories(user)).toEqual(before);
});
