import { act, create } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useAppearance } from './useAppearance';

afterEach(() => vi.unstubAllGlobals());
it('mantiene fondo del navegador, esquema y preferencia sincronizados al cambiar apariencia', () => {
  const values = new Map<string, string>(), setAttribute = vi.fn();
  const element = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  vi.stubGlobal('document', { documentElement: element, querySelector: vi.fn(() => ({ setAttribute })) });
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) }, matchMedia: () => ({ matches: false }) });
  function Harness() { const theme = useAppearance(); return <button onClick={theme.toggleAppearance}>{theme.appearance}</button>; }
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<Harness />); });
  expect(setAttribute).toHaveBeenLastCalledWith('content', '#f3f5f8');
  act(() => tree.root.findByType('button').props.onClick());
  expect(element.dataset.appearance).toBe('dark'); expect(element.style.colorScheme).toBe('dark');
  expect(setAttribute).toHaveBeenLastCalledWith('content', '#131923');
  expect(values.get('memora-v2.appearance')).toBe('dark');
  act(() => tree.unmount());
});
