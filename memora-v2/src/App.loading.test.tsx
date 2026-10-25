import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { previewUnit } from './preview/previewUnit';
import { LanguageGame } from './LanguageGame';
import type { AtomicUnit } from './domain/unit';
import { recordWordRecall } from './domain/memory';
import { completeArcadeCadence, pendingAutomaticArcade } from './domain/arcadeCadence';
import { recordLearningActivity } from './domain/learningActivity';

const api = vi.hoisted(() => ({ unit: vi.fn(), library: vi.fn(), identity: vi.fn(), published: vi.fn() }));
vi.mock('./services/audio', () => ({ stopSpeech: vi.fn(), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn(), playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('./services/progressSync', async (original) => ({ ...await original<typeof import('./services/progressSync')>(), startProgressSync: (_id: string, callback: (status: string) => void) => { callback('saved'); return { stop: vi.fn() }; } }));
vi.mock('./services/directus', async (original) => ({
  ...await original<typeof import('./services/directus')>(), hasSession: () => true,
  loadIdentity: api.identity, loadPublishedUnitSummaries: api.published,
  loadUnit: api.unit, loadLearningLibrary: api.library,
  loadKeysPilot: async () => null, loadMirrorPilot: async () => null,
}));
let tree: ReactTestRenderer;
let values: Map<string, string>;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const click = async (label: string) => { await act(async () => { tree.root.findAllByType('button').find((node) => text(node).trim().startsWith(label))!.props.onClick(); }); };
async function mount() { const App = (await import('./App')).default; await act(async () => { tree = create(<App />); }); }
beforeEach(() => {
  vi.clearAllMocks(); api.unit.mockReset(); api.library.mockReset(); api.identity.mockReset(); api.published.mockReset(); values = new Map();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage, location: { search: '' }, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }) });
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  api.identity.mockResolvedValue({ id: 'loading-isolated', isAdmin: false });
  api.published.mockResolvedValue([previewUnit]);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
const learningKeys = () => [...values.keys()].filter((key) => /learning|memory|resume|checkpoint/.test(key));

it.each(['resolved', 'rejected'] as const)('salir de una carga %s no abre la actividad ni cambia la posición al llegar tarde', async (outcome) => {
  let resolve!: (unit: AtomicUnit) => void; let reject!: (reason: Error) => void;
  api.unit.mockImplementation(() => new Promise((yes, no) => { resolve = yes; reject = no; }));
  await mount();
  await click('Continuar jugando');
  expect(text(tree.toJSON())).toContain('Abriendo tu actividad…');
  expect(tree.root.findByProps({ role: 'status' })).toBeTruthy();
  expect(text(tree.toJSON())).not.toContain('casi lista');
  await click('Volver sin esperar');
  expect(text(tree.toJSON())).toContain('Continuar jugando');
  await act(async () => { if (outcome === 'resolved') resolve(previewUnit); else reject(new Error('obsolete-error')); });
  expect(tree.root.findAllByType(LanguageGame)).toHaveLength(0);
  expect(text(tree.toJSON())).not.toContain('obsolete-error');
  expect(learningKeys()).toEqual([]);
});
it('una carga cancelada no oculta la nueva espera ni sustituye la actividad elegida después', async () => {
  let finishOld!: (unit: AtomicUnit) => void; let finishNew!: (unit: AtomicUnit) => void;
  api.unit.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; })).mockImplementationOnce(() => new Promise((resolve) => { finishNew = resolve; }));
  await mount(); await click('Continuar jugando'); await click('Volver sin esperar'); await click('Continuar jugando');
  await act(async () => finishOld({ ...previewUnit, id: 'obsolete-unit' }));
  expect(text(tree.toJSON())).toContain('Abriendo tu actividad…');
  expect(learningKeys()).toEqual([]);
  await act(async () => finishNew(previewUnit));
  expect(tree.root.findByType(LanguageGame).props.unit.id).toBe(previewUnit.id);
  expect(values.get('memora-v2.resume.loading-isolated')).toBe(previewUnit.id);
});
it.each(['Aprender palabras', 'Gramática'])('cancela %s y descarta el catálogo tardío sin borrar posición', async (label) => {
  let finish!: (result: { units: AtomicUnit[]; failed: string[] }) => void;
  api.library.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  values.set('memora-v2.resume.loading-isolated', 'saved-position');
  await mount(); const before = [...values.entries()];
  await click(label);
  expect(text(tree.toJSON())).toContain(label === 'Gramática' ? 'Abriendo el recorrido de gramática…' : 'Abriendo las tandas de palabras…');
  await click('Volver sin esperar');
  await act(async () => finish({ units: [previewUnit], failed: [] }));
  expect(text(tree.toJSON())).toContain('Continuar jugando');
  expect([...values.entries()]).toEqual(before);
});
it('la entrada inicial no ofrece volver a un recorrido que aún no está cargado', async () => {
  api.identity.mockImplementation(() => new Promise(() => {}));
  await mount();
  expect(text(tree.toJSON())).toContain('Abriendo tu recorrido…');
  expect(tree.root.findAllByType('button')).toHaveLength(0);
  expect(learningKeys()).toEqual([]);
});
it('Arcade muestra su preparación, evita dobles lanzamientos y puede cancelarse sin consumir la ronda', async () => {
  let finish!: (unit: AtomicUnit) => void;
  api.unit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  for (const word of previewUnit.words) recordWordRecall('loading-isolated', word, 'quick');
  recordLearningActivity('loading-isolated', { unitId: previewUnit.id, unitTitle: previewUnit.title, contentVersion: previewUnit.contentVersion ?? '1', activityId: 'isolated-word-practice', skill: 'vocabulary', phase: 'arcade', source: 'learner', modality: 'choice', prompt: 'jugar', response: 'PLAY', expected: 'PLAY', correct: true, helped: false });
  for (let index = 1; index <= 4; index++) completeArcadeCadence('loading-isolated', `completed-${index}`, '1', false);
  await mount(); const before = [...values.entries()];
  await click('Arcade');
  expect(text(tree.toJSON())).toContain('Preparando una ronda');
  expect(text(tree.toJSON())).toContain('Continuar jugando');
  await click('Arcade'); expect(api.unit).toHaveBeenCalledOnce();
  await click('Cancelar preparación');
  expect(text(tree.toJSON())).not.toContain('Preparando una ronda');
  await act(async () => finish(previewUnit));
  expect(tree.root.findAllByType('dialog')).toHaveLength(0);
  expect(pendingAutomaticArcade('loading-isolated')).toBe('associations');
  expect([...values.entries()]).toEqual(before);
});
it.each([false, true])('permite reintentar el catálogo sin cerrar sesión, con detalles técnicos solo para admin=%s', async (admin) => {
  api.identity.mockResolvedValue({ id: 'loading-isolated', isAdmin: admin });
  api.published.mockRejectedValueOnce(new Error('technical-catalogue-error'));
  values.set('memora-v2.resume.loading-isolated', 'saved-position');
  await mount(); const before = [...values.entries()];
  expect(text(tree.toJSON())).toContain('No pudimos abrir tu recorrido');
  expect(tree.root.findByProps({ role: 'alert' })).toBeTruthy();
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(1);
  expect(text(tree.toJSON()).includes('technical-catalogue-error')).toBe(admin);
  expect(text(tree.toJSON()).includes('Detalles para administración')).toBe(admin);
  await click('Volver a intentar');
  expect(text(tree.toJSON())).toContain('Continuar jugando');
  expect(api.identity).toHaveBeenCalledTimes(2);
  expect(api.published).toHaveBeenCalledTimes(2);
  expect([...values.entries()]).toEqual(before);
});
