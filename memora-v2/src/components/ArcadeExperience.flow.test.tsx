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
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { ConversationPractice } from './ConversationPractice';
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
it('el mixto conserva superficie vertical de piezas a conversación y siguiente reto', () => {
  let tree = render(); tree.props.onMix(); tree = render(); tree.props.onUse(); tree = render();
  expect(tree.props.children.type).toBe(SentenceBuilderCard); expect(tree.props.children.props.vertical).toBe(true);
  expect(tree.props.children.props.vocabulary).toEqual(previewUnit.words);
  tree.props.children.props.onNext(); tree = render();
  expect(tree.props.children.type).toBe(SentenceBuilderCard);
  for (const [index, slot] of previewUnit.sentence.slots.entries()) {
    tree.props.children.props.onAttempt(slot.en, true, index);
    tree.props.children.props.onPick(); tree = render();
  }
  tree.props.children.props.onNext(); tree = render();
  expect(tree.props.children.type).toBe(ConversationPractice); expect(tree.props.children.props.vertical).toBe(true);
  tree.props.children.props.onContinue(); tree = render();
  expect(tree.type).toBe(MicroArcade);
});
it('el mixto limita reparación, ignora callbacks antiguos y lleva ayuda real al chat', () => {
  let tree = render(); tree.props.onMix(); tree = render(); tree.props.onUse(); tree = render();
  const old = tree.props.children.props;
  const slot = previewUnit.sentence.slots[0], wrong = slot.choices.find((choice) => choice !== slot.en)!;
  old.onAttempt(wrong, false, 0); old.onAttempt(wrong, false, 0);
  expect(old.onAttempt(wrong, false, 0)).toBe(false);
  old.onPick(); tree = render();
  expect(tree.props.children.props.filledSlots).toBe(0);
  expect(tree.props.children.props.needsModel).toBe(true);
  tree.props.children.props.onAcceptModel(); tree.props.children.props.onAcceptModel(); tree = render();
  expect(tree.props.children.props.filledSlots).toBe(1);
  expect(tree.props.children.props.needsModel).toBe(false);
  expect(old.onAttempt(slot.en, true, 0)).toBe(false);
  for (let index = 1; index < previewUnit.sentence.slots.length; index++) {
    tree.props.children.props.onAttempt(previewUnit.sentence.slots[index].en, true, index);
    tree.props.children.props.onPick(); tree = render();
  }
  tree.props.children.props.onNext(); tree = render();
  expect(tree.props.children.type).toBe(ConversationPractice);
  expect(tree.props.children.props.initialHelped).toBe(true);
});
