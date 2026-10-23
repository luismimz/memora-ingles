import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarArcade } from './GrammarArcade';
import { previewUnit } from '../preview/previewUnit';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { chunkKey, readChunkMemories, recordChunkExposure, recordChunkRecall } from '../domain/memory';
import { initializeJournal } from '../domain/progressJournal';
import { readLearningActivities } from '../domain/learningActivity';
import { readGrammarAttempts } from '../domain/grammarMemory';

const clock = vi.hoisted(() => ({ expire: () => {} }));
vi.mock('./useArcadeClock', () => ({ useArcadeClock: (_index: number, _revealed: boolean, _enabled: boolean, expire: () => void) => {
  clock.expire = expire;
  return { paused: false, remaining: 6000, checkpoint: false, togglePause() {}, continuePlaying() {}, advanceNow() {} };
} }));
vi.mock('../domain/grammarArcadeRounds', () => ({ grammarArcadeRounds: vi.fn() }));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'grammar-timeout-isolated';
const slot = previewUnit.sentence.slots[0];
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), key: (index: number) => [...data.keys()][index] ?? null, get length() { return data.size; } });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn() });
  initializeJournal(user);
  recordChunkExposure(user, previewUnit.id, previewUnit.sentence, 0);
  recordChunkRecall(user, chunkKey(previewUnit.id, previewUnit.sentence, 0), 'quick');
  vi.mocked(grammarArcadeRounds).mockReturnValue([{ unit: previewUnit, sentence: previewUnit.sentence, slotIndex: 0, slot, skill: 'prepared-slot', conceptual: false }]);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
function mount() { act(() => { tree = create(<GrammarArcade units={[previewUnit]} userId={user} inspection={false} onExit={() => {}} onWords={() => {}} automatic />); }); }

it('un timeout montado conserva memoria/capacidad/intervalo del bloque y registra una sola omisión neutral', () => {
  const before = readChunkMemories(user);
  mount();
  act(() => { clock.expire(); clock.expire(); });
  expect(readChunkMemories(user)).toEqual(before);
  expect(readGrammarAttempts(user)).toHaveLength(0);
  expect(readLearningActivities(user)).toMatchObject([{ correct: null, helped: true, response: '(sin respuesta)' }]);
});

it('una respuesta incorrecta real conserva su fallo, en lugar de convertir todos los resultados en neutrales', () => {
  mount();
  const option = tree.root.findByProps({ className: 'recall-choices arcade-grammar-options' }).findAllByType('button').find((node) => node.props.children !== slot.en)!;
  act(() => option.props.onClick());
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: false, helped: true }]);
  expect(readLearningActivities(user)).toMatchObject([{ correct: false }]);
  expect(readChunkMemories(user)[0].lapses).toBe(1);
});
