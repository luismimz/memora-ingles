import { expect, it, vi } from 'vitest';
import { act, create } from 'react-test-renderer';
import { PlayHeader } from './PlayHeader';
import { syncLabels } from '../services/progressSync';

it('Escape cierra opciones, devuelve foco y no sale de la actividad ni cambia su apariencia', () => {
  const focus = vi.fn(), exit = vi.fn(), theme = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<PlayHeader title="Monta tu mensaje" onExit={exit} appearance="light" onToggleAppearance={theme} syncStatus="offline" />, { createNodeMock: (node) => node.type === 'summary' ? { focus } : null }); });
  const currentTarget = { open: true };
  act(() => tree.root.findByType('details').props.onKeyDown({ key: 'Escape', currentTarget, preventDefault: vi.fn(), stopPropagation: vi.fn() }));
  expect(currentTarget.open).toBe(false);
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  expect(exit).not.toHaveBeenCalled(); expect(theme).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ className: 'play-save-warning' }).children).toEqual([syncLabels.offline]);
  act(() => tree.unmount());
});

it('la instrucción y salida son primarias; apariencia, porcentaje y estado quedan en opciones', () => {
  const exit = vi.fn(); const theme = vi.fn();
  let tree: ReturnType<typeof create>;
  act(() => { tree = create(<PlayHeader title="Monta tu mensaje" onExit={exit} appearance="light" onToggleAppearance={theme} syncStatus="saved" progress={42} />); });
  const root = tree!.root;
  expect(root.findByProps({ className: 'play-intention' }).children).toEqual(['Monta tu mensaje']);
  const buttons = root.findAllByType('button');
  expect(buttons).toHaveLength(2);
  expect(buttons[0].findAllByType('details')).toHaveLength(0);
  expect(buttons[1].parent!.findAllByType('small').length).toBeGreaterThan(0);
  expect(root.findAllByType('details')).toHaveLength(1);
  expect(root.findByProps({ className: 'play-options' }).props.open).toBeUndefined();
  act(() => { buttons[0].props.onClick(); buttons[1].props.onClick(); });
  expect(exit).toHaveBeenCalledOnce(); expect(theme).toHaveBeenCalledOnce();
  act(() => tree!.unmount());
});

it.each(['offline', 'error', 'storage-full'] as const)('el aviso %s no queda escondido en opciones', (syncStatus) => {
  const tree = create(<PlayHeader title="Encuentra la palabra" onExit={() => {}} appearance="light" onToggleAppearance={() => {}} syncStatus={syncStatus} />);
  const warning = tree.root.findByProps({ className: 'play-save-warning' });
  expect(warning.children).toEqual([syncLabels[syncStatus]]);
  expect(warning.props.role).toBe(syncStatus === 'storage-full' ? 'alert' : 'status');
  expect(warning.parent!.type).not.toBe('details');
  tree.unmount();
});

it('la revisión permanece explícita y no afirma que se guarda progreso', () => {
  const tree = create(<PlayHeader inspection title="Descubre cómo decirlo" onExit={() => {}} appearance="dark" onToggleAppearance={() => {}} syncStatus="error" />);
  expect(tree.root.findByProps({ role: 'status' }).children).toEqual(['Vista de revisión · no guarda progreso']);
  expect(tree.root.findAllByProps({ className: 'play-save-warning' })).toHaveLength(0);
  tree.unmount();
});

it('el hilo indica solo posición, sin botones, checks de dominio ni estado de aprendizaje nuevo', () => {
  const steps = ['Descubre', 'Monta', 'Conversa', 'Tu práctica'];
  let tree: ReturnType<typeof create>;
  act(() => { tree = create(<PlayHeader title="Monta tu mensaje" onExit={() => {}} appearance="light" onToggleAppearance={() => {}} trail={{ steps, current: 1 }} />); });
  const trail = tree!.root.findByType('ol');
  expect(trail.parent!.props.className).toBe('play-options-panel');
  expect(tree!.root.findByProps({ role: 'progressbar' }).props['aria-valuenow']).toBeCloseTo(100 / 3);
  expect(trail.props.className).toBe('play-trail');
  expect(tree!.root.findAllByProps({ className: 'play-step-position' })).toHaveLength(0);
  expect(tree!.root.findAllByProps({ className: 'play-location-label' })).toHaveLength(0);
  expect(trail.props['aria-label']).toBe('Dónde estoy en esta práctica');
  expect(trail.findAllByType('button')).toHaveLength(0);
  expect(trail.findAllByType('li')).toHaveLength(4);
  expect(trail.findByProps({ 'aria-current': 'step' }).children).toEqual(['Monta']);
  act(() => tree!.update(<PlayHeader title="Responde al personaje" onExit={() => {}} appearance="light" onToggleAppearance={() => {}} trail={{ steps, current: 2 }} />));
  expect(tree!.root.findByProps({ 'aria-current': 'step' }).children).toEqual(['Conversa']);
  act(() => tree!.unmount());
});
it('la posición se ve sin abrir opciones, se acota y no representa respuestas o dominio', () => {
  const exit = vi.fn(); let tree!: ReturnType<typeof create>;
  const render = (progress: number) => <PlayHeader title="Monta tu mensaje" onExit={exit} appearance="light" onToggleAppearance={() => {}} progress={progress} />;
  act(() => { tree = create(render(37)); });
  const track = tree.root.findByProps({ role: 'progressbar' });
  expect(track.props['aria-label']).toContain('no mide dominio');
  expect(track.props['aria-valuenow']).toBe(37);
  expect(track.findByType('span').props.style).toEqual({ width: '37%' });
  expect(track.parent!.props.className).toBe('play-header-context');
  act(() => tree.update(render(130)));
  expect(tree.root.findByProps({ role: 'progressbar' }).props['aria-valuenow']).toBe(100);
  act(() => tree.update(render(Number.NaN)));
  expect(tree.root.findAllByProps({ role: 'progressbar' })).toHaveLength(0);
  expect(exit).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
