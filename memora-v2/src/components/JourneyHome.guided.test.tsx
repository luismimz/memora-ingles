import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { JourneyHome } from './JourneyHomeV2';
import { previewUnit } from '../preview/previewUnit';
import { grammarTricks, trickStop } from '../domain/journeyTricks';
import { recordWordRecall } from '../domain/memory';
import { readLearningActivities } from '../domain/learningActivity';
import { writeTrickCheckpoint } from '../domain/trickCheckpoint';
const source = { ...previewUnit, grammarTricks: grammarTricks(previewUnit) };
const stop = trickStop(source, source.grammarTricks[0]);
const user = 'home-guided-isolated';
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const open = vi.fn();
function mount(units = [source], resumeUnitId?: string) { act(() => { tree = create(<JourneyHome units={units} userId={user} resumeUnitId={resumeUnitId} onOpen={open} onConverse={() => {}} onWords={() => {}} onGrammar={() => {}} onArcade={() => {}} onEvolution={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />); }); }
beforeEach(() => {
  open.mockClear(); const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value), removeItem: (key: string) => rows.delete(key) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
it('solo Continuar compite como acción principal; modos, mapa y evidencia siguen disponibles sin escribir progreso', () => {
  mount();
  const buttons = tree.root.findAllByType('button');
  const outsideDetails = buttons.filter((node) => { let parent = node.parent; while (parent) { if (parent.type === 'details') return false; parent = parent.parent; } return true; });
  expect(outsideDetails).toHaveLength(1); expect(text(outsideDetails[0])).toContain('Continuar jugando');
  expect(buttons.filter((node) => text(node) === 'Gramática')).toHaveLength(1); expect(buttons.filter((node) => text(node) === 'Arcade')).toHaveLength(1);
  expect(tree.root.findAllByType('details').every((node) => node.props.open === undefined)).toBe(true);
  expect(tree.root.findAllByProps({ 'aria-label': 'Mapa de tu recorrido' })).toHaveLength(0);
  act(() => outsideDetails[0].props.onClick()); expect(open).toHaveBeenCalledWith(source);
  expect(readLearningActivities(user)).toEqual([]);
});
it('la entrada no duplica progreso ni decora el reto con otra tarjeta ilustrada', () => {
  mount();
  expect(tree.root.findAllByType('img')).toHaveLength(0);
  expect(tree.root.findAllByProps({ className: 'home-progress' })).toHaveLength(1);
  expect(tree.root.findAllByProps({ className: 'home-footprint' })).toHaveLength(0);
  const explore = tree.root.findByProps({ className: 'home-explore' });
  expect(explore.type).toBe('details'); expect(explore.props.open).toBeUndefined();
  expect(explore.findAllByProps({ className: 'home-map-panel' })).toHaveLength(1);
  expect(explore.findAllByProps({ className: 'home-practice-panel' })).toHaveLength(1);
  expect(text(tree.toJSON())).not.toContain('No tienes que elegir un modo');
});
it('nombra la tarea pendiente real de un montaje guardado, no otra lista de modos', () => {
  recordWordRecall(user, source.words[0], 'quick');
  writeTrickCheckpoint(user, stop.id, source.contentVersion ?? '1', { stage: 3, checkIndex: 0, input: '', feedback: 'idle', helped: true, episodeId: 'ing:short-playing-v1', continuation: { phase: 'build', sentenceIndex: 0, filledSlots: 0, order: [2] } });
  mount([source], stop.id);
  expect(text(tree.root.findByType('h1'))).toBe('Monta tu mensaje');
  expect(text(tree.toJSON())).toContain('Tu actividad y tus ayudas siguen donde las dejaste.');
  expect(readLearningActivities(user)).toEqual([]);
});
it('lo practicado procede de memorias, no del tamaño del catálogo ni de abrir Inicio', () => {
  mount(); expect(text(tree.toJSON())).toContain('Tu primera historia empieza aquí.');
  expect(text(tree.toJSON())).not.toContain('palabras aprendidas');
  recordWordRecall(user, source.words[0], 'hesitant');
  act(() => tree.unmount()); mount();
  expect(text(tree.toJSON())).toContain('1 palabra con práctica registrada');
  expect(text(tree.toJSON())).toContain(source.words[0].en);
  expect(tree.root.findAllByProps({ role: 'progressbar' })).toHaveLength(0);
});
it('sin catálogo no muestra un Continuar vacío ni una actividad guardada inventada', () => {
  mount([]); expect(text(tree.toJSON())).toContain('Aún no hay una misión publicada.');
  expect(tree.root.findAllByType('button').some((node) => text(node).includes('Continuar jugando'))).toBe(false);
});
