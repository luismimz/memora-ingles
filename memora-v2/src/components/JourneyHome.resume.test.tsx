import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyHome } from './JourneyHomeV2';
import { initialGame } from '../domain/game';
import { writeGameCheckpoint } from '../domain/gameCheckpoint';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { buildJourneyRoute, grammarTricks } from '../domain/journeyTricks';
import { recordLearningActivity } from '../domain/learningActivity';
import { readLearningActivities } from '../domain/learningActivity';
import { recordWordRecall } from '../domain/memory';
import { writeTrickCheckpoint } from '../domain/trickCheckpoint';

beforeEach(() => {
  const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value) });
});
const units = Array.from({ length: 12 }, (_, index) => ({ id: `pack-${index}`, title: `Parada ${index + 1}`, kind: 'vocabulary-pack' as const, words: [{ en: `WORD${index}`, es: 'palabra' }] }));
let tree: ReactTestRenderer | undefined;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });
async function openMap(input = units as Parameters<typeof JourneyHome>[0]['units'], resumeUnitId: string | undefined = 'pack-10', onOpen = vi.fn()) {
  await act(async () => { tree = create(<JourneyHome units={input} userId="learner" resumeUnitId={resumeUnitId} resumeLearningMode="vocabulary" onOpen={onOpen} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
  expect(tree!.root.findAllByProps({ 'aria-label': 'Mapa de tu recorrido' })).toHaveLength(0);
  await act(async () => tree!.root.findByProps({ className: 'home-map-panel' }).props.onToggle({ currentTarget: { open: true } }));
  return tree!;
}
function home() {
  return renderToStaticMarkup(<JourneyHome units={units} userId="learner" resumeUnitId="pack-10" resumeLearningMode="vocabulary" onOpen={() => {}} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />);
}
describe('posición de Home después de parar', () => {
  it('retoma la escritura de llaves antigua sin imponer el nuevo distractor PHONE a mitad del borrador', async () => {
    const source = reviewUnits.find((unit) => unit.id === 'm1-entry-keys')!;
    const input = [{ ...source, grammarTricks: grammarTricks(source) }];
    const stop = buildJourneyRoute(input).find((item) => item.routeTrick)!;
    recordWordRecall('learner', { ...source.words[0], en: 'LOOK', es: 'mirar' }, 'quick');
    writeTrickCheckpoint('learner', stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 1, checkId: 'use', input: "I'm looking", feedback: 'help', helped: true });
    const onOpen = vi.fn();
    const mounted = await openMap(input, stop.id, onOpen);
    await act(async () => mounted.root.findAllByType('button').find((node) => text(node).startsWith('Continuar jugando'))!.props.onClick());
    expect(onOpen).toHaveBeenCalledWith(stop);
    expect(readLearningActivities('learner')).toHaveLength(0);
  });
  it('mantiene la siguiente parada aunque aún no tenga checkpoint y deja el mapa como opción secundaria', async () => {
    const html = home();
    expect(html).toContain('aria-label="Paso 11 de 12"');
    expect(html.indexOf('home-adventure')).toBeLessThan(html.indexOf('home-map-panel'));
    expect(html).not.toContain('Mapa de tu recorrido');
    const mounted = await openMap();
    expect(mounted.root.findAllByProps({ 'aria-label': 'Tu posición · parada 11 de 12' })).toHaveLength(1);
    expect(mounted.root.findAllByType('button').some((node) => node.props['aria-label']?.startsWith('Parada 11: Parada 11. Continúa aquí.'))).toBe(true);
  });
  it('distingue una actividad en curso de una parada todavía sin empezar', () => {
    writeGameCheckpoint('learner', 'pack-10:vocabulary', '1', { ...initialGame, phase: 'recall', recallIndex: 1 });
    const html = home();
    expect(html).toContain('Actividad en curso');
    expect(html).toContain('Recuerda lo que aprendiste');
    expect(html).toContain('Continuar jugando');
  });
  it('al volver al inicio nombra la nueva acción guardada sin llamarla recuerdo sin pistas', () => {
    writeGameCheckpoint('learner', 'pack-10:vocabulary', '1', { ...initialGame, phase: 'recall', recognitionStyle: 'scene-delivery-v1' });
    const html = home();
    expect(html).toContain('Actividad en curso');
    expect(html).toContain('Lleva la palabra a su escena');
    expect(html).not.toContain('Recuerda lo que aprendiste');
    expect(readLearningActivities('learner')).toHaveLength(0);
  });
  it('marca el truco independiente completado aunque su fuente no sea una misión de palabras', async () => {
    const source = { ...previewUnit, id: 'grammar-only', kind: 'grammar-lesson' as const, grammar: [], grammarLesson: { ...lessonForForm(previewUnit.grammar[0], 'jugar')!, id: 'independent-home' }, grammarPrerequisites: { vocabulary: ['play'] } };
    const input = [...units.map((unit, index) => index ? unit : { ...unit, words: [{ en: 'PLAY', es: 'jugar' }] }), { ...source, grammarTricks: grammarTricks(source) }];
    const route = buildJourneyRoute(input);
    const stop = route.find((candidate) => candidate.routeTrick)!;
    recordWordRecall('learner', previewUnit.words[0], 'quick');
    recordLearningActivity('learner', { unitId: source.id, unitTitle: source.title, contentVersion: source.contentVersion ?? '1', activityId: `trick-completed:${stop.routeTrick!.formId}`, skill: stop.routeTrick!.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: '', response: '', expected: '', correct: null, helped: false });
    const mounted = await openMap(input, 'missing');
    expect(mounted.root.findAllByType('button').some((node) => node.props['aria-label']?.startsWith(`Parada ${route.findIndex((candidate) => candidate.id === stop.id) + 1}: ${stop.title}. Completada.`))).toBe(true);
  });
  it('Continuar abre la parada guardada, explorar el mapa no escribe aprendizaje ni cambia el destino', async () => {
    const onOpen = vi.fn();
    const mounted = await openMap(units, 'pack-10', onOpen);
    expect(readLearningActivities('learner')).toHaveLength(0);
    await act(async () => mounted.root.findByProps({ className: 'home-map-panel' }).props.onToggle({ currentTarget: { open: false } }));
    expect(mounted.root.findAllByProps({ 'aria-label': 'Mapa de tu recorrido' })).toHaveLength(0);
    await act(async () => mounted.root.findAllByType('button').find((node) => text(node).startsWith('Continuar jugando'))!.props.onClick());
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(units[10]);
    expect(readLearningActivities('learner')).toHaveLength(0);
  });
});
