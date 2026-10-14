import workerSource from '../../public/sw.js?raw';
import recoverySource from '../../public/memora-update.js?raw';
import { describe, expect, it, vi } from 'vitest';

describe('retirada segura de V1', () => {
  it('sustituye el worker sin interceptar red ni borrar almacenamiento', async () => {
    const handlers = new Map<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void>();
    const navigate = vi.fn().mockResolvedValue(undefined);
    const adminNavigate = vi.fn();
    const unregister = vi.fn().mockResolvedValue(true);
    new Function('self', 'URL', workerSource)({
      addEventListener: (type: string, handler: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(type, handler),
      location: { origin: 'https://memora.test' }, skipWaiting: vi.fn().mockResolvedValue(undefined),
      registration: { unregister }, clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: async () => [
        { url: 'https://memora.test/', navigate }, { url: 'https://memora.test/api/admin', navigate: adminNavigate },
      ] },
    }, URL);
    let pending = Promise.resolve();
    handlers.get('activate')!({ waitUntil: (promise) => { pending = promise as Promise<void>; } });
    await pending;
    expect(handlers.has('fetch')).toBe(false);
    expect(unregister).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://memora.test/');
    expect(adminNavigate).not.toHaveBeenCalled();
  });

  it('la recuperación retira únicamente sw.js del mismo origen', async () => {
    let click: () => Promise<void> = async () => {};
    const own = vi.fn().mockResolvedValue(true); const unrelated = vi.fn();
    const replace = vi.fn();
    const button = { disabled: false, addEventListener: (_: string, callback: typeof click) => { click = callback; } };
    new Function('document', 'navigator', 'location', 'URL', recoverySource)(
      { getElementById: (id: string) => id === 'update' ? button : { textContent: '' } },
      { serviceWorker: { getRegistrations: async () => [
        { active: { scriptURL: 'https://memora.test/sw.js' }, unregister: own },
        { active: { scriptURL: 'https://memora.test/other/sw.js' }, unregister: unrelated },
      ] } }, { origin: 'https://memora.test', replace }, URL,
    );
    await click();
    expect(own).toHaveBeenCalledOnce(); expect(unrelated).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/?memora-version=2');
  });
});
