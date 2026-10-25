import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { contextualProcessFixture as unit } from '../test/contextualProcessFixture';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { JourneyTrickExperience } from './JourneyTrickExperience';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { ConversationPractice } from './ConversationPractice';
import { GrammarOrder } from './GrammarOrder';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readSentenceMemories, readWordMemories, recordWordRecall } from '../domain/memory';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { playEnglish, playSpanish } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const user = 'episode-isolated';
const stop = trickStop(unit, grammarTricks(unit)[0]);
const finished = vi.fn(); const next = vi.fn();
let tree: ReactTestRenderer;
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
const checkpoint = () => readTrickCheckpoint(user, stop.id, unit.contentVersion ?? '1');
const learner = () => readLearningActivities(user).filter((event) => event.source === 'learner');
async function mount(value = unit, sceneBoxes?: Map<string, { left: number; top: number; right: number; bottom: number }>) {
  await act(async () => { tree = create(<JourneyTrickExperience unit={value} stop={stop} userId={user} inspection={false} onFinished={finished} onNext={next} onExit={() => {}} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} />, { createNodeMock: (node) => {
    if (!sceneBoxes) return null;
    if (node.props.className === 'grammar-situation') return { getBoundingClientRect: () => ({ left: 100, top: 100 }) };
    const choice = node.props['data-drop-choice'];
    if (choice) { if (!sceneBoxes.has(choice)) { const left = 100 + sceneBoxes.size * 200; sceneBoxes.set(choice, { left, top: 300, right: left + 150, bottom: 450 }); } return { getBoundingClientRect: () => sceneBoxes.get(choice) }; }
    return null;
  } }); });
}
async function advance() {
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
async function reachBuild(value = unit) {
  await mount(value);
  for (let step = 0; step < 3; step++) {
    expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    await advance();
  }
  expect(learner()).toHaveLength(0);
  await act(async () => button(`Estoy ${value.grammar[0].spanish} ahora.`).props.onClick());
  await advance();
  expect(tree.root.findAllByType(value.grammarContinuation ? SentenceBuilderCard : GrammarOrder)).toHaveLength(1);
}
beforeEach(() => {
  vi.useFakeTimers(); finished.mockClear(); next.mockClear(); vi.mocked(playEnglish).mockClear(); vi.mocked(playSpanish).mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
  recordWordRecall(user, unit.words[0], 'hesitant', new Date(), 'recognition', undefined, true);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('entregar una ficha a escena registra el primer error, reanuda y corrige sin borrar ayuda ni duplicar intento', async () => {
  const boxes = new Map<string, { left: number; top: number; right: number; bottom: number }>();
  await mount(previewUnit, boxes);
  for (let index = 0; index < 3; index++) await advance();
  expect(text(tree.root.findByType('h2'))).toBe('Entrega el mensaje');
  const token = () => tree.root.findByProps({ 'aria-label': 'Mensaje inglés: I am playing' });
  const order = () => tree.root.findAllByType('button').filter((node) => node.props['data-drop-choice']).map((node) => node.props['data-drop-choice']);
  const firstOrder = order();
  const event = (x: number, y: number) => ({ pointerId: 1, button: 0, isPrimary: true, clientX: x, clientY: y, preventDefault() {}, stopPropagation() {}, currentTarget: { setPointerCapture() {} } });
  const wrong = boxes.get('Todavía no estoy jugando.')!;
  await act(async () => { token().props.onPointerDown(event(150, 150)); token().props.onPointerMove(event(wrong.left + 20, wrong.top + 20)); });
  expect(learner()).toHaveLength(0);
  await act(async () => token().props.onPointerUp(event(wrong.left + 20, wrong.top + 20)));
  const first = learner()[0]; expect(first).toMatchObject({ activityId: 'meaning-now-v1', correct: false, helped: true, prompt: 'Recibes «I am playing». ¿Qué te cuenta esa persona?' });
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')).toMatchObject({ feedback: 'help', checkId: 'meaning-now-v1' });
  act(() => tree.unmount()); await mount(previewUnit, boxes);
  expect(order()).toEqual(firstOrder); expect(learner()).toHaveLength(1);
  const right = boxes.get('Estoy jugando ahora.')!;
  const release = event(right.left + 20, right.top + 20);
  await act(async () => { token().props.onPointerDown(event(150, 150)); token().props.onPointerMove(release); token().props.onPointerUp(release); token().props.onPointerUp(release); });
  expect(learner()).toMatchObject([{ id: first.id, correct: false }, { correct: true, helped: true, parentAttemptId: first.id }]);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  await advance(); expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(1);
  expect(finished).not.toHaveBeenCalled();
});

it('enseñar → comprender → montar → conversar se recorre completo sin montaje/escritura duplicados', async () => {
  await reachBuild();
  expect(finished).not.toHaveBeenCalled();
  expect(checkpoint()).toMatchObject({ episodeId: 'ing', continuation: { phase: 'build', filledSlots: 0 } });
  await advance(); expect(checkpoint()?.continuation?.filledSlots).toBe(0);
  await act(async () => button('I').props.onClick());
  const first = learner(); const started = checkpoint()?.episodeStartedAt;
  act(() => tree.unmount()); await mount();
  expect(checkpoint()).toMatchObject({ episodeStartedAt: started, continuation: { phase: 'build', filledSlots: 1 } });
  expect(learner()).toEqual(first);
  await act(async () => button('am').props.onClick());
  await act(async () => button('playing.').props.onClick());
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toHaveLength(0);
  expect(finished).not.toHaveBeenCalled();
  await advance();
  expect(tree.root.findAllByType(ConversationPractice)).toHaveLength(1);
  expect(text(tree.toJSON()).replace(/\s+/gu, ' ')).toContain('¿Qué estás haciendo ahora?');
  expect(text(tree.toJSON())).not.toContain('What are you doing?');
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => message.includes('What are you'))).toBe(false);
  expect(vi.mocked(playSpanish).mock.calls.some(([message]) => message.includes('¿Qué estás haciendo'))).toBe(true);
  expect(tree.root.findAllByType('input')).toHaveLength(1);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: "I'm playing" } }));
  const beforeScroll = learner();
  await advance();
  expect(learner()).toEqual(beforeScroll);
  expect(finished).not.toHaveBeenCalled();
  expect(tree.root.findByType('input').props.value).toBe("I'm playing");
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType('input').props.value).toBe("I'm playing");
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(text(tree.toJSON())).toContain('Te guardo el siguiente turno');
  const finishControls = tree.root.findAllByType('button').filter((node) => node.props['aria-label'] === 'Terminar la conversación');
  expect(finishControls).toHaveLength(1);
  expect(finishControls[0].parent!.props.className).toBe('card-vertical-next');
  expect(text(tree.toJSON())).toContain('Mensaje recibido. Puedes seguir cuando quieras.');
  await advance();
  expect(finished).toHaveBeenCalledOnce();
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ skill: 'present-continuous:play', correct: true, helped: false }]);
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toHaveLength(1);
  expect(learner().some((event) => event.activityId === 'order-message-v1' || event.activityId === 'use')).toBe(false);
  expect(learner().filter((event) => event.phase === 'completion')).toMatchObject([{ correct: null }]);
  expect(checkpoint()).toBeNull();
});

it('el modelo del constructor conserva dos errores/reload y nunca coloca dos veces ni cuenta acierto', async () => {
  await reachBuild();
  const wrong = button('playing.').props.onClick;
  await act(async () => { for (let index = 0; index < 15; index++) wrong(); });
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  const before = learner();
  act(() => tree.unmount()); await mount();
  expect(learner()).toEqual(before);
  const model = button('Colocar con ayuda').props.onClick;
  await act(async () => { model(); model(); });
  await act(async () => model());
  expect(checkpoint()?.continuation).toMatchObject({ filledSlots: 1, failures: 0, modelUsed: true });
  expect(readLearningActivities(user).filter((event) => event.activityId.startsWith('trick-build-model:'))).toMatchObject([{ source: 'authored', correct: null, helped: true }]);
  expect(learner().filter((event) => event.phase === 'construction' && event.correct === true)).toHaveLength(0);
  expect(finished).not.toHaveBeenCalled();
});

it('un coach antiguo conserva su escritura identificada sin trasladarla ni completarla como episodio nuevo', async () => {
  writeTrickCheckpoint(user, stop.id, unit.contentVersion ?? '1', { stage: 3, checkIndex: 2, checkId: 'use', input: 'I playing', feedback: 'help', helped: true });
  await mount();
  expect(tree.root.findByType('input').props.value).toBe('I playing');
  expect(tree.root.findAllByType(SentenceBuilderCard)).toHaveLength(0);
  expect(checkpoint()?.episodeId).toBeUndefined();
  expect(learner()).toHaveLength(0);
});

it('retirar revisión del episodio conserva el checkpoint pero no evalúa contexto bloqueado', async () => {
  await reachBuild();
  const before = checkpoint(); const activities = learner();
  act(() => tree.unmount());
  await mount({ ...unit, grammarContinuation: { ...unit.grammarContinuation!, status: 'needs_review' } });
  expect(text(tree.toJSON())).toContain('Esta escena necesita preparación');
  const body = tree.root.findByProps({ className: 'game-card-body' });
  expect(body.children).toHaveLength(1);
  expect((body.children[0] as any).props.className).toBe('preparation-content');
  expect(tree.root.findByProps({ className: 'preparation-actions' }).findAllByType('button')).toHaveLength(1);
  expect(tree.root.findAllByType(SentenceBuilderCard)).toHaveLength(0);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(checkpoint()).toEqual(before);
  expect(learner()).toEqual(activities);
});
it('PLAY publicado enlaza un episodio corto sin habilitar COMPUTER/DESK u otra construcción de la fuente', async () => {
  await reachBuild(previewUnit);
  const current = readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1');
  expect(current).toMatchObject({ episodeId: 'ing:short-playing-v1', continuation: { phase: 'build', filledSlots: 0 } });
  await act(async () => button('I').props.onClick());
  const partial = readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1');
  expect(partial?.continuation?.order).toHaveLength(1);
  expect(learner().filter((event) => event.phase === 'construction')).toHaveLength(0);
  act(() => tree.unmount()); await mount(previewUnit);
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual(partial?.continuation?.order);
  for (const piece of ['AM', 'PLAYING']) await act(async () => button(piece).props.onClick());
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: true, helped: true }]);
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('✓ MENSAJE ARMADO');
  const beforeReload = learner();
  act(() => tree.unmount()); await mount(previewUnit);
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('✓ MENSAJE ARMADO');
  expect(learner()).toEqual(beforeReload);
  await advance();
  expect(tree.root.findByType(ConversationPractice).props.checkpointScope).toBe('trick:ing:short-playing-v1');
  expect(tree.root.findByType(ConversationPractice).props.unit.id).toBe(previewUnit.id);
  expect(text(tree.toJSON()).replace(/\s+/gu, ' ')).toContain('¿Qué estás haciendo ahora?');
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => /what|computer|desk|will/iu.test(message))).toBe(false);
  expect(finished).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am playing' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(learner().filter((event) => event.activityId === 'turn-respond')).toMatchObject([{ correct: true, helped: false, prompt: '¿Qué estás haciendo ahora?' }]);
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toHaveLength(1);
  expect(readWordMemories(user).map((memory) => memory.key)).toEqual(['play']);
  expect(readSentenceMemories(user).every((memory) => memory.sentenceEn === 'I am playing.')).toBe(true);
  await advance();
  expect(finished).toHaveBeenCalledOnce();
});

it('dos errores del puzle completo ofrecen modelo neutral, reanudan y conservan ayuda en el chat', async () => {
  await reachBuild(previewUnit);
  const puzzle = () => tree.root.findByType(GrammarOrder);
  await act(async () => puzzle().props.onAnswer('I playing am'));
  await act(async () => puzzle().props.onAnswer('playing am I'));
  expect(learner().filter((event) => event.phase === 'construction')).toMatchObject([{ correct: false }, { correct: false }]);
  act(() => tree.unmount()); await mount(previewUnit);
  const model = button('Colocar con ayuda').props.onClick;
  await act(async () => { model(); model(); });
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')?.continuation).toMatchObject({ filledSlots: 3, modelUsed: true });
  expect(readLearningActivities(user).filter((event) => event.activityId.startsWith('trick-build-model:'))).toMatchObject([{ correct: null, source: 'authored' }]);
  await advance();
  act(() => tree.unmount()); await mount(previewUnit);
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am playing' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(learner().filter((event) => event.activityId === 'turn-respond')).toMatchObject([{ correct: true, helped: true }]);
  expect(readGrammarAttempts(user).filter((attempt) => attempt.kind === 'write')).toMatchObject([{ correct: true, helped: true }]);
});

it('consultar audio antes de montar conserva ayuda aunque se coloquen fichas inmediatamente', async () => {
  await reachBuild(previewUnit);
  const listen = button('Escuchar modelo').props.onClick;
  const order = tree.root.findByType(GrammarOrder);
  const pieces = order.props.pieces;
  const selection = ['I', 'AM', 'PLAYING'].map((word) => pieces.findIndex((piece: { text: string }) => piece.text === word));
  await act(async () => { listen(); order.props.onChange(selection); order.props.onAnswer('I AM PLAYING'); });
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')?.continuation).toMatchObject({ filledSlots: 3, modelUsed: true });
  expect(readLearningActivities(user).find((event) => event.activityId.startsWith('trick-build-audio:'))).toMatchObject({ correct: null, source: 'authored', helped: true });
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('MENSAJE CON MODELO');
  await advance();
  expect(tree.root.findByType(ConversationPractice).props.initialHelped).toBe(true);
});

it.each([
  ['brush', 'BRUSHING', 'I am brushing', 'Espero fuera del baño'],
  ['cook', 'COOKING', 'I am cooking', 'preparo los platos'],
])('la acción preparada %s cambia la intención y respuesta del personaje sin exigir vocabulario de la misión larga', async (base, action, response, consequence) => {
  const source = reviewUnits.find((item) => item.grammar.some((form) => form.englishBase === base) && !item.grammar[0].lesson && item.words.some((word) => word.en.toLowerCase() === base))!;
  expect(source).toBeDefined();
  const word = source.words.find((item) => item.en.toLowerCase() === base)!;
  recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  await reachBuild(source);
  for (const piece of ['I', 'AM', action]) await act(async () => button(piece).props.onClick());
  await advance();
  const dialogue = tree.root.findByType(ConversationPractice).props.unit.communication.dialogue;
  expect(dialogue.partnerLanguage).toBe('es');
  expect(dialogue.context).not.toContain('organiza la partida');
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: response } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(text(tree.toJSON())).toContain(consequence);
  expect(vi.mocked(playEnglish).mock.calls.some(([message]) => /outside|table|kitchen|there|teeth|dinner/iu.test(message))).toBe(false);
  expect(learner().filter((event) => event.modality === 'writing' && event.correct !== null)).toMatchObject([{ expected: `${response}.`, helped: false }]);
  expect(readWordMemories(user).map((memory) => memory.key).sort()).toEqual([base, 'play'].sort());
});
