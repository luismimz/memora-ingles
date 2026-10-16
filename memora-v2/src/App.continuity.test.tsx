import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewUnit } from './preview/previewUnit';

const hooks = vi.hoisted(() => ({ cursor: 0, states: new Map<number, unknown>() }));
const api = vi.hoisted(() => ({ loadUnit: vi.fn() }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!hooks.states.has(index)) hooks.states.set(index, typeof initial === 'function' ? initial() : initial);
    return [hooks.states.get(index), (value: unknown) => hooks.states.set(index, typeof value === 'function' ? value(hooks.states.get(index)) : value)];
  },
  useEffect: () => undefined,
}));
vi.mock('./useAppearance', () => ({ useAppearance: () => ({ appearance: 'light', toggleAppearance: vi.fn() }) }));
vi.mock('./services/audio', () => ({ stopSpeech: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('./services/directus', async (original) => ({ ...await original<typeof import('./services/directus')>(), hasSession: () => true, loadUnit: api.loadUnit }));
vi.mock('./domain/microArcade', () => ({ shouldOfferMicroArcade: () => false }));

let App: typeof import('./App').default;
const next = { ...previewUnit, id: 'next-pack', title: 'Más asociaciones', kind: 'vocabulary-pack' as const };
const current = { ...previewUnit, id: 'first-pack', kind: 'vocabulary-pack' as const };
let storage: Map<string, string>;
beforeAll(async () => {
  vi.stubGlobal('window', { location: { search: '' } });
  App = (await import('./App')).default;
});
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  hooks.cursor = 0;
  hooks.states.clear();
  // App's top-level state only; children are not mounted or replaced by fake engines.
  for (const [index, value] of [[2, current], [3, 'vocabulary'], [15, [current, next]], [16, 'learner'], [17, true], [27, 'saved']] as const) hooks.states.set(index, value);
  api.loadUnit.mockReset().mockResolvedValue(next);
});
function game() {
  hooks.cursor = 0;
  const root = App() as ReactElement<{ children: ReactElement[] }>;
  return root.props.children[0] as ReactElement<Record<string, any>>;
}

describe('continuidad real desde App', () => {
  it('una cuenta admin jugando desde Home guarda como alumno, no como revisión', () => {
    expect(game().props.reviewMode).toBe(false);
    expect(game().props.syncStatus).toBe('saved');
  });
  it('guarda la siguiente parada al completar antes de pulsar continuar o salir', () => {
    game().props.onFinished();
    expect(storage.get('memora-v2.resume.learner')).toBe(next.id);
    expect(storage.get('memora-v2.resume-mode.learner')).toBe('vocabulary');
    expect(hooks.states.get(2)).toBe(current);
  });
  it('continúa del paquete 1 al 2 directamente, sin abrir Home o la biblioteca', async () => {
    const props = game().props;
    expect(props.nextLabel).toBe('Continuar jugando →');
    props.onNext();
    expect(hooks.states.get(22)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.loadUnit).toHaveBeenCalledWith(next.id);
    expect(hooks.states.get(2)).toBe(next);
    expect(hooks.states.get(4)).toBeNull();
    expect(hooks.states.get(3)).toBe('vocabulary');
  });
  it('continúa también dentro de Palabras sin volver a elegir un paquete', () => {
    hooks.states.set(4, 'vocabulary'); hooks.states.set(5, [current, next]);
    game().props.onNext();
    expect(hooks.states.get(2)).toBe(next);
    expect(api.loadUnit).not.toHaveBeenCalled();
  });
  it('la revisión editorial explícita sigue sin cambiar la posición del alumno', () => {
    hooks.states.set(18, true);
    const props = game().props;
    expect(props.reviewMode).toBe(true);
    props.onFinished();
    expect(storage.size).toBe(0);
  });
  it('no vuelve al primer paquete cuando no hay más contenido', () => {
    hooks.states.set(2, next);
    const props = game().props;
    expect(props.nextLabel).toBe('Volver al recorrido →');
    props.onNext();
    expect(hooks.states.get(2)).toBeNull();
    expect(api.loadUnit).not.toHaveBeenCalled();
  });
});
