import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import raw from '../../content/keys-mission.json';
import { validateUnit, type DialogueTurn } from '../domain/unit';
import { conversationTurns } from '../domain/conversation';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { ConversationPractice } from './ConversationChat';
import { playEnglish, stopSpeech, type PlaybackResult } from '../services/audio';
import { AnswerStudio } from './AnswerStudio';
import { GameCard } from './GameCard';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const unit = validateUnit(structuredClone(raw));
const user = 'chat-repair-isolated';
const key = `memora-v2.chat-checkpoint.${user}.${unit.id}`;
const next = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
async function mount(vertical = false, value = unit) { await act(async () => { tree = create(<ConversationPractice vertical={vertical} unit={value} userId={user} reviewMode={false} onContinue={next} />); }); }
async function type(value: string) { await act(async () => tree.root.findByType('input').props.onChange({ target: { value } })); }
async function submit() { await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} })); }
const attempts = () => readLearningActivities(user).filter((event) => event.activityId.startsWith('turn-'));
beforeEach(() => {
  vi.useFakeTimers(); next.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }), dispatchEvent: vi.fn(), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([false, true])('Nora: error de la captura→corrección junto al campo→modelo=%s→salida sin perder el intento', async (model) => {
  const meal = { ...unit, id: 'isolated-nora', communication: { ...unit.communication!, dialogue: { ...unit.communication!.dialogue!, partner: 'Nora', partnerLanguage: 'es' as const, roleSwap: false, transfer: undefined, turns: [
    { role: 'A', en: 'What are you cooking?', es: '¿Qué estás cocinando?', acceptedAnswers: ['What are you cooking?'] },
    { role: 'B', en: 'I am cooking meat.', es: 'Estoy cocinando carne.', acceptedAnswers: ['I am cooking meat.', "I'm cooking meat."] },
  ] as [DialogueTurn, DialogueTurn] } } };
  await mount(true, meal); await type('j am cooking meet'); await submit();
  expect(tree.root.findByProps({ className: 'chat-context' }).props.open).toBeUndefined();
  expect(text(tree.root.findByProps({ className: 'chat-header' }))).not.toContain('1/1');
  const first = attempts()[0];
  expect(first).toMatchObject({ correct: false, response: 'j am cooking meet' });
  expect(tree.root.findByType(AnswerStudio).findByProps({ className: 'answer-studio-feedback' }).children.join('')).toContain('Revisa');
  expect(text(tree.root.findByProps({ role: 'log' }))).not.toContain('j am cooking meet');
  expect(button('Seguir con el modelo')).toBeDefined();
  const events = readLearningActivities(user);
  act(() => tree.unmount()); await mount(true, meal);
  expect(tree.root.findByType('input').props.value).toBe('j am cooking meet');
  expect(readLearningActivities(user)).toEqual(events);
  if (model) await act(async () => button('Seguir con el modelo').props.onClick());
  else { await type('I am cooking meat'); await act(async () => { vi.advanceTimersByTime(450); }); }
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeTypeOf('function');
  await act(async () => tree.root.findByType(GameCard).props.onAdvance());
  expect(next).toHaveBeenCalledOnce();
  expect(attempts()).toMatchObject(model ? [{ correct: false }] : [{ correct: false }, { correct: true, helped: true, parentAttemptId: first.id }]);
  if (model) expect(readLearningActivities(user).find((event) => event.activityId === 'chat-skip-respond')).toMatchObject({ correct: null, helped: true, parentAttemptId: first.id });
});
it('mientras llega la respuesta tras usar modelo no vuelve a mostrar un campo ni otra tarea', async () => {
  await mount(true); await type('I looking'); await submit();
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }), dispatchEvent: vi.fn(), getSelection: () => null });
  await act(async () => button('Seguir con el modelo').props.onClick());
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(text(tree.root.findByProps({ className: 'chat-reply-pending' }))).toContain('respondiendo');
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeUndefined();
  await act(async () => { vi.advanceTimersByTime(2500); });
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeTypeOf('function');
  expect(attempts()).toHaveLength(1);
  expect(attempts()[0].correct).toBe(false);
});
it('dos errores llevan al modelo, sobreviven a reload legacy y seguir no duplica ni inventa aciertos', async () => {
  await mount();
  await type('I looking'); await submit();
  await type('I looking again');
  const staleSubmit = tree.root.findByType('form').props.onSubmit;
  await act(async () => { for (let index = 0; index < 15; index++) staleSubmit({ preventDefault() {} }); });
  expect(attempts()).toMatchObject([{ correct: false, helped: false }, { correct: false, helped: true }]);
  expect(attempts()[1].parentAttemptId).toBe(attempts()[0].id);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  const saved = JSON.parse(localStorage.getItem(key)!);
  expect(saved.failedAttempts).toBe(2);
  delete saved.failedAttempts; localStorage.setItem(key, JSON.stringify(saved));
  const before = readLearningActivities(user);
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('No necesitas repetirlo más');
  expect(readLearningActivities(user)).toEqual(before);
  const model = button('Ver el modelo y seguir →').props.onClick;
  await act(async () => { model(); model(); });
  expect(readLearningActivities(user).filter((event) => event.activityId === 'chat-skip-respond')).toMatchObject([{ correct: null, helped: true, parentAttemptId: attempts()[1].id }]);
  expect(attempts()).toHaveLength(2);
  const follow = button('Seguir conversando →').props.onClick;
  await act(async () => { follow(); follow(); });
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ round: 1, failedAttempts: 0, helped: false });
  expect(readLearningActivities(user).filter((event) => event.activityId === 'partner-prompt-1')).toHaveLength(1);
  expect(next).not.toHaveBeenCalled();
});

it('pista y envío inmediato conservan ayuda en journal y gramática; abrir el menú solo no la registra', async () => {
  await mount();
  expect(tree.root.findAllByType('summary').map(text).join(' ')).toContain('¿Necesitas ayuda');
  await type(conversationTurns(unit)[0].expected.en);
  const submit = tree.root.findByType('form').props.onSubmit;
  const hint = button('Pista escrita').props.onClick;
  await act(async () => { hint(); submit({ preventDefault() {} }); });
  expect(attempts()).toMatchObject([{ correct: true, helped: true }]);
  expect(attempts()[0]).toMatchObject({ promptLanguage: 'en', responseLanguage: 'en' });
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: true, helped: true }]);
});

it('solicitar un audio bloqueado no dice escuchado ni fabrica una respuesta, y permite seguir escribiendo', async () => {
  await mount();
  await act(async () => tree.root.findByProps({ 'aria-label': 'Escuchar modelo' }).props.onClick());
  const request = readLearningActivities(user).find((event) => event.activityId === 'chat-audio-hint-respond')!;
  expect(request).toMatchObject({ correct: null, helped: true, expected: '' });
  expect(request.response).toContain('solicitado');
  expect(request.response).not.toContain('escuchado');
  expect(attempts()).toHaveLength(0);
  expect(tree.root.findByType('input').props.disabled).toBe(false);
  await type(conversationTurns(unit)[0].expected.en); await submit();
  expect(attempts()).toMatchObject([{ correct: true, helped: true }]);
});
it('el modelo de ayuda informa de preparación/fallo sin bloquear el borrador ni duplicar ayuda', async () => {
  await mount(true);
  await type('I am');
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => tree.root.findByProps({ 'aria-label': 'Escuchar modelo' }).props.onClick());
  const model = () => tree.root.findByProps({ 'aria-label': 'Escuchar modelo' });
  expect(model().props['aria-busy']).toBe(true);
  expect(tree.root.findByType('input').props.disabled).toBe(false);
  expect(tree.root.findByType('input').props.value).toBe('I am');
  expect(readLearningActivities(user).filter((event) => event.activityId === 'chat-audio-hint-respond')).toHaveLength(1);
  expect(attempts()).toHaveLength(0);
  await act(async () => resolve({ status: 'blocked', source: null }));
  expect(model().props['aria-busy']).toBe(false);
  const tools = tree.root.findByProps({ className: 'chat-tools' });
  expect(text(tools)).toContain('Audio no disponible');
  expect(readLearningActivities(user).filter((event) => event.activityId === 'chat-audio-hint-respond')).toHaveLength(1);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'played', source: 'kokoro' });
  await act(async () => model().props.onClick());
  expect(text(tools)).not.toContain('Audio no disponible');
  expect(readLearningActivities(user).filter((event) => event.activityId === 'chat-audio-hint-respond')).toHaveLength(2);
  expect(attempts()).toHaveLength(0);
  await type(conversationTurns(unit)[0].expected.en); await submit();
  expect(attempts()).toMatchObject([{ correct: true, helped: true }]);
});
it('al responder y cambiar de turno se corta la ayuda y se ignora su fallo tardío', async () => {
  await mount();
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => tree.root.findByProps({ 'aria-label': 'Escuchar modelo' }).props.onClick());
  vi.mocked(stopSpeech).mockClear();
  await type(conversationTurns(unit)[0].expected.en); await submit();
  expect(stopSpeech).toHaveBeenCalled();
  act(() => button('Seguir conversando →').props.onClick());
  const before = readLearningActivities(user);
  await act(async () => resolve({ status: 'unavailable', source: null }));
  const model = tree.root.findByProps({ 'aria-label': 'Escuchar modelo' });
  expect(model.props['aria-busy']).toBe(false);
  expect(text(tree.root.findByProps({ className: 'chat-tools' }))).not.toContain('Audio no disponible');
  expect(readLearningActivities(user)).toEqual(before);
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ round: 1, helped: false });
});
it('la respuesta del personaje no corta el modelo con otra voz automática al pasar con ayuda', async () => {
  await mount(true);
  vi.mocked(playEnglish).mockClear();
  await act(async () => button('Ver respuesta y pasar').props.onClick());
  expect(playEnglish).toHaveBeenCalledTimes(1);
  expect(vi.mocked(playEnglish).mock.calls[0][0]).toBe(conversationTurns(unit)[0].expected.en);
  expect(text(tree.toJSON())).toContain('Así se dice:');
  expect(tree.root.findAllByType('button').some((node) => node.props['aria-label']?.startsWith('Escuchar a '))).toBe(true);
  await act(async () => { vi.advanceTimersByTime(3000); });
  expect(playEnglish).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ revealedAnswer: true, awaitingNext: true });
  expect(attempts()).toHaveLength(0);
  const before = readLearningActivities(user);
  const reply = conversationTurns(unit)[0].reply.en;
  const listen = tree.root.findAllByType('button').find((node) => node.props['aria-label']?.endsWith(`: ${reply}`))!;
  await act(async () => listen.props.onClick());
  expect(vi.mocked(playEnglish).mock.calls.at(-1)?.[0]).toBe(reply);
  expect(readLearningActivities(user)).toEqual(before);
});
it('el modelo mostrado permite repetir su audio fallido sin volver a pasar ni alterar el resultado', async () => {
  await mount(true);
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => button('Ver respuesta y pasar').props.onClick());
  const model = () => tree.root.findAllByProps({ className: 'chat-audio-hint' })[0];
  expect(model()).toBeDefined();
  expect(model().props['aria-busy']).toBe(true);
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ awaitingNext: true });
  await act(async () => resolve({ status: 'blocked', source: null }));
  expect(text(model().parent)).toContain('Audio no disponible');
  const before = readLearningActivities(user);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'played', source: 'kokoro' });
  await act(async () => model().props.onClick());
  expect(vi.mocked(playEnglish).mock.calls.at(-1)?.[0]).toBe(conversationTurns(unit)[0].expected.en);
  expect(text(model().parent)).not.toContain('Audio no disponible');
  expect(readLearningActivities(user)).toEqual(before);
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); await mount(true);
  expect(model()).toBeDefined();
  expect(playEnglish).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual(before);
});
it('la práctica oral muestra qué decir y conserva el borrador y la ayuda al volver a escribir', async () => {
  await mount(true); await type('I am');
  const before = readLearningActivities(user);
  act(() => button('Prefiero hablar').props.onClick());
  const expected = conversationTurns(unit)[0].expected;
  const oral = tree.root.findByProps({ className: 'chat-oral' });
  expect(text(oral).replace(/\s/gu, '')).toContain(expected.en.replace(/\s/gu, ''));
  expect(text(oral).replace(/\s/gu, '')).toContain(expected.es.replace(/\s/gu, ''));
  expect(attempts()).toHaveLength(0);
  const legacy = JSON.parse(localStorage.getItem(key)!);
  legacy.helped = false; localStorage.setItem(key, JSON.stringify(legacy));
  act(() => tree.unmount()); await mount(true);
  expect(tree.root.findAllByProps({ className: 'chat-oral' })).toHaveLength(1);
  act(() => button('Prefiero escribir').props.onClick());
  expect(tree.root.findByType('input').props.value).toBe('I am');
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ oral: false, helped: true, input: 'I am' });
  expect(readLearningActivities(user)).toEqual(before);
  await type(expected.en); await submit();
  expect(attempts()).toMatchObject([{ correct: true, helped: true }]);
});
it('la presentación vertical espera el gesto tras cada respuesta, incluso en diálogo de cadencia automática', async () => {
  const automatic = structuredClone(unit);
  delete automatic.communication!.dialogue!.continueMode;
  await mount(true, automatic);
  const swipe = async () => {
    const region = tree.root.findByProps({ role: 'region' });
    const event = { target: { closest: () => null }, currentTarget: { scrollTop: 0, scrollHeight: 600, clientHeight: 600 } };
    await act(async () => {
      region.props.onTouchStart({ ...event, touches: [{ clientY: 400 }] });
      region.props.onTouchMove({ ...event, touches: [{ clientY: 200 }] });
      region.props.onTouchEnd(); vi.advanceTimersByTime(230);
    });
  };
  for (const [index, turn] of conversationTurns(unit).entries()) {
    await swipe();
    expect(attempts()).toHaveLength(index);
    await type(turn.expected.en); await submit();
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(next).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ round: index, awaitingNext: true });
    const before = readLearningActivities(user);
    await swipe();
    expect(attempts()).toHaveLength(index + 1);
    expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual(before.filter((event) => event.source === 'learner'));
  }
  expect(next).toHaveBeenCalledOnce();
});
