import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import raw from '../../content/keys-mission.json';
import { validateUnit } from '../domain/unit';
import { readLearningActivities } from '../domain/learningActivity';
import { AnswerStudio } from './AnswerStudio';
import { TypedChatMessage } from './TypedChatMessage';
const hooks = vi.hoisted(() => ({ effects: [] as (() => unknown)[] }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (value: unknown) => [typeof value === 'function' ? value() : value, vi.fn()],
  useRef: (current: unknown) => ({ current }), useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => unknown) => { hooks.effects.push(fn); },
}));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
import { ConversationPractice } from './ConversationChat';

const unit = validateUnit(structuredClone(raw));
unit.communication!.dialogue!.roleSwap = true;
unit.communication!.dialogue!.questionSkillId = 'question:look-for';
const user = 'isolated-resume-test';
const key = `memora-v2.chat-checkpoint.${user}.${unit.id}`;
let storage: Map<string, string>;
const saved = {
  version: unit.contentVersion ?? '1', round: 1, turnId: 'transfer',
  messages: [{ id: 'prompt-1', who: 'partner', text: unit.communication!.dialogue!.turns[0].en }],
  activeMessage: 'prompt-1', busy: false, input: 'I looking for my phone', helped: true,
  hintLevel: 1, awaitingNext: false, oral: false, revealedAnswer: false,
  savedMessages: ['prompt-1'], previousAttempt: 'prior-wrong', replyTo: 'prior-wrong', serial: 3,
};
function render(inspection = false) {
  hooks.effects = [];
  const tree = ConversationPractice({ unit, userId: user, reviewMode: inspection, onContinue: vi.fn() });
  const nodes: ReactElement<any>[] = [];
  const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { nodes.push(node); if (node.type === AnswerStudio) visit(AnswerStudio(node.props)); else visit(node.props.children); } };
  visit(tree); return nodes;
}
beforeEach(() => {
  storage = new Map([[key, JSON.stringify(saved)]]);
  vi.stubGlobal('localStorage', { getItem: (name: string) => storage.get(name) ?? null, setItem: (name: string, value: string) => storage.set(name, value), removeItem: (name: string) => storage.delete(name) });
});
it('mantiene borrador y ayuda de transferencia y guarda su identidad en la nueva posición', () => {
  storage.set(`memora-v2.grammar.${user}`, JSON.stringify([{ skill: 'question:look-for', kind: 'write', correct: true, helped: false }]));
  const nodes = render();
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe(saved.input);
  expect(nodes.some((node) => node.type === 'small' && node.props.children === 'Otra situación')).toBe(true);
  hooks.effects[0]();
  expect(JSON.parse(storage.get(key)!)).toMatchObject({ round: 2, turnId: 'transfer', helped: true, previousAttempt: 'prior-wrong', input: saved.input });
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('la inspección no restaura ni sobrescribe un borrador del alumno', () => {
  const before = storage.get(key);
  const nodes = render(true);
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('');
  hooks.effects[0]();
  expect(storage.get(key)).toBe(before);
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('separa historial del turno sin reproducir audio ni registrar mensajes anteriores', () => {
  storage.set(key, JSON.stringify({ ...saved, messages: [
    { id: 'prompt-0', who: 'partner', text: 'Old prompt' },
    { id: 'chat-0', who: 'learner', text: 'Old answer', instant: true },
    { id: 'reply-0', who: 'partner', text: 'Old reply' },
    ...saved.messages,
    { id: 'chat-2', who: 'coach', text: 'Current help', instant: true },
  ] }));
  const nodes = render();
  const history = nodes.find((node) => node.props.className === 'chat-history')!;
  const log = nodes.find((node) => node.props.role === 'log')!;
  const oldMessages = history.props.children[1].props.children;
  expect(oldMessages.map((node: ReactElement<any>) => node.props.message.id)).toEqual(['prompt-0', 'chat-0', 'reply-0']);
  expect(oldMessages.every((node: ReactElement<any>) => node.type === TypedChatMessage && node.props.message.instant && !node.props.autoSpeak && !node.props.onReady)).toBe(true);
  expect(log.props.children.map((node: ReactElement<any>) => node.props.message.id)).toEqual(['prompt-1', 'chat-2']);
  expect(log.props.children[0].props.autoSpeak).toBe(true);
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('un turno retirado no transfiere un acierto pendiente al turno que ocupa su índice', () => {
  storage.set(key, JSON.stringify({ ...saved, turnId: 'ask', awaitingNext: true }));
  const nodes = render();
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('');
  expect(nodes.some((node) => node.type === 'button' && node.props.children === 'Terminar la conversación →')).toBe(false);
  expect(nodes.some((node) => node.type === 'summary' && node.props.children === 'Borrador anterior guardado')).toBe(true);
  hooks.effects[0]();
  expect(JSON.parse(storage.get(key)!)).toMatchObject({ turnId: 'respond', input: '', recovery: { turnId: 'ask', input: saved.input, helped: true, awaitingNext: true } });
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('un checkpoint legado ambiguo conserva el borrador como recuperación, sin evaluarlo en otro turno', () => {
  const { turnId: _turn, ...legacy } = saved;
  storage.set(key, JSON.stringify(legacy));
  const nodes = render();
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('');
  hooks.effects[0]();
  expect(JSON.parse(storage.get(key)!)).toMatchObject({ round: 0, turnId: 'respond', recovery: { round: 1, input: saved.input } });
  // Reload of the new checkpoint retains the recovery draft rather than nesting copies.
  render(); hooks.effects[0]();
  expect(JSON.parse(storage.get(key)!).recovery.recovery).toBeUndefined();
  expect(JSON.parse(storage.get(key)!).recovery.input).toBe(saved.input);
  expect(readLearningActivities(user)).toHaveLength(0);
});
