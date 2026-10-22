import { beforeEach, expect, it, vi } from 'vitest';
import { previewUnit } from '../preview/previewUnit';
const hooks = vi.hoisted(() => ({ index: 0, values: new Map<number, unknown>() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.values.has(id)) hooks.values.set(id, typeof initial === 'function' ? initial() : initial); return [hooks.values.get(id), (value: unknown) => hooks.values.set(id, typeof value === 'function' ? value(hooks.values.get(id)) : value)]; },
  useRef: (current: unknown) => { const id = hooks.index++; if (!hooks.values.has(id)) hooks.values.set(id, { current }); return hooks.values.get(id); }, useEffect: () => undefined,
}));
import { ArcadeExperience } from './ArcadeExperience';
import { MicroArcade } from './MicroArcade';
import { GrammarArcade } from './GrammarArcade';
function render(inspection = true, automatic = false) {
  hooks.index = 0;
  return ArcadeExperience({ userId: 'learner', units: [previewUnit], inspection, automatic, onExit() {} });
}
beforeEach(() => { hooks.values.clear(); vi.stubGlobal('localStorage', { getItem: () => null }); });
it('alterna vocabulario y gramática preparada sin reiniciar el contador ni saltar la pausa', () => {
  let tree = render(); expect(tree.type).toBe(MicroArcade);
  tree.props.onRoundAdvance(5); tree = render();
  expect(tree.props.children.type).toBe(GrammarArcade); expect(tree.props.children.props.initialRound).toBe(5);
  tree.props.children.props.onRoundAdvance(10); tree = render();
  expect(tree.type).toBe(MicroArcade); expect(tree.props.initialRound).toBe(10);
  tree.props.onRoundAdvance(15); tree = render();
  expect(tree.type).toBe(MicroArcade); expect(tree.props.initialRound).toBe(15);
  tree.props.onRoundAdvance(20); tree = render();
  expect(tree.props.children.type).toBe(GrammarArcade); expect(tree.props.children.props.initialRound).toBe(20);
});
it('sin gramática practicada no abre una evaluación gramatical sorpresa', () => {
  let tree = render(false); tree.props.onRoundAdvance(5); tree = render(false);
  expect(tree.type).toBe(MicroArcade); expect(tree.props.onGrammar).toBeUndefined();
});
it('la sorpresa no entra en el ciclo de cinco más cinco más cinco', () => {
  let tree = render(true, true);
  expect(tree.props.automatic).toBe(true);
  expect(tree.props.onGrammar).toBeUndefined();
  tree.props.onRoundAdvance(5); tree = render(true, true);
  expect(tree.type).toBe(MicroArcade);
});
