import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { NavigationMenu } from './NavigationMenu';

it('Escape cierra el desplegable y devuelve el foco al activador sin lanzar acciones', () => {
  const focus = vi.fn(), action = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<NavigationMenu label="Opciones"><button onClick={action}>Abrir</button></NavigationMenu>, { createNodeMock: (node) => node.type === 'summary' ? { focus } : null }); });
  const currentTarget = { open: true }, preventDefault = vi.fn(), stopPropagation = vi.fn();
  act(() => tree.root.findByType('details').props.onKeyDown({ key: 'Escape', currentTarget, preventDefault, stopPropagation }));
  expect(currentTarget.open).toBe(false);
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  expect(preventDefault).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce();
  expect(action).not.toHaveBeenCalled();
  expect(tree.root.findByType('nav').props['aria-label']).toBe('Opciones');
  act(() => tree.unmount());
});
it('no intercepta Tab, Enter ni Escape de un menú ya cerrado', () => {
  const focus = vi.fn(), preventDefault = vi.fn(), stopPropagation = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<NavigationMenu label="Opciones">Contenido</NavigationMenu>, { createNodeMock: () => ({ focus }) }); });
  for (const [key, open] of [['Tab', true], ['Enter', true], ['Escape', false]] as const) {
    const currentTarget = { open };
    act(() => tree.root.findByType('details').props.onKeyDown({ key, currentTarget, preventDefault, stopPropagation }));
    expect(currentTarget.open).toBe(open);
  }
  expect(focus).not.toHaveBeenCalled(); expect(preventDefault).not.toHaveBeenCalled(); expect(stopPropagation).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
