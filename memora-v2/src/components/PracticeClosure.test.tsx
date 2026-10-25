import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { PracticeClosure } from './PracticeClosure';

it('continuar y salir destacan; los apoyos opcionales permanecen cerrados y no actúan al montar', () => {
  const next = vi.fn(), exit = vi.fn(), arcade = vi.fn(), history = vi.fn();
  const tree = create(<PracticeClosure nextLabel="Seguir mi aventura" onContinue={next} onExit={exit} onPractice={arcade} onEvolution={history}><p>Eco voluntario</p></PracticeClosure>);
  const actions = tree.root.findByProps({ className: 'practice-closure-actions' }).findAllByType('button');
  expect(actions).toHaveLength(2);
  expect(actions[0].children).toEqual(['Seguir mi aventura']);
  expect(tree.root.findByType('details').props.open).toBeUndefined();
  for (const fn of [next, exit, arcade, history]) expect(fn).not.toHaveBeenCalled();
  act(() => { actions[0].props.onClick(); actions[1].props.onClick(); });
  expect(next).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledOnce();
  const extras = tree.root.findByType('details').findAllByType('button');
  act(() => { extras[0].props.onClick(); extras[1].props.onClick(); });
  expect(arcade).toHaveBeenCalledOnce(); expect(history).toHaveBeenCalledOnce();
  tree.unmount();
});

it('sin apoyos no añade un desplegable vacío', () => {
  const tree = create(<PracticeClosure nextLabel="Continuar" onContinue={() => {}} onExit={() => {}} />);
  expect(tree.root.findAllByType('details')).toHaveLength(0);
  tree.unmount();
});

it('si el avance vive en la franja de la tarjeta, solo ofrece cierre sin duplicar continuar', () => {
  const exit = vi.fn();
  const tree = create(<PracticeClosure onExit={exit} />);
  expect(tree.root.findAllByType('button')).toHaveLength(1);
  act(() => tree.root.findByType('button').props.onClick());
  expect(exit).toHaveBeenCalledOnce();
  tree.unmount();
});
