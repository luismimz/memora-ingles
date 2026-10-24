import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import raw from '../../content/keys-mission.json';
import { validateUnit } from '../domain/unit';
import { conversationTurns } from '../domain/conversation';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { ConversationPractice } from './ConversationChat';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const unit = validateUnit(structuredClone(raw));
const user = 'chat-repair-isolated';
const key = `memora-v2.chat-checkpoint.${user}.${unit.id}`;
const next = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
async function mount() { await act(async () => { tree = create(<ConversationPractice unit={unit} userId={user} reviewMode={false} onContinue={next} />); }); }
async function type(value: string) { await act(async () => tree.root.findByType('input').props.onChange({ target: { value } })); }
async function submit() { await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} })); }
const attempts = () => readLearningActivities(user).filter((event) => event.activityId.startsWith('turn-'));
beforeEach(() => {
  vi.useFakeTimers(); next.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), dispatchEvent: vi.fn() });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

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
  await act(async () => button('🔊 Escuchar modelo').props.onClick());
  const request = readLearningActivities(user).find((event) => event.activityId === 'chat-audio-hint-respond')!;
  expect(request).toMatchObject({ correct: null, helped: true, expected: '' });
  expect(request.response).toContain('solicitado');
  expect(request.response).not.toContain('escuchado');
  expect(attempts()).toHaveLength(0);
  expect(tree.root.findByType('input').props.disabled).toBe(false);
  await type(conversationTurns(unit)[0].expected.en); await submit();
  expect(attempts()).toMatchObject([{ correct: true, helped: true }]);
});
