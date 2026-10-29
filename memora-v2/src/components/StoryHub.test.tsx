import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StoryHub } from './StoryHub';
import { storyCards, storyJourney } from '../domain/storyJourney';
import { writeTrickCheckpoint } from '../domain/trickCheckpoint';

let tree: ReactTestRenderer;
let values: Map<string, string>;
const props = { userId: 'hub-test', syncStatus: 'saved' as const, onResume: vi.fn(), onProfile: vi.fn(), onEvolution: vi.fn(), onLegacy: vi.fn(), onExit: vi.fn() };
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
beforeEach(() => {
  vi.clearAllMocks(); values = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
afterEach(() => { act(() => tree?.unmount()); vi.unstubAllGlobals(); });
function seed(checkId: string) { writeTrickCheckpoint(props.userId, storyJourney.id, storyJourney.version, { stage: checkId==='end'?storyCards.length:12, checkId, checkIndex: 0, input: 'my draft', feedback: 'help', helped: true }); }
function click(label: string) { act(() => tree.root.findAllByType('button').find(node => text(node).includes(label))!.props.onClick()); }
it('muestra la escena guardada y separa volver de abrir el curso anterior sin escribir progreso', () => {
  seed('need'); const before = [...values];
  act(() => { tree = create(<StoryHub {...props}/>); });
  expect(text(tree.toJSON())).toContain('La llave del gigante');
  expect(text(tree.toJSON())).toContain('El gigante necesita entrar.');
  click('Volver a mi historia'); expect(props.onResume).toHaveBeenCalledOnce();
  expect(props.onLegacy).not.toHaveBeenCalled();
  click('Abrir mi curso anterior'); expect(props.onLegacy).toHaveBeenCalledOnce();
  click('Mi memoria'); expect(props.onEvolution).toHaveBeenCalledOnce();
  click('A mi ritmo'); expect(props.onProfile).toHaveBeenCalledOnce();
  expect([...values]).toEqual(before);
});
it('el final ofrece consultar repasos, sin afirmar que hay un curso infinito', () => {
  seed('end'); act(() => { tree = create(<StoryHub {...props}/>); });
  expect(text(tree.toJSON())).toContain('Lo vivido también se recuerda.');
  click('Ver mis repasos'); expect(props.onResume).toHaveBeenCalledOnce();
});
it('un final antiguo presenta la ampliación sin borrar su posición', () => {
  writeTrickCheckpoint(props.userId, storyJourney.id, storyJourney.version, { stage:31,checkId:'end',checkIndex:0,input:'',feedback:'idle',helped:false });
  const before=[...values];
  act(() => { tree=create(<StoryHub {...props}/>); });
  expect(text(tree.toJSON())).toContain('La cocina de las mil vacas');
  expect(text(tree.toJSON())).toContain('Volver a mi historia');
  expect([...values]).toEqual(before);
});
it('la revisión ignora la posición personal y no ofrece historial personal', () => {
  seed('need'); const before = [...values];
  act(() => { tree = create(<StoryHub {...props} inspection onEvolution={undefined}/>); });
  expect(text(tree.toJSON())).toContain('El café que se escapa');
  expect(text(tree.toJSON())).not.toContain('Mi memoria');
  expect([...values]).toEqual(before);
});
it('un ID antiguo desconocido mantiene una salida segura sin borrar el checkpoint', () => {
  seed('retired-id'); const before = [...values];
  act(() => { tree = create(<StoryHub {...props}/>); });
  expect(text(tree.toJSON())).toContain('El café que se escapa');
  expect([...values]).toEqual(before);
});
