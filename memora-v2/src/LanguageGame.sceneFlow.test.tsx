import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { contextualProcessFixture as unit } from './test/contextualProcessFixture';
import { LanguageGame } from './LanguageGame';
import { GameCard } from './components/GameCard';
import { GrammarCoach } from './components/GrammarCoach';
import { SentenceBuilderCard } from './components/SentenceBuilderCard';
import { ConversationPractice } from './components/ConversationPractice';
import { initialGame } from './domain/game';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { readLearningActivities } from './domain/learningActivity';
import { readWordMemories, recordWordRecall } from './domain/memory';
import { canReuseSceneVocabulary } from './domain/learningModes';
vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('./services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const user = 'full-scene-isolated', next = vi.fn(), finished = vi.fn();
let tree: ReactTestRenderer;
beforeEach(() => {
  next.mockClear(); finished.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
async function mount(learningMode: 'adventure' | 'vocabulary' = 'adventure') { await act(async () => { tree = create(<LanguageGame unit={unit} userId={user} learningMode={learningMode} continuous onNext={next} onFinished={finished} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); }); }
it('la escena enseña palabras en la misma superficie vertical, sin volver al flip antiguo', async () => {
  await mount();
  expect(tree.root.findByType(GameCard).props.vertical).toBe(true);
  expect(tree.root.findAllByProps({ className: 'game-card-swipe ' })).toHaveLength(0);
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual([]);
  expect(next).not.toHaveBeenCalled();
});
it('una escena nueva con vocabulario practicado entra a recuperar, no vuelve a copiarlo ni regala resultados', async () => {
  for (const word of unit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  const memories = readWordMemories(user);
  expect(canReuseSceneVocabulary(unit, memories)).toBe(true);
  await mount();
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.phase).toBe('recall');
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.recallAnswered).toBe(false);
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.correct).toBe(0);
  expect(readLearningActivities(user)).toEqual([]); expect(readWordMemories(user)).toEqual(memories);
  expect(next).not.toHaveBeenCalled(); expect(finished).not.toHaveBeenCalled();
});
it('la práctica explícita de palabras mantiene su montaje aunque haya vocabulario previo', async () => {
  for (const word of unit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  expect(canReuseSceneVocabulary({ ...unit, communication: undefined }, readWordMemories(user))).toBe(false);
  await mount('vocabulary');
  expect(readGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion!)?.phase).toBe('associate');
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual([]);
});
it('el repaso no sustituye un montaje guardado ni omite un significado o historia nuevos', async () => {
  for (const word of unit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  const memories = readWordMemories(user), first = unit.words[0];
  for (const changed of [{ ...first, es: 'Otro significado.' }, { ...first, scene: 'Otra historia.' }, { ...first, bridge: 'Otra pista.' }, { ...first, associationVersion: 999 }]) {
    expect(canReuseSceneVocabulary({ ...unit, words: [changed, ...unit.words.slice(1)] }, memories)).toBe(false);
  }
  writeGameCheckpoint(user, unit.id, unit.contentVersion!, { ...initialGame, phase: 'build', filledSlots: 1 });
  await mount();
  expect(tree.root.findByType(SentenceBuilderCard).props.filledSlots).toBe(1);
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.phase).toBe('build');
  expect(readLearningActivities(user)).toEqual([]);
});
it('haber fallado una palabra o haber visto solo su modelo no permite saltar su enseñanza', async () => {
  for (const word of unit.words) recordWordRecall(user, word, 'missed', new Date(), 'recognition', undefined, true);
  expect(canReuseSceneVocabulary(unit, readWordMemories(user))).toBe(false);
  await mount();
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.phase).toBe('associate');
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toEqual([]);
});
it('recuerdo terminado→gramática→montaje→conversación sin salir de la escena ni marcarla completa por navegar', async () => {
  // Synthetic restored result isolates routing, not an actual pupil's recall.
  writeGameCheckpoint(user, unit.id, unit.contentVersion!, { ...initialGame, phase: 'recall', recallIndex: unit.words.length - 1, recallAnswered: true, recallOutcome: 'correct' });
  await mount();
  await act(async () => tree.root.findByType(GameCard).props.onAdvance());
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.phase).toBe('grammar');
  expect(next).not.toHaveBeenCalled(); expect(finished).not.toHaveBeenCalled();
  const coach = tree.root.findByType(GrammarCoach);
  expect(coach.props.puzzle).toBe(true);
  // Exercise the phase handoff; coach teaching/answer guards have their own tests.
  await act(async () => { coach.props.onReady(); coach.props.onContinue(); });
  expect(tree.root.findByType(SentenceBuilderCard).props.vertical).toBe(true);
  for (const slot of unit.sentence.slots) {
    await act(async () => tree.root.findByProps({ className: 'slot-options' }).findAllByType('button').find((node) => node.props.children === slot.en)!.props.onClick());
  }
  await act(async () => tree.root.findByType(SentenceBuilderCard).props.onNext());
  expect(tree.root.findByType(ConversationPractice).props.vertical).toBe(true);
  expect(readGameCheckpoint(user, unit.id, unit.contentVersion!)?.phase).toBe('conversation');
  expect(readLearningActivities(user).some((event) => event.phase === 'completion')).toBe(false);
  expect(next).not.toHaveBeenCalled(); expect(finished).not.toHaveBeenCalled();
});
