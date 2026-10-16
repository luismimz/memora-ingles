import { expect, it } from 'vitest';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { grammarJourney, nextGrammarStop, missingGrammarStop, completedGrammarStop } from './grammarJourney';
import { buildJourneyRoute, grammarTricks } from './journeyTricks';
import type { WordMemory } from './memory';
import type { LearningActivity } from './learningActivity';

it('usa los mismos IDs que Inicio y no inventa trucos para los paquetes', () => {
  const units = [...reviewUnits, { ...previewUnit, id: 'words-only', kind: 'vocabulary-pack' as const }];
  const route = grammarJourney(units);
  const home = buildJourneyRoute(units.map((unit) => ({ ...unit, grammarTricks: grammarTricks(unit) })));
  expect(route.length).toBeGreaterThan(0);
  expect(route.some((stop) => stop.routeTrick?.sourceId === 'words-only')).toBe(false);
  for (const stop of home.filter((unit) => unit.routeTrick)) expect(route.map((unit) => unit.id)).toContain(stop.id);
  const skills = route.flatMap((stop) => stop.routeTrick ? [stop.routeTrick.skill] : []);
  expect(new Set(skills).size).toBe(skills.length);
});
it('comparte el completado real y continúa solo hacia trucos preparados pendientes', () => {
  const route = grammarJourney(reviewUnits);
  const first = route[0];
  const learned = [...new Set(route.flatMap((stop) => stop.routeTrick?.vocabulary ?? []))].map((key) => ({ key, correct: 1 })) as WordMemory[];
  expect(missingGrammarStop(first, reviewUnits, [])).not.toHaveLength(0);
  expect(missingGrammarStop(first, reviewUnits, learned)).toEqual([]);
  const completed = route.filter((stop) => stop.routeTrick).map((stop) => ({ unitId: stop.routeTrick!.sourceId, contentVersion: stop.contentVersion ?? '1', source: 'learner', phase: 'completion', activityId: `trick-completed:${stop.routeTrick!.formId}` })) as LearningActivity[];
  expect(completedGrammarStop(first, completed)).toBe(true);
  expect(nextGrammarStop(first.id, route, reviewUnits, learned, completed)).toBeUndefined();
  expect(nextGrammarStop(first.id, route, reviewUnits, [], [])).toBeUndefined();
});
