import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ActiveRecallCard, SceneReconstruction } from './ActiveRecallCard';
import { previewUnit } from '../preview/previewUnit';
import { initializeJournal } from '../domain/progressJournal';
import { readLearningActivities } from '../domain/learningActivity';
import { playEnglish, type PlaybackResult } from '../services/audio';
import { wordRecallHint } from '../domain/activeRecall';
import { readWordMemories, recordWordRecall } from '../domain/memory';
import type { AtomicWord } from '../domain/unit';
import { SceneVisual } from './SceneVisual';
import { GameCard } from './GameCard';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'help-isolated';
const word = previewUnit.words[0];
const finish = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node) === label)!;
async function mount() {
  await act(async () => { tree = create(<ActiveRecallCard unit={previewUnit} word={word} choices={previewUnit.words} position={0} userId={user} inspection={false} onFinish={finish} vertical />); });
}
async function submit(response: string) {
  await act(async () => { tree.root.findByType('input').props.onChange({ target: { value: response } }); });
  await act(async () => { tree.root.findByType('form').props.onSubmit({ preventDefault: () => {} }); });
}
beforeEach(() => {
  finish.mockClear(); vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'blocked', source: null });
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key), key: (index: number) => [...data.keys()][index] ?? null, get length() { return data.size; } });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }) });
  initializeJournal(user);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('el menú empieza cerrado y no revela el modelo ni cambia la independencia sin pedir ayuda', async () => {
  await mount();
  expect(tree.root.findByType('summary').children).toEqual(['¿Necesitas ayuda?']);
  const help = tree.root.findByType('details');
  expect(help.props.open).toBeUndefined(); expect(help.props.onToggle).toBeUndefined();
  expect(readLearningActivities(user)).toHaveLength(0);
  await submit(word.en);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: false }]);
});

it('historia y opciones son ayudas reales: se conservan al reanudar sin duplicar intentos', async () => {
  await mount();
  await act(async () => { button('Recordar la historia').props.onClick(); button('Prefiero elegir').props.onClick(); });
  act(() => tree.unmount()); await mount();
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(readLearningActivities(user).filter((row) => row.source === 'authored')).toHaveLength(2);
  await act(async () => { button(word.en).props.onClick(); });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: true }]);
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Conexión recuperada');
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(1);
});

it('la pista recupera la escena solo después de pedir ayuda y la conserva al volver, sin regalar un acierto', async () => {
  await mount();
  expect(tree.root.findAllByType(SceneVisual)).toHaveLength(0);
  await act(async () => { button('Recordar la historia').props.onClick(); });
  expect(tree.root.findByType(SceneVisual).props).toMatchObject({ word, compact: true, hideAnswer: true });
  expect(text(tree.toJSON())).toContain('Recupera la palabra con esta pista.');
  expect(text(tree.toJSON())).not.toContain('Ahora sin la imagen');
  expect(tree.root.findAllByProps({ className: 'scene-memory-link' })).toHaveLength(0);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(SceneVisual).props.hideAnswer).toBe(true);
  expect(readLearningActivities(user)).toHaveLength(1);
  await submit(word.en);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: true }]);
});

it('un audio bloqueado no afirma escucha ni bloquea la práctica, y queda registrado como solicitud de ayuda', async () => {
  await mount();
  await act(async () => { button('🔊 Escuchar la palabra').props.onClick(); });
  expect(text(tree.toJSON())).toContain('No se ha podido reproducir');
  expect(tree.root.findAllByType(SceneVisual)).toHaveLength(0);
  const help = readLearningActivities(user)[0];
  expect(help).toMatchObject({ correct: null, helped: true });
  expect(help.response).toContain('Has pedido'); expect(help.response).not.toContain('Has escuchado');
  await submit(word.en);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: true }]);
});

it('la respuesta tardía del audio no pisa un resultado ni crea evidencia al salir', async () => {
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await mount();
  await act(async () => { button('🔊 Escuchar la palabra').props.onClick(); });
  await submit(word.en);
  await act(async () => { resolve({ status: 'played', source: 'browser' }); });
  expect(text(tree.toJSON())).not.toContain('Modelo reproducido');
  expect(text(tree.toJSON())).toContain('Conexión recuperada');
  expect(readLearningActivities(user)).toHaveLength(2);
});

it('una segunda pista para cognado sin puente no inventa una asociación ni pronunciación española', () => {
  const hint = wordRecallHint({ ...word, bridge: '' }, 2);
  expect(hint).not.toContain('El puente'); expect(hint).not.toContain('undefined'); expect(hint).toContain('imagen y su significado');
});
it('las pistas de escena tienen dos pasos reales y no repiten la misma consulta al insistir o reanudar', async () => {
  await mount();
  const ask = button('Recordar la historia').props.onClick;
  await act(async () => ask());
  expect(button('Ver la inicial')).toBeTruthy();
  await act(async () => { for (let index = 0; index < 10; index++) ask(); });
  expect(button('Pista completa').props.disabled).toBe(true);
  expect(text(tree.toJSON())).toContain(`Empieza por ${word.en[0]}`);
  const hints = readLearningActivities(user);
  expect(hints).toHaveLength(2);
  expect(hints.every((row) => row.source === 'authored' && row.correct === null)).toBe(true);
  act(() => tree.unmount()); await mount();
  expect(button('Pista completa').props.disabled).toBe(true);
  await act(async () => button('Pista completa').props.onClick());
  expect(readLearningActivities(user)).toEqual(hints);
  expect(button('Ver palabra y pasar')).toBeTruthy();
  expect(button('🔊 Escuchar la palabra').props.disabled).toBeUndefined();
  expect(finish).not.toHaveBeenCalled();
});
it('la pista de una expresión no cuenta espacios ni apóstrofos como letras', () => {
  expect(wordRecallHint({ ...word, en: 'GO OUT' }, 2)).toContain('2 palabras y 5 letras');
  expect(wordRecallHint({ ...word, en: "DON\'T" }, 2)).toContain('4 letras');
});

it('primer error y reparación llevan al modelo: ráfagas/reload/continuación no inventan acierto', async () => {
  await mount();
  await submit('not-the-word');
  expect(tree.root.findByType(SceneVisual).props.hideAnswer).toBe(true);
  const first = readLearningActivities(user).filter((row) => row.source === 'learner')[0];
  expect(first).toMatchObject({ correct: false, helped: false });
  const key = `memora-v2.recall.${user}.${previewUnit.id}.${previewUnit.contentVersion}.${word.id}`;
  const saved = JSON.parse(localStorage.getItem(key)!);
  delete saved.failures; // A genuine legacy checkpoint retains the draft and parent chain.
  localStorage.setItem(key, JSON.stringify(saved));
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType('input').props.value).toBe('not-the-word');
  expect(JSON.parse(localStorage.getItem(key)!).failures).toBe(1);
  await act(async () => { tree.root.findByType('input').props.onChange({ target: { value: 'still-not-the-word' } }); });
  const send = tree.root.findByType('form').props.onSubmit;
  await act(async () => { for (let index = 0; index < 15; index++) send({ preventDefault: () => {} }); });
  const errors = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(errors).toHaveLength(2); expect(errors[1]).toMatchObject({ correct: false, helped: true, parentAttemptId: first.id });
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('Vamos con el modelo');
  expect(readLearningActivities(user).filter((row) => row.activityId === `recall-model:${word.en}`)).toMatchObject([{ correct: null, helped: true, parentAttemptId: errors[1].id }]);
  const memories = readWordMemories(user);
  const legacyModel = JSON.parse(localStorage.getItem(key)!);
  delete legacyModel.failures; legacyModel.done = false; legacyModel.feedback = 'Aún no.';
  localStorage.setItem(key, JSON.stringify(legacyModel));
  act(() => tree.unmount()); await mount();
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('Vamos con el modelo');
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(errors);
  await act(async () => { tree.root.findByProps({ 'aria-label': 'Continuar con otra palabra' }).props.onClick(); await new Promise((done) => setTimeout(done, 1)); });
  expect(finish).toHaveBeenCalledExactlyOnceWith(false);
  expect(readWordMemories(user)).toEqual(memories);
});

it('consultar el modelo voluntariamente es neutral para la memoria previa, no otro fallo', async () => {
  recordWordRecall(user, word, 'quick', new Date(), 'recall', undefined, false);
  const before = readWordMemories(user);
  await mount();
  expect(tree.root.findByType('details').findAllByType('button').map(text)).not.toContain('Ver palabra y pasar');
  expect(tree.root.findAllByType('button').filter((node) => text(node) === 'Ver palabra y pasar')).toHaveLength(1);
  await act(async () => { button('Ver palabra y pasar').props.onClick(); });
  expect(readWordMemories(user)).toEqual(before);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: null, helped: true }]);
  act(() => tree.unmount()); await mount();
  expect(readWordMemories(user)).toEqual(before);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(1);
});

it('conserva la demora observada al reanudar y mide el reintento desde el error, no desde la primera pregunta', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
  try {
    await mount();
    now.mockReturnValue(1_120_000); act(() => tree.unmount()); await mount();
    now.mockReturnValue(1_125_000); await submit('not-the-word');
    now.mockReturnValue(1_127_500); await submit(word.en);
    const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
    expect(attempts).toMatchObject([{ correct: false, helped: false, responseDelayMs: 125_000 }, { correct: true, helped: true, responseDelayMs: 2500, parentAttemptId: attempts[0].id }]);
    expect(attempts).toHaveLength(2);
    const count = readLearningActivities(user).length;
    act(() => tree.unmount()); await mount();
    expect(readLearningActivities(user)).toHaveLength(count);
  } finally { now.mockRestore(); }
});

it('un checkpoint antiguo conserva borrador y ayuda sin inventar una demora que no observó', async () => {
  await mount(); await act(async () => { button('Recordar la historia').props.onClick(); });
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: word.en } }));
  const key = `memora-v2.recall.${user}.${previewUnit.id}.${previewUnit.contentVersion}.${word.id}`;
  const saved = JSON.parse(localStorage.getItem(key)!); delete saved.attemptStartedAt;
  localStorage.setItem(key, JSON.stringify(saved));
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType('input').props.value).toBe(word.en);
  await submit(word.en);
  const attempt = readLearningActivities(user).find((row) => row.source === 'learner')!;
  expect(attempt).toMatchObject({ correct: true, helped: true });
  expect(attempt.responseDelayMs).toBeUndefined();
});

it('pedir ayuda y enviar rápidamente nunca se etiqueta como recuerdo independiente', async () => {
  await mount();
  await act(async () => { tree.root.findByType('input').props.onChange({ target: { value: word.en } }); });
  const send = tree.root.findByType('form').props.onSubmit;
  await act(async () => { button('Recordar la historia').props.onClick(); send({ preventDefault: () => {} }); });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: true }]);
});

it('la reconstrucción de escena también termina tras una reparación y no la convierte en acierto', async () => {
  const puzzleWord: AtomicWord = { ...word, reconstruction: { prompt: 'Reconstruye la escena', choices: ['Playa', 'Bosque'], answer: 'Playa', cue: 'La playa entra en el salón.' } };
  await act(async () => { tree = create(<SceneReconstruction unit={previewUnit} word={puzzleWord} userId={user} inspection={false} onContinue={finish} vertical />); });
  await act(async () => { button('Bosque').props.onClick(); });
  const wrong = button('Bosque').props.onClick;
  await act(async () => { for (let index = 0; index < 15; index++) wrong(); });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toMatchObject([{ correct: false }, { correct: false }]);
  expect(tree.root.findAllByProps({ className: 'memory-options' })).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('La playa entra en el salón.');
  expect(text(tree.toJSON())).not.toContain('Reconstruye la escena');
  expect(tree.root.findAllByProps({ className: 'memory-mystery' })).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('Esta es la escena');
});
it('confirmar una escena elimina la pregunta y el interrogante incluso al reabrir un resultado antiguo', async () => {
  const puzzleWord: AtomicWord = { ...word, reconstruction: { prompt: '¿Qué desaparece en el fondo?', choices: ['El móvil', 'El reloj'], answer: 'El móvil', cue: 'El móvil se pierde en el bolsillo.' } };
  const mountScene = async () => { await act(async () => { tree = create(<SceneReconstruction unit={previewUnit} word={puzzleWord} userId={user} inspection={false} onContinue={finish} vertical />); }); };
  await mountScene();
  expect(text(tree.toJSON())).toContain('¿Qué desaparece en el fondo?');
  await act(async () => button('El móvil').props.onClick());
  const before = readLearningActivities(user);
  expect(before.filter((row) => row.source === 'learner')).toMatchObject([{ correct: true, helped: true }]);
  const key = `memora-v2.scene.${user}.${previewUnit.id}.${previewUnit.contentVersion}.${word.id}`;
  const saved = JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key, JSON.stringify({ ...saved, result: '¡Esa es la escena! Ahora imagínala en movimiento.' }));
  act(() => tree.unmount()); await mountScene();
  expect(text(tree.toJSON())).toContain('✓ Esa es la escena');
  expect(text(tree.toJSON())).not.toContain('¿Qué desaparece');
  expect(text(tree.toJSON())).not.toContain('Ahora imagínala');
  expect(tree.root.findAllByProps({ className: 'memory-mystery' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ className: 'memory-options' })).toHaveLength(0);
  expect(readLearningActivities(user)).toEqual(before);
  const advance = tree.root.findByType(GameCard).props.onAdvance;
  await act(async () => { advance(); advance(); });
  expect(finish).toHaveBeenCalledOnce();
  expect(readLearningActivities(user)).toEqual(before);
});
