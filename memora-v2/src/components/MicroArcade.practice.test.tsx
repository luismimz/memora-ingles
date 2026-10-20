import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { previewUnit } from '../preview/previewUnit';
import { readLearningActivities } from '../domain/learningActivity';
import { readWordMemories, recordWordRecall } from '../domain/memory';
const hooks = vi.hoisted(() => ({ index: 0, state: new Map<number, unknown>(), expire: () => {}, advance: () => {}, duration: 0 }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.state.has(id)) hooks.state.set(id, typeof initial === 'function' ? initial() : initial); return [hooks.state.get(id), (value: unknown) => hooks.state.set(id, typeof value === 'function' ? value(hooks.state.get(id)) : value)]; },
  useRef: (current: unknown) => ({ current }), useEffect: () => undefined,
}));
vi.mock('./useArcadeClock', () => ({ useArcadeClock: (index: number, _revealed: boolean, _enabled: boolean, expire: () => void, advance: () => void, _feedback: number, duration: number) => {
  hooks.expire = expire; hooks.advance = advance; hooks.duration = duration;
  return { paused: false, remaining: duration, checkpoint: index > 0 && index % 15 === 0, togglePause() {}, continuePlaying() {} };
} }));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn() }));
import { MicroArcade } from './MicroArcade';
let nodes: ReactElement<any>[];
const advanced = vi.fn();
function render(initialRound = 2) {
  hooks.index = 0;
  const tree = MicroArcade({ userId: 'learner', units: [previewUnit], inspection: false, onExit() {}, initialRound, onRoundAdvance: advanced });
  nodes = [];
  function visit(value: any) { if (Array.isArray(value)) value.forEach(visit); else if (value?.props) { nodes.push(value); visit(value.props.children); } }
  visit(tree);
  return tree;
}
beforeEach(() => {
  hooks.state.clear(); advanced.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  for (const word of previewUnit.words) recordWordRecall('learner', word, 'hesitant', new Date(), 'recognition', undefined, true);
});
it('pide escritura sin imagen ni opciones, acepta minúsculas y registra recuperación independiente', () => {
  render();
  expect(nodes.some((node) => node.props.className === 'recall-choices')).toBe(false);
  expect(hooks.duration).toBe(16000);
  const expected = previewUnit.words[2].en;
  nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: expected.toLowerCase() } });
  render(); nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} });
  const attempt = readLearningActivities('learner').at(-1)!;
  expect(attempt.modality).toBe('writing'); expect(attempt.correct).toBe(true); expect(attempt.helped).toBe(false);
  expect(readWordMemories('learner').find((memory) => memory.key === expected.toLowerCase())?.capabilities?.recall?.independentCorrect).toBe(1);
  hooks.advance(); expect(advanced).toHaveBeenCalledWith(3);
});
it('pedir opciones registra ayuda y reconocimiento, no un acierto autónomo', () => {
  render();
  nodes.find((node) => node.type === 'button' && node.props.children === 'Ayúdame con opciones')!.props.onClick();
  render();
  const expected = previewUnit.words[2].en;
  nodes.find((node) => node.type === 'button' && node.props.children === expected)!.props.onClick();
  const attempt = readLearningActivities('learner').at(-1)!;
  expect(attempt.modality).toBe('choice'); expect(attempt.helped).toBe(true);
  expect(readWordMemories('learner').find((memory) => memory.key === expected.toLowerCase())?.capabilities?.recall).toBeUndefined();
});
it('el error de escritura activa el recordatorio de la misma palabra e historia', () => {
  render(); nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: 'wrong' } });
  render(); nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} });
  render();
  const card = nodes.find((node) => node.props.showBack === true)!;
  expect(card.props.back.props.word).toEqual(previewUnit.words[2]);
  expect(readLearningActivities('learner').at(-1)?.correct).toBe(false);
});
it('conserva el punto de parada número 15 después de un cambio de modo', () => {
  render(14); hooks.advance(); render(14);
  expect(advanced).toHaveBeenCalledWith(15);
  expect(nodes.some((node) => node.type instanceof Function && node.type.name === 'ArcadeCheckpoint')).toBe(true);
});
