import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LanguageGame } from './LanguageGame';
import { SentenceBuilderCard } from './components/SentenceBuilderCard';
import { preparedFixture as unit } from './test/grammarPracticeFixtures';
import { initialGame } from './domain/game';
import { writeGameCheckpoint, readGameCheckpoint } from './domain/gameCheckpoint';
import { recordLearningActivity, readLearningActivities } from './domain/learningActivity';
import { piecePreparationKey } from './domain/piecePreparation';
vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'kokoro' })), playSpanish: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('./services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'preparation-flow-isolated', slot = unit.sentence.slots[1], form = unit.grammar[0];
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
function prior() { recordLearningActivity(user, { unitId: 'prior-isolated', unitTitle: 'Synthetic previous construction', contentVersion: 'test', activityId: 'build-0-1', skill: form.id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: slot.en, expected: slot.en, correct: true, helped: true, pieceSignature: piecePreparationKey(slot, form) }); }
async function mount() { await act(async () => { tree = create(<LanguageGame unit={unit} userId={user} learningMode="adventure" onNext={() => {}} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); }); }
it('reutiliza la pieza practicada, no salta el montaje y conserva ayuda y firma al recargar', async () => {
  prior();
  writeGameCheckpoint(user, unit.id, unit.contentVersion!, { ...initialGame, phase: 'build', filledSlots: 1 });
  await mount(); expect(tree.root.findByType(SentenceBuilderCard).props.compactPreparation).toBe(true);
  expect(tree.root.findAllByProps({ className: 'slot-preparation' })).toHaveLength(0);
  const details = tree.root.findByProps({ className: 'familiar-piece' }).findByType('details');
  await act(async () => details.props.onToggle({ currentTarget: { open: true } }));
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.grammarHelpUsed).toBe(true);
  expect(readLearningActivities(user)).toHaveLength(1);
  act(() => tree.unmount()); await mount();
  expect(tree.root.findByType(SentenceBuilderCard).props.compactPreparation).toBe(true);
  const choice = tree.root.findByProps({ className: 'slot-options' }).findAllByType('button').find((node) => node.props.children === slot.en)!;
  await act(async () => choice.props.onClick());
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.filledSlots).toBe(2);
  expect(readLearningActivities(user).find((event) => event.unitId === unit.id && event.activityId === 'build-0-1')).toMatchObject({ correct: true, helped: true, pieceSignature: piecePreparationKey(slot, form) });
});
it('un error al reutilizar recupera la explicación sin colocar la pieza ni ocultar el primer intento', async () => {
  prior();
  writeGameCheckpoint(user, unit.id, unit.contentVersion!, { ...initialGame, phase: 'build', filledSlots: 1 });
  await mount();
  const wrong = tree.root.findByProps({ className: 'slot-options' }).findAllByType('button').find((node) => node.props.children !== slot.en)!;
  const wrongValue = wrong.props.children;
  await act(async () => wrong.props.onClick());
  expect(tree.root.findByType(SentenceBuilderCard).props.compactPreparation).toBe(false);
  expect(tree.root.findAllByProps({ className: 'slot-preparation' })).toHaveLength(1);
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.filledSlots).toBe(1);
  expect(readLearningActivities(user).filter((event) => event.unitId === unit.id)).toMatchObject([{ correct: false, response: wrongValue }]);
});
it('una explicación identificada ya empezada conserva su paso aunque exista práctica previa', async () => {
  prior();
  writeGameCheckpoint(user, unit.id, unit.contentVersion!, { ...initialGame, phase: 'build', filledSlots: 1, preparationStep: 1 });
  await mount(); expect(tree.root.findByType(SentenceBuilderCard).props.compactPreparation).toBe(false);
  expect(tree.root.findAllByProps({ className: 'slot-preparation' })).toHaveLength(1);
  expect(tree.root.findAllByProps({ className: 'slot-options' })).toHaveLength(0);
  expect(readLearningActivities(user)).toHaveLength(1);
});
