import { describe, expect, it } from 'vitest';
import { buildJourneyRoute, completedTrick, grammarTricks, mixedJourneyUnits, missingTrickWords, nextJourneyStop, type JourneyTrick } from './journeyTricks';
import type { UnitSummary } from '../services/directus';
import type { WordMemory } from './memory';
import type { LearningActivity } from './learningActivity';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { lessonForForm } from './grammarLesson';

const trick: JourneyTrick = { sourceId: 'u1', formId: 'ing', skill: 'present-now', title: 'Di quién', vocabulary: ['play'] };
const units = (count: number): UnitSummary[] => Array.from({ length: count }, (_, index) => ({ id: `u${index + 1}`, title: `Parada ${index + 1}`, words: [{ en: 'PLAY', es: 'jugar' }], grammarTricks: index === 0 ? [trick] : [] }));
const known = [{ key: 'play', correct: 1 }] as WordMemory[];
const activity = { unitId: 'u1', contentVersion: '1', source: 'learner', phase: 'completion', activityId: 'trick-completed:ing' } as LearningActivity;

describe('paradas de gramática con vocabulario preparado', () => {
  it('el truco de jugando requiere PLAY, no COMPUTER/DESK de la conversación', () => {
    const descriptor = grammarTricks(previewUnit)[0];
    expect(descriptor.vocabulary).toEqual(['play']);
    const stop = { ...previewUnit, routeTrick: descriptor };
    expect(missingTrickWords(stop, known)).toEqual([]);
    expect(previewUnit.words.length).toBeGreaterThan(1);
  });
  it('cepillando no hereda teeth/mirror de una misión que el truco corto no usa', () => {
    const source = structuredClone(previewUnit);
    source.words = [{ ...source.words[0], en: 'BRUSH', es: 'cepillar' }, { ...source.words[1], en: 'TEETH', es: 'dientes' }, { ...source.words[2], en: 'MIRROR', es: 'espejo' }];
    source.grammar[0] = { ...source.grammar[0], lesson: undefined, englishBase: 'brush', englishRoot: 'brush', english: 'brushing', spanish: 'cepillando', spanishStem: 'cepill', spanishEnding: 'ando', subjects: [{ en: "I'm", expandedEn: 'I am', es: 'Yo estoy', phrase: "I'm brushing" }] };
    expect(grammarTricks(source)[0].vocabulary).toEqual(['brush']);
  });
  it('no elimina una palabra contextual cuando la lección sí la exige', () => {
    const source = structuredClone(previewUnit);
    source.grammar[0].lesson = { id: 'computer-context', title: 'Con mi ordenador', language: 'en', steps: [{ caption: 'Compara las piezas.', es: [{ text: 'ordenador', role: 'context' }], en: [{ text: 'computer', role: 'context' }] }], checks: [{ id: 'write', kind: 'write', prompt: 'Escribe la frase.', answers: ['I am playing on my computer.'], hint: 'Recuerda las piezas.', success: 'Bien.' }] };
    const descriptor = grammarTricks(source)[0];
    expect(descriptor.vocabulary).toContain('computer');
    expect(missingTrickWords({ ...source, routeTrick: descriptor }, known)).toContain('computer');
  });
  it('reparte equivalentes y asociaciones sin borrar, duplicar ni modificar misiones', () => {
    const input = [...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, title: 'Equivalente', words: [{ en: 'HOTEL', es: 'hotel', associationMode: 'cognate' as const }] })), ...Array.from({ length: 3 }, (_, i) => ({ id: `a${i}`, title: 'Historia absurda' }))];
    const mixed = mixedJourneyUnits(input);
    expect(mixed.map((unit) => unit.id)).toEqual(['a0', 'c0', 'a1', 'c1', 'a2', 'c2', 'c3', 'c4', 'c5']);
    expect(new Set(mixed.map((unit) => unit.id)).size).toBe(input.length);
    expect(input[0].id).toBe('c0');
  });
  it('los aciertos nuevos no mueven las paradas ni cambian sus IDs al recargar', () => {
    const input = units(5);
    input[0].grammarTricks = [{ ...trick, vocabulary: ['brush'], skill: 'brush', title: 'Cepillando' }, trick];
    input[0].words = [{ en: 'BRUSH', es: 'cepillar' }];
    expect(buildJourneyRoute(input, known)).toEqual(buildJourneyRoute(input, []));
    expect(buildJourneyRoute(input, known).find((stop) => stop.routeTrick)?.routeTrick?.skill).toBe('brush');
  });
  it('evita siete misiones equivalentes seguidas aunque la proporción global sea muy desigual', () => {
    const input = [...Array.from({ length: 160 }, (_, index) => ({ id: `c${index}`, title: 'Equivalente', words: [{ en: 'HOTEL', es: 'hotel', associationMode: 'cognate' as const }] })), ...units(12)];
    const opening = mixedJourneyUnits(input).slice(0, 16);
    expect(opening.filter((unit) => unit.id.startsWith('u'))).toHaveLength(8);
    expect(mixedJourneyUnits(input).filter((unit) => unit.id.startsWith('u')).map((unit) => unit.id)).toEqual(units(12).map((unit) => unit.id));
  });
  it('recupera asociaciones pendientes para quien ya estaba en la cola de equivalentes', () => {
    const input = [{ id: 'story', title: 'Historia' }, ...Array.from({ length: 6 }, (_, index) => ({ id: `c${index}`, title: 'Equivalente', words: [{ en: 'HOTEL', es: 'hotel', associationMode: 'cognate' as const }] }))];
    const route = buildJourneyRoute(input);
    expect(nextJourneyStop('c3', route, [], [], new Set(['c0', 'c1', 'c2', 'c3']))?.id).toBe('story');
    expect(nextJourneyStop('c3', route, [], [], new Set(['story', 'c0', 'c1', 'c2', 'c3']))?.id).toBe('c4');
  });
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
  it('espacia una ficha aplazada con cuatro misiones nuevas reales, también tras recargar', () => {
    const input = units(10);
    input[0].grammarTricks!.push({ ...trick, formId: 'other', skill: 'other' });
    const route = buildJourneyRoute(input);
    const done = (unitId: string, activityId: string, second: number) => ({ ...activity, unitId, activityId, at: `2026-10-21T10:00:${String(second).padStart(2, '0')}.000Z` });
    const initial = [...Array.from({ length: 4 }, (_, index) => done(`u${index + 1}`, 'vocabulary-completed', index)), done('u1', 'trick-completed:ing', 4)];
    const subsequent = Array.from({ length: 4 }, (_, index) => done(`u${index + 5}`, 'vocabulary-completed', index + 5));
    for (let count = 1; count < 4; count++) {
      const evidence = [...initial, ...subsequent.slice(0, count)];
      const completedIds = new Set(evidence.filter((entry) => entry.activityId === 'vocabulary-completed').map((entry) => entry.unitId));
      expect(nextJourneyStop(`u${count + 4}`, route, known, evidence, completedIds)?.id).toBe(`u${count + 5}`);
    }
    const evidence = [...initial, ...subsequent];
    const completedIds = new Set(Array.from({ length: 8 }, (_, index) => `u${index + 1}`));
    const selection = nextJourneyStop('u8', route, known, evidence, completedIds);
    expect(selection?.id).toBe('trick:u1:other');
    expect(nextJourneyStop('u8', buildJourneyRoute(input), known, JSON.parse(JSON.stringify(evidence)), completedIds)?.id).toBe(selection?.id);
    // Restored records need not arrive in timestamp order.
    expect(nextJourneyStop('u8', route, known, [...evidence].reverse(), completedIds)?.id).toBe(selection?.id);
  });
  it('repeticiones, contenido editorial y actividades Arcade no adelantan otra gramática', () => {
    const input = units(10);
    input[0].grammarTricks!.push({ ...trick, formId: 'other', skill: 'other' });
    const route = buildJourneyRoute(input);
    const evidence = [
      { ...activity, activityId: 'vocabulary-completed', at: '2026-10-21T10:00:00Z' },
      { ...activity, at: '2026-10-21T10:01:00Z' },
      ...Array.from({ length: 5 }, (_, index) => ({ ...activity, activityId: 'vocabulary-completed', at: `2026-10-21T10:02:0${index}Z` })),
      { ...activity, unitId: 'u5', source: 'authored', activityId: 'vocabulary-completed', at: '2026-10-21T10:03:00Z' },
      { ...activity, unitId: 'u6', phase: 'arcade', activityId: 'vocabulary-completed', at: '2026-10-21T10:03:01Z' },
    ] as LearningActivity[];
    expect(nextJourneyStop('u5', route, known, evidence, new Set(['u1', 'u2', 'u3', 'u4', 'u5']))?.id).toBe('u6');
    expect(evidence).toHaveLength(9);
  });
  it('no encadena quince variantes al agotar palabras ni borra las paradas guardadas', () => {
    const input = units(4);
    input[0].grammarTricks = Array.from({ length: 15 }, (_, index) => ({ ...trick, formId: `form-${index}`, skill: `skill-${index}`, concept: 'present-continuous' }));
    const route = buildJourneyRoute(input);
    const stops = route.filter((stop) => stop.routeTrick);
    expect(stops).toHaveLength(15); // No deletion, renaming or fabricated completion.
    const allWordsDone = new Set(input.map((unit) => unit.id));
    expect(nextJourneyStop(stops[0].id, route, known, [], allWordsDone)).toBeUndefined();
    // A previously saved tail stop still resolves and can leave for pending words.
    expect(route.find((stop) => stop.id === 'trick:u1:form-12')).toBeTruthy();
    expect(nextJourneyStop('trick:u1:form-12', route, known, [], new Set(['u1', 'u2', 'u3'] ))?.id).toBe('u4');
    expect(completedTrick(stops[1], [])).toBe(false);
  });
  it('extrae lecciones reales, pero nunca convierte paquetes en gramática inventada', () => {
    expect(grammarTricks(previewUnit).length).toBeGreaterThan(0);
    expect(grammarTricks({ ...previewUnit, kind: 'vocabulary-pack' })).toEqual([]);
    const route = buildJourneyRoute(reviewUnits.map((unit) => ({ ...unit, grammarTricks: grammarTricks(unit) })));
    expect(route.some((stop) => stop.routeTrick)).toBe(true);
    for (const stop of route.filter((stop) => stop.routeTrick)) expect(reviewUnits.some((unit) => unit.id === stop.routeTrick!.sourceId)).toBe(true);
  });
  it('un truco independiente usa palabras anteriores y nunca se cuenta como misión de vocabulario nueva', () => {
    const authored = { ...previewUnit, id: 'grammar-only', kind: 'grammar-lesson' as const, grammarPrerequisites: { vocabulary: ['play'] }, grammar: [], grammarLesson: { ...lessonForForm(previewUnit.grammar[0], 'jugar')!, id: 'authored-identification', title: 'Usa lo preparado' } };
    const descriptor = grammarTricks(authored)[0];
    const input = [...units(8), { ...authored, grammarTricks: [descriptor] }];
    input[4].grammarTricks = [{ ...trick, sourceId: 'u5', skill: 'present-brush', concept: 'present' }];
    input[0].grammarTricks![0] = { ...trick, concept: 'present' };
    const route = buildJourneyRoute(input);
    expect(route.filter((stop) => !stop.routeTrick)).toHaveLength(8);
    expect(route.some((stop) => stop.id === authored.id)).toBe(false);
    expect(route.filter((stop) => stop.routeTrick)[1].routeTrick?.skill).toBe(descriptor.skill);
  });
});
