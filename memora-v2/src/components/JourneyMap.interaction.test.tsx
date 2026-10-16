import { afterEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({ refs: [] as Array<{ current: unknown }> }));

// Exercise the component's actual handlers without a browser session or learner data.
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useRef: (current: unknown) => { const ref = { current }; hooks.refs.push(ref); return ref; },
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: () => {},
}));
import { JourneyMap } from './JourneyMap';

function setup() {
  hooks.refs = [];
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const onOpen = vi.fn();
  const units = Array.from({ length: 20 }, (_, i) => ({ id: `u-${i}`, title: `Misión ${i + 1}` }));
  const tree = JourneyMap({ units, currentId: 'u-9', completedIds: new Set(), onOpen });
  const shell = tree.props.children[1];
  const toolbar = shell.props.children[0];
  const region = shell.props.children[1];
  const footer = shell.props.children[2];
  const element = {
    scrollTop: 1450, clientHeight: 560,
    setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn() },
    scrollTo: vi.fn(), scrollBy: vi.fn(),
  };
  hooks.refs[0].current = element;
  const event = (extra = {}) => ({ currentTarget: element, target: element, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientY: 500, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra });
  return { region, toolbar, footer, element, event, onOpen, units };
}

afterEach(() => vi.unstubAllGlobals());
describe('journey map input handlers', () => {
  it('una parada bloqueada responde con sus requisitos sin abrir la evaluación', () => {
    const stop = { id: 'locked', title: 'Estoy jugando' };
    const onOpen = vi.fn(); const onLockedOpen = vi.fn();
    const tree = JourneyMap({ units: [stop], currentId: stop.id, completedIds: new Set(), lockedIds: new Set([stop.id]), onOpen, onLockedOpen });
    const shell = tree.props.children[1];
    const region = shell.props.children[1];
    const node = region.props.children.props.children[1].props.children[0].props.children;
    expect(node.props.disabled).toBe(false);
    node.props.onClick();
    const footer = shell.props.children[2].props.children[1];
    expect(footer.props.children).toBe('Ver qué falta →');
    footer.props.onClick();
    expect(onLockedOpen).toHaveBeenCalledTimes(2);
    expect(onLockedOpen).toHaveBeenCalledWith(stop);
    expect(onOpen).not.toHaveBeenCalled();
  });
  it('pans by the drag distance and suppresses the accidental click afterwards', () => {
    const { region, element, event } = setup();
    region.props.onPointerDown(event());
    region.props.onPointerMove(event({ clientY: 200 }));
    expect(element.scrollTop).toBe(1750);
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    region.props.onPointerUp(event({ clientY: 200 }));
    const click = event({ detail: 1 });
    region.props.onClickCapture(click);
    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(click.stopPropagation).toHaveBeenCalledOnce();
  });
  it('keeps small taps and keyboard activation usable', () => {
    const { region, element, event } = setup();
    region.props.onPointerDown(event());
    region.props.onPointerMove(event({ clientY: 497 }));
    region.props.onPointerUp(event());
    expect(element.scrollTop).toBe(1450);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
    const click = event({ detail: 0 });
    region.props.onClickCapture(click);
    expect(click.preventDefault).not.toHaveBeenCalled();
  });
  it('leaves touch gestures to native mobile panning', () => {
    const { region, element, event } = setup();
    region.props.onPointerDown(event({ pointerType: 'touch' }));
    region.props.onPointerMove(event({ pointerType: 'touch', clientY: 200 }));
    expect(element.scrollTop).toBe(1450);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });
  it('supports arrows, Home and End without intercepting keys on a mission button', () => {
    const { region, element, event } = setup();
    region.props.onKeyDown(event({ key: 'ArrowDown' }));
    expect(element.scrollBy).toHaveBeenCalledWith({ top: 180, behavior: 'auto' });
    region.props.onKeyDown(event({ key: 'End' }));
    expect(element.scrollTo).toHaveBeenLastCalledWith({ top: 3250, behavior: 'smooth' });
    const childKey = event({ key: 'ArrowDown', target: {} });
    region.props.onKeyDown(childKey);
    expect(childKey.preventDefault).not.toHaveBeenCalled();
  });
  it('returns to the true current position and opens its original unit', () => {
    const { toolbar, footer, element, units, onOpen } = setup();
    toolbar.props.children[1].props.onClick();
    expect(element.scrollTo).toHaveBeenCalledWith({ top: 1450, behavior: 'smooth' });
    footer.props.children[1].props.onClick();
    expect(onOpen).toHaveBeenCalledWith(units[9]);
  });
});
