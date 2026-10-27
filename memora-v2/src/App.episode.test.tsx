import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { previewUnit } from './preview/previewUnit';
import { grammarTricks, trickStop } from './domain/journeyTricks';
import { recordWordRecall } from './domain/memory';
import { readLearningActivities } from './domain/learningActivity';
import { readTrickCheckpoint } from './domain/trickCheckpoint';
import { GrammarOrder } from './components/GrammarOrder';
import { MicroArcade } from './components/MicroArcade';
import { pendingAutomaticArcade } from './domain/arcadeCadence';
import type { AtomicUnit } from './domain/unit';

const catalogue = vi.hoisted(() => ({ units: null as AtomicUnit[] | null }));

vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn(), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn() }));
vi.mock('./services/progressSync', async (original) => ({ ...await original<typeof import('./services/progressSync')>(), startProgressSync: (_id: string, callback: (status: string) => void) => { callback('saved'); return { stop: vi.fn() }; } }));
vi.mock('./services/directus', async (original) => ({
  ...await original<typeof import('./services/directus')>(),
  hasSession: () => true,
  loadIdentity: async () => ({ id: 'app-episode-isolated', isAdmin: false }),
  loadPublishedUnitSummaries: async () => [{ ...previewUnit, grammarTricks: grammarTricks(previewUnit) }],
  loadUnit: async () => previewUnit,
  loadLearningLibrary: async () => ({ units: catalogue.units ?? [previewUnit], failed: [] }),
  loadKeysPilot: async () => null, loadMirrorPilot: async () => null,
  loadAsset: async () => '',
}));
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const click = async (label: string) => { await act(async () => tree.root.findAllByType('button').find((node) => text(node).trim().startsWith(label))!.props.onClick()); };
async function advance() {
  const target = { closest: () => null };
  await act(async () => {
    const region = tree.root.findByProps({ role: 'region' });
    const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
    region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] });
    region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] });
    region.props.onScroll({ currentTarget: { scrollTop: 100, scrollHeight: 700, clientHeight: 600 } });
    vi.advanceTimersByTime(230);
  });
}
afterEach(() => { if (tree) act(() => tree.unmount()); catalogue.units = null; vi.useRealTimers(); vi.unstubAllGlobals(); });

it('App conserva la búsqueda y la tarjeta elegida al salir de una tanda opcional', async () => {
  vi.useFakeTimers();
  const values = new Map<string, string>();
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('window', { localStorage: local, location: { search: '' }, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }), getSelection: () => null });
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  catalogue.units = Array.from({ length: 14 }, (_, index) => ({ ...previewUnit, id: `optional-${index}`, kind: 'vocabulary-pack', title: `Tanda · Casa · ${index}` }));
  const focused: string[] = [];
  const App = (await import('./App')).default;
  await act(async () => { tree = create(<App />, { createNodeMock: (node) => node.type === 'h2' ? { focus: () => focused.push(String(node.props.children)) } : null }); });
  await click('Recorrido anterior');
  await click('Aprender palabras');
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'casa' } }));
  await act(async () => tree.root.findByProps({ className: 'learning-library-more' }).findByType('button').props.onClick());
  expect(tree.root.findAllByType('article')).toHaveLength(12);
  await act(async () => tree.root.findAllByType('article')[10].findByType('button').props.onClick());
  expect(tree.root.findAllByProps({ className: 'play-intention' })).toHaveLength(1);
  await click('← Recorrido');
  expect(tree.root.findByType('input').props.value).toBe('casa');
  expect(tree.root.findAllByType('article')).toHaveLength(12);
  expect(focused.at(-1)).toBe(catalogue.units[10].title);
  await click('← Inicio');
  await click('Perfil y ajustes');
  await act(async () => { await import('./components/ProfileView'); });
  expect(tree.root.findAllByProps({ className: 'journey-screen profile-screen' })).toHaveLength(1);
  expect(tree.root.findAllByType('summary').some((node) => text(node) === 'Administración de contenido')).toBe(false);
  await click('Mi evolución');
  await act(async () => { await import('./components/EvolutionView'); });
  expect(tree.root.findAllByProps({ className: 'journey-screen evolution-screen' })).toHaveLength(1);
  expect(tree.root.findAllByProps({ className: 'evolution-overview' })).toHaveLength(1);
  await click('Ir a mi recorrido');
  expect(tree.root.findAllByProps({ className: 'journey-screen home-v2 home-guided' })).toHaveLength(1);
  expect(readLearningActivities('app-episode-isolated').filter((item) => item.source === 'learner')).toHaveLength(0);
});

it('App real enlaza episodio→chat→siguiente disponible sin confirmación de cierre ni atasco de Arcade vacío', async () => {
  vi.useFakeTimers();
  const values = new Map<string, string>();
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('window', { localStorage: local, location: { search: '' }, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }), getSelection: () => null });
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  const user = 'app-episode-isolated';
  const stop = trickStop(previewUnit, grammarTricks(previewUnit)[0]);
  recordWordRecall(user, previewUnit.words[0], 'hesitant', new Date(), 'recognition', undefined, true);
  local.setItem(`memora-v2.resume.${user}`, stop.id);
  local.setItem(`memora-v2.resume-mode.${user}`, 'grammar');
  const App = (await import('./App')).default;
  await act(async () => { tree = create(<App />); });
  await click('Recorrido anterior');
  await click('Continuar jugando');
  for (let step = 0; step < 3; step++) await advance();
  await click('Estoy jugando ahora.'); await advance();
  await click('I');
  const checkpoint = readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1');
  expect(checkpoint?.continuation?.order).toHaveLength(1);
  await click('← Recorrido');
  expect(text(tree.toJSON())).toContain('Continuar jugando');
  await click('Continuar jugando');
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual(checkpoint?.continuation?.order);
  await click('AM'); await click('PLAYING'); await advance();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'I am playing' } }));
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(text(tree.toJSON())).toContain('Te guardo el siguiente turno');
  await advance();
  expect(text(tree.toJSON())).not.toContain('¡Tus palabras ya dicen algo nuevo!');
  expect(text(tree.toJSON())).not.toContain('Continuando…');
  expect(tree.root.findAllByType('dialog')).toHaveLength(0);
  expect(pendingAutomaticArcade(user)).toBe('grammar');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(text(tree.toJSON())).not.toContain('¡Tus palabras ya dicen algo nuevo!');
  const activities = readLearningActivities(user);
  expect(activities.filter((event) => event.source === 'learner' && event.modality === 'writing' && event.correct !== null)).toMatchObject([{ correct: true, helped: false }]);
  expect(activities.filter((event) => event.phase === 'completion')).toHaveLength(1);
  expect(readTrickCheckpoint(user, stop.id, previewUnit.contentVersion ?? '1')).toBeNull();
  if (tree.root.findAllByType('button').some((node) => text(node).trim() === '← Recorrido')) await click('← Recorrido');
  await click('Arcade');
  expect(tree.root.findAllByType('dialog')).toHaveLength(1);
  expect(tree.root.findByType(MicroArcade).props.onGrammar).toBeTypeOf('function');
  expect(pendingAutomaticArcade(user)).toBe('grammar');
});
