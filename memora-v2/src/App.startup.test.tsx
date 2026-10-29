import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { previewUnit } from './preview/previewUnit';
import type { AtomicUnit } from './domain/unit';

const auxiliary = vi.hoisted(() => ({
  keys: vi.fn(), mirror: vi.fn(),
}));
vi.mock('./services/audio', () => ({ stopSpeech: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('./services/progressSync', async (original) => ({ ...await original<typeof import('./services/progressSync')>(), startProgressSync: (_id: string, callback: (status: string) => void) => { callback('saved'); return { stop: vi.fn() }; } }));
vi.mock('./services/directus', async (original) => ({
  ...await original<typeof import('./services/directus')>(), hasSession: () => true,
  loadIdentity: async () => ({ id: 'startup-isolated', isAdmin: false }),
  loadPublishedUnitSummaries: async () => [previewUnit],
  loadKeysPilot: auxiliary.keys, loadMirrorPilot: auxiliary.mirror,
}));
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';

it.each(['pending', 'rejected'] as const)('abre el recorrido publicado con cargas auxiliares %s, sin registrar aprendizaje ni ampliar herramientas', async (state) => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage, location: { search: '' }, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }) });
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  let resolveKeys!: (value: AtomicUnit | null) => void;
  let resolveMirror!: (value: AtomicUnit | null) => void;
  auxiliary.keys.mockImplementation(() => state === 'rejected' ? Promise.reject(new Error('optional')) : new Promise((resolve) => { resolveKeys = resolve; }));
  auxiliary.mirror.mockImplementation(() => state === 'rejected' ? Promise.reject(new Error('optional')) : new Promise((resolve) => { resolveMirror = resolve; }));
  const App = (await import('./App')).default;
  await act(async () => { tree = create(<App />); });
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(text(tree.toJSON())).not.toContain('Preparando tu escena');
  expect(text(tree.toJSON())).not.toContain('Herramientas y pruebas');
  expect([...values.keys()].some((key) => /learning|memory|progress|resume/.test(key))).toBe(false);
  expect(auxiliary.keys).toHaveBeenCalledOnce(); expect(auxiliary.mirror).toHaveBeenCalledOnce();
  if (state === 'pending') {
    const signal = auxiliary.keys.mock.calls[0][0] as AbortSignal;
    act(() => tree.unmount());
    expect(signal.aborted).toBe(true);
    await act(async () => { resolveKeys(previewUnit); resolveMirror(previewUnit); });
    expect([...values.keys()].some((key) => /learning|memory|progress|resume/.test(key))).toBe(false);
  }
});
