import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { ScreenHeading } from './ScreenHeading';

it('sitúa el foco al entrar sin desplazar la página y no lo roba al actualizar datos', () => {
  const focus = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<ScreenHeading id="entry">Mi recorrido</ScreenHeading>, { createNodeMock: () => ({ focus }) }); });
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  expect(tree.root.findByType('h1').props.tabIndex).toBe(-1);
  act(() => tree.update(<ScreenHeading id="entry">Mi recorrido actualizado</ScreenHeading>));
  expect(focus).toHaveBeenCalledOnce();
  act(() => tree.unmount());
});
it('distingue carga y error aunque React conserve el mismo título', () => {
  const focus = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<ScreenHeading focusKey="loading">Abriendo</ScreenHeading>, { createNodeMock: () => ({ focus }) }); });
  act(() => tree.update(<ScreenHeading focusKey="error">No se pudo abrir</ScreenHeading>));
  expect(focus).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});
it('respeta el destino de retorno que ya gestiona la biblioteca', () => {
  const focus = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<ScreenHeading autoFocus={false}>Elige una tanda</ScreenHeading>, { createNodeMock: () => ({ focus }) }); });
  expect(focus).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
