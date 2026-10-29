import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StoryJourney } from './components/StoryJourney';
import { reviewUnits } from './preview/previewUnit';
import { grammarTricks, trickStop } from './domain/journeyTricks';
import { recordWordRecall } from './domain/memory';
import { readLearningActivities } from './domain/learningActivity';
import { readTrickCheckpoint } from './domain/trickCheckpoint';
import { JourneyTrickExperience } from './components/JourneyTrickExperience';
import { LanguageGame } from './LanguageGame';
vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn(), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn() }));
vi.mock('./services/progressSync', async (original) => ({ ...await original<typeof import('./services/progressSync')>(), startProgressSync: (_id: string, callback: (status: string) => void) => { callback('saved'); return { stop: vi.fn() }; } }));
vi.mock('./services/directus', async (original) => ({
  ...await original<typeof import('./services/directus')>(), hasSession: () => true,
  loadIdentity: async () => ({ id: 'app-food-preparation-isolated', isAdmin: false }),
  loadPublishedUnitSummaries: async () => [kitchen, food].map((unit) => ({ ...unit, grammarTricks: grammarTricks(unit) })),
  loadUnit: async (id: string) => [kitchen, food].find((unit) => unit.id === id),
  loadKeysPilot: async () => null, loadMirrorPilot: async () => null, loadAsset: async () => '',
}));
const kitchen = reviewUnits.find((unit) => unit.id === 'm1-test-kitchen')!;
const food = reviewUnits.find((unit) => unit.id === 'm1-kitchen-pan')!;
const user = 'app-food-preparation-isolated';
const foodStop = trickStop(food, grammarTricks(food)[0]);
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
async function click(label: string) { await act(async () => tree.root.findAllByType('button').find((node) => text(node).trim().startsWith(label))!.props.onClick()); }
async function start(staleCook = false) {
  vi.useFakeTimers(); const values = new Map<string, string>();
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('window', { localStorage: local, location: { search: '' }, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }), getSelection: () => null });
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  for (const word of [...kitchen.words, ...food.words]) recordWordRecall(user, staleCook && word.en === 'COOK' ? { ...word, scene: 'Presentación antigua.' } : word, 'hesitant', new Date(), 'recognition', undefined, true);
  local.setItem(`memora-v2.resume.${user}`, foodStop.id); local.setItem(`memora-v2.resume-mode.${user}`, 'grammar');
  const App = (await import('./App')).default;
  await act(async () => { tree = create(<App />); }); await act(async () => tree.root.findByType(StoryJourney).props.onExit()); await click('Continuar jugando');
}
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('el botón del paso previo abre el truco de cena con su ID estable sin fabricar intentos', async () => {
  await start(); expect(text(tree.toJSON())).toContain('Ya tienes las palabras.');
  const body = tree.root.findByProps({ className: 'game-card-body' });
  expect(body.children).toHaveLength(1);
  expect((body.children[0] as any).props.className).toBe('preparation-content');
  expect(tree.root.findByProps({ className: 'preparation-actions' }).findAllByType('button')).toHaveLength(2);
  const before = readLearningActivities(user); await click('Practicar el aviso de la cena');
  const episode = tree.root.findByType(JourneyTrickExperience);
  expect(episode.props.unit.id).toBe(kitchen.id);
  expect(episode.props.stop.id).toBe(trickStop(kitchen, grammarTricks(kitchen)[0]).id);
  expect(text(tree.toJSON())).toContain('Avisa para que Nora no encargue otra cena');
  expect(readLearningActivities(user)).toEqual(before);
  expect(readTrickCheckpoint(user, foodStop.id, food.contentVersion ?? '1')).toBeNull();
});
it('una asociación COOK antigua abre vocabulario actual, no otra escritura ni un falso acierto', async () => {
  await start(true); expect(text(tree.toJSON())).toContain('historia y sonido actuales');
  const before = readLearningActivities(user); await click('Preparar COOK: cocinar');
  expect(tree.root.findAllByType(JourneyTrickExperience)).toHaveLength(0);
  expect(tree.root.findByType(LanguageGame).props.unit.id).toBe(kitchen.id);
  expect(tree.root.findByType(LanguageGame).props.learningMode).toBe('vocabulary');
  expect(readLearningActivities(user)).toEqual(before);
});
