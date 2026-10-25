import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { GameCard } from './GameCard';

let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
it.each([false, true])('repara foco perdido al entrar en tarjeta vertical=%s sin responder ni avanzar', (vertical) => {
  const body = {}, focus = vi.fn(), advance = vi.fn();
  vi.stubGlobal('document', { body, activeElement: body });
  act(() => { tree = create(<GameCard vertical={vertical} stepKey="one" onAdvance={advance}>Contenido</GameCard>, { createNodeMock: () => ({ focus, scrollTop: 0 }) }); });
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  expect(advance).not.toHaveBeenCalled();
  act(() => tree.update(<GameCard vertical={vertical} stepKey="two" onAdvance={advance}>Explicación siguiente</GameCard>));
  expect(focus).toHaveBeenCalledOnce();
  expect(advance).not.toHaveBeenCalled();
});
it.each(['input', 'options', 'dialog'])('no quita foco a %s ni lo roba al cambiar explicación o feedback', (control) => {
  const focus = vi.fn(); const body = {};
  vi.stubGlobal('document', { body, activeElement: { control } });
  act(() => { tree = create(<GameCard vertical stepKey="one">Contenido</GameCard>, { createNodeMock: () => ({ focus, scrollTop: 0 }) }); });
  act(() => tree.update(<GameCard vertical stepKey="two" onAdvance={() => {}}>Feedback</GameCard>));
  expect(focus).not.toHaveBeenCalled();
});
it('una tarjeta sin avance es enfocable programáticamente, no una nueva parada de Tab', () => {
  act(() => { tree = create(<GameCard>Pregunta</GameCard>); });
  expect(tree.root.findByProps({ role: 'group' }).props.tabIndex).toBe(-1);
});
