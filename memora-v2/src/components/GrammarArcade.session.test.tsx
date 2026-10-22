import { beforeEach, expect, it, vi } from 'vitest';
import { previewUnit } from '../preview/previewUnit';
const hooks = vi.hoisted(() => ({ index: 0, state: new Map<number, unknown>(), advance: () => {}, expire: () => {} }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.state.has(id)) hooks.state.set(id, typeof initial === 'function' ? initial() : initial); return [hooks.state.get(id), (value: unknown) => hooks.state.set(id, typeof value === 'function' ? value(hooks.state.get(id)) : value)]; },
  useRef: (current: unknown) => { const id = hooks.index++; if (!hooks.state.has(id)) hooks.state.set(id, { current }); return hooks.state.get(id); },
}));
vi.mock('./useArcadeClock', () => ({ useArcadeClock: (index: number, _revealed: boolean, _enabled: boolean, expire: () => void, advance: () => void, _feedback: number, _duration: number, interval: number) => {
  hooks.advance = advance; hooks.expire = expire;
  return { paused: false, remaining: 6000, checkpoint: index > 0 && index % interval === 0, togglePause() {}, continuePlaying() {} };
} }));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
import { GrammarArcade } from './GrammarArcade';
import { ArcadeCheckpoint } from './ArcadeClock';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
vi.mock('../domain/grammarArcadeRounds', () => ({ grammarArcadeRounds: vi.fn() }));
const exit = vi.fn();
let nodes: any[];
function render(automatic = true) {
  hooks.index = 0;
  const tree = GrammarArcade({ units: [previewUnit], userId: 'isolated', inspection: true, onExit: exit, onWords() {}, automatic });
  nodes = [];
  function visit(value: any) { if (Array.isArray(value)) value.forEach(visit); else if (value?.props) { nodes.push(value); visit(value.props.children); } }
  visit(tree);
}
beforeEach(() => {
  hooks.state.clear(); exit.mockClear();
  vi.mocked(grammarArcadeRounds).mockReturnValue(Array.from({ length: 15 }, (_, slotIndex) => ({ unit: previewUnit, skill: 'present-continuous:brush', sentence: { ...previewUnit.sentence, en: 'I am brushing' }, slotIndex, slot: { en: 'Sí, ahora', es: 'Está ocurriendo ahora', choices: ['Sí, ahora', 'Todavía no'] }, conceptual: true })));
});
it('tras responder deja ver el feedback y vuelve al recorrido sin reciclar BRUSH quince veces', () => {
  render();
  nodes.find((node) => node.type === 'button' && node.props.children === 'Sí, ahora').props.onClick();
  expect(exit).not.toHaveBeenCalled();
  render(); hooks.advance();
  expect(exit).toHaveBeenCalledOnce();
});
it('un timeout también termina tras su rescate, no reinicia la misma pregunta', () => {
  render(); hooks.expire(); render();
  expect(nodes.some((node) => node.props.showBack === true)).toBe(true);
  expect(exit).not.toHaveBeenCalled();
  hooks.advance(); expect(exit).toHaveBeenCalledOnce();
});
it('Arcade manual cierra el lote de una frase; repetir requiere una decisión explícita', () => {
  render(false); hooks.expire(); render(false); hooks.advance(); render(false);
  expect(nodes.find((node) => node.type === ArcadeCheckpoint)?.props.rounds).toBe(1);
  expect(exit).not.toHaveBeenCalled();
});
