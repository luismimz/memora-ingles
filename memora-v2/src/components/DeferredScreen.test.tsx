import { lazy } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { DeferredScreen } from './DeferredScreen';

it('permite volver mientras carga y una resolución tardía no navega ni abre otra pantalla', async () => {
  let resolve!: (value: { default: () => JSX.Element }) => void;
  const load = vi.fn(() => new Promise<{ default: () => JSX.Element }>((done) => { resolve = done; }));
  const Screen = lazy(load), back = vi.fn();
  const tree = create(<DeferredScreen label="el laboratorio" onBack={back}><Screen /></DeferredScreen>);
  expect(load).toHaveBeenCalledOnce(); expect(back).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ role: 'status' }).children.join('')).toContain('volver');
  act(() => tree.root.findByType('button').props.onClick());
  expect(back).toHaveBeenCalledOnce();
  act(() => tree.unmount());
  await act(async () => resolve({ default: () => <p>Herramienta</p> }));
  expect(back).toHaveBeenCalledOnce();
});

it('muestra la herramienta al resolver sin exigir otro clic', async () => {
  const Screen = lazy(async () => ({ default: () => <h2>Contenido</h2> }));
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<DeferredScreen label="contenido" onBack={() => {}}><Screen /></DeferredScreen>); });
  expect(tree.root.findByType('h2').children).toEqual(['Contenido']);
  expect(tree.root.findAllByProps({ role: 'status' })).toHaveLength(0);
  tree.unmount();
});

it('un fallo de descarga conserva una salida sin bucle de reintentos', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const load = vi.fn(async () => { throw new Error('chunk unavailable'); });
    const Screen = lazy(load), back = vi.fn();
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<DeferredScreen label="contenido" onBack={back}><Screen /></DeferredScreen>); });
    expect(tree.root.findByProps({ role: 'alert' }).children.join('')).toContain('no está disponible');
    act(() => tree.root.findByType('button').props.onClick());
    expect(back).toHaveBeenCalledOnce(); expect(load).toHaveBeenCalledOnce();
    tree.unmount();
  } finally { log.mockRestore(); }
});
