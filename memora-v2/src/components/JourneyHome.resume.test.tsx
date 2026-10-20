import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyHome } from './JourneyHomeV2';
import { initialGame } from '../domain/game';
import { writeGameCheckpoint } from '../domain/gameCheckpoint';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { buildJourneyRoute, grammarTricks } from '../domain/journeyTricks';
import { recordLearningActivity } from '../domain/learningActivity';
import { recordWordRecall } from '../domain/memory';

beforeEach(() => {
  const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value) });
});
const units = Array.from({ length: 12 }, (_, index) => ({ id: `pack-${index}`, title: `Parada ${index + 1}`, kind: 'vocabulary-pack' as const, words: [{ en: `WORD${index}`, es: 'palabra' }] }));
function home() {
  return renderToStaticMarkup(<JourneyHome units={units} userId="learner" resumeUnitId="pack-10" resumeLearningMode="vocabulary" onOpen={() => {}} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />);
}
describe('posición de Home después de parar', () => {
  it('mantiene la siguiente parada aunque aún no tenga checkpoint y haya anteriores sin jugar', () => {
    expect(home()).toContain('Tu posición · parada 11 de 12');
    expect(home()).toContain('Parada 11: Parada 11. Continúa aquí.');
  });
  it('distingue una actividad en curso de una parada todavía sin empezar', () => {
    writeGameCheckpoint('learner', 'pack-10:vocabulary', '1', { ...initialGame, phase: 'recall', recallIndex: 1 });
    const html = home();
    expect(html).toContain('JUSTO DONDE LO DEJASTE');
    expect(html).toContain('Recuerda lo que aprendiste');
    expect(html).toContain('Continuar jugando');
  });
  it('marca el truco independiente completado aunque su fuente no sea una misión de palabras', () => {
    const source = { ...previewUnit, id: 'grammar-only', kind: 'grammar-lesson' as const, grammar: [], grammarLesson: { ...lessonForForm(previewUnit.grammar[0], 'jugar')!, id: 'independent-home' }, grammarPrerequisites: { vocabulary: ['play'] } };
    const input = [...units.map((unit, index) => index ? unit : { ...unit, words: [{ en: 'PLAY', es: 'jugar' }] }), { ...source, grammarTricks: grammarTricks(source) }];
    const route = buildJourneyRoute(input);
    const stop = route.find((candidate) => candidate.routeTrick)!;
    recordWordRecall('learner', previewUnit.words[0], 'quick');
    recordLearningActivity('learner', { unitId: source.id, unitTitle: source.title, contentVersion: source.contentVersion ?? '1', activityId: `trick-completed:${stop.routeTrick!.formId}`, skill: stop.routeTrick!.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: '', response: '', expected: '', correct: null, helped: false });
    const html = renderToStaticMarkup(<JourneyHome units={input} userId="learner" onOpen={() => {}} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />);
    expect(html).toContain(`Parada ${route.findIndex((candidate) => candidate.id === stop.id) + 1}: ${stop.title}. Completada.`);
  });
});
