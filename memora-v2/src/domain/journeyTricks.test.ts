import { describe, expect, it } from 'vitest';
import { buildJourneyRoute, completedTrick, grammarTricks, missingTrickWords, nextJourneyStop, type JourneyTrick } from './journeyTricks';
import type { UnitSummary } from '../services/directus';
import type { WordMemory } from './memory';
import type { LearningActivity } from './learningActivity';
import { previewUnit, reviewUnits } from '../preview/previewUnit';

const trick: JourneyTrick = { sourceId: 'u1', formId: 'ing', skill: 'present-now', title: 'Di quién', vocabulary: ['play'] };
const units = (count: number): UnitSummary[] => Array.from({ length: count }, (_, index) => ({ id: `u${index + 1}`, title: `Parada ${index + 1}`, words: [{ en: 'PLAY', es: 'jugar' }], grammarTricks: index === 0 ? [trick] : [] }));
const known = [{ key: 'play', correct: 1 }] as WordMemory[];
const activity = { unitId: 'u1', contentVersion: '1', source: 'learner', phase: 'completion', activityId: 'trick-completed:ing' } as LearningActivity;

describe('paradas de gramática con vocabulario preparado', () => {
  it('intercala un truco después de cuatro misiones sin alterar IDs ni duplicar lecciones', () => {
    const input = units(9);
    input[4].grammarTricks = [{ ...trick, sourceId: 'u5' }];
    const route = buildJourneyRoute(input);
    expect(route.map((stop) => stop.id)).toEqual(['u1', 'u2', 'u3', 'u4', 'trick:u1:ing', 'u5', 'u6', 'u7', 'u8', 'u9']);
    expect(input).toHaveLength(9);
    expect(route.filter((stop) => stop.routeTrick)).toHaveLength(1);
  });
  it('no fabrica fichas ni introduce un truco antes de que aparezcan sus palabras', () => {
    const input = units(9);
    input[0].grammarTricks = [{ ...trick, vocabulary: ['eat'] }];
    expect(buildJourneyRoute(input).filter((stop) => stop.routeTrick)).toHaveLength(0);
    input[5].words = [{ en: 'EAT', es: 'comer' }];
    expect(buildJourneyRoute(input).findIndex((stop) => stop.routeTrick)).toBe(6);
    expect(buildJourneyRoute(units(3)).filter((stop) => stop.routeTrick)).toHaveLength(0);
  });
  it('un vocabulario solo mostrado no desbloquea; un acierto previo sí', () => {
    const stop = buildJourneyRoute(units(5))[4];
    expect(missingTrickWords(stop, [{ key: 'play', correct: 0 }] as WordMemory[])).toEqual(['play']);
    expect(missingTrickWords(stop, known)).toEqual([]);
  });
  it('continúa a las palabras si el truco está pendiente y lo recupera cuando está preparado', () => {
    const route = buildJourneyRoute(units(6));
    expect(nextJourneyStop('u4', route, [])?.id).toBe('u5');
    expect(nextJourneyStop('u4', route, known)?.id).toBe('trick:u1:ing');
    expect(nextJourneyStop('u5', route, known)?.id).toBe('trick:u1:ing');
    expect(nextJourneyStop('u5', route, known, [activity])?.id).toBe('u6');
    expect(nextJourneyStop('trick:u1:ing', route, known, [activity])?.id).toBe('u5');
    expect(nextJourneyStop('trick:u1:ing', route, known, [activity], new Set(['u1', 'u2', 'u3', 'u4', 'u5']))?.id).toBe('u6');
  });
  it('solo marca la práctica real del truco, respetando versión y fuente', () => {
    const stop = buildJourneyRoute(units(5))[4];
    expect(completedTrick(stop, [activity])).toBe(true);
    expect(completedTrick(stop, [{ ...activity, activityId: 'vocabulary-completed' }])).toBe(false);
    expect(completedTrick(stop, [{ ...activity, source: 'authored' }])).toBe(false);
    expect(completedTrick({ ...stop, contentVersion: '2' }, [activity])).toBe(false);
  });
  it('extrae lecciones reales, pero nunca convierte paquetes en gramática inventada', () => {
    expect(grammarTricks(previewUnit).length).toBeGreaterThan(0);
    expect(grammarTricks({ ...previewUnit, kind: 'vocabulary-pack' })).toEqual([]);
    const route = buildJourneyRoute(reviewUnits.map((unit) => ({ ...unit, grammarTricks: grammarTricks(unit) })));
    expect(route.some((stop) => stop.routeTrick)).toBe(true);
    for (const stop of route.filter((stop) => stop.routeTrick)) expect(reviewUnits.some((unit) => unit.id === stop.routeTrick!.sourceId)).toBe(true);
  });
});
