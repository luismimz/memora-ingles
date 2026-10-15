import { describe, expect, it } from 'vitest';
import { completedVocabularyStop, journeyPresentation, mapPath, mapPosition, mapScrollTarget, MAP_NODE_WIDTH } from './journeyMap';
import type { LearningActivity } from './learningActivity';

describe('journey map geometry and presentation', () => {
  it('centres on mission 10 without expanding the previous nine', () => {
    expect(mapScrollTarget(9, 186, 560)).toBe(1450);
    expect(mapPosition(9, 375).y - mapScrollTarget(9, 186, 560)).toBe(280);
    expect(mapScrollTarget(999, 186, 560)).toBe(mapScrollTarget(185, 186, 560));
  });
  it('keeps all stops inside narrow mobile and desktop viewports', () => {
    for (const width of [284, 320, 375, 768, 1140]) for (let i = 0; i < 186; i++) {
      const { x } = mapPosition(i, width);
      expect(x - MAP_NODE_WIDTH / 2).toBeGreaterThanOrEqual(0);
      expect(x + MAP_NODE_WIDTH / 2).toBeLessThanOrEqual(width);
    }
  });
  it('draws a connected route, including the last stop', () => {
    expect(mapPath(0, 375)).toBe('');
    expect(mapPath(186, 375).split(' C ')).toHaveLength(186);
    const last = mapPosition(185, 375);
    expect(mapPath(186, 375)).toMatch(new RegExp(`${last.y}$`));
  });
  it('replaces technical labels without changing the content or its identity', () => {
    const unit = { id: 'editorial-cognates-calle-2', title: 'Cognados · calle · 2', words: [{ en: 'HOTEL', es: 'hotel' }, { en: 'STATION', es: 'estación' }] };
    const original = JSON.stringify(unit);
    const result = journeyPresentation(unit);
    expect(result.title).toBe('Tu primera parada');
    expect(result.scene).toBe('city');
    expect(result.terms).toBe('HOTEL · STATION');
    expect(JSON.stringify(unit)).toBe(original);
  });
  it('preserves authored mission names and keeps vocabulary distinct from stories', () => {
    expect(journeyPresentation({ id: 'keys', title: 'Has perdido las llaves' }).title).toBe('Has perdido las llaves');
    expect(journeyPresentation({ id: 'keys', title: 'Has perdido las llaves' }).pack).toBe(false);
    expect(journeyPresentation({ id: 'editorial-003-1', title: 'Asociaciones cotidianas · lote 003 · 1' }).title).toBe('Conexiones sorprendentes');
  });
  it('uses existing vocabulary completion evidence, never a chat answer or preview as mastery', () => {
    const unit = { id: 'pack', title: 'Mis palabras', kind: 'vocabulary-pack' as const, contentVersion: '2' };
    const completion: LearningActivity = { id: 'a', unitId: 'pack', unitTitle: 'Mis palabras', contentVersion: '2', activityId: 'vocabulary-completed', skill: 'vocabulary', phase: 'completion', source: 'learner', modality: 'choice', prompt: '', response: 'Palabras practicadas', expected: '', correct: null, helped: false, at: '2026-10-15T10:00:00Z' };
    expect(completedVocabularyStop(unit, [completion])).toBe(true);
    expect(completedVocabularyStop(unit, [])).toBe(false);
    expect(completedVocabularyStop(unit, [{ ...completion, source: 'authored' }])).toBe(false);
    expect(completedVocabularyStop(unit, [{ ...completion, phase: 'dialogue' }])).toBe(false);
    expect(completedVocabularyStop(unit, [{ ...completion, contentVersion: '1' }])).toBe(false);
    expect(completedVocabularyStop({ ...unit, kind: 'mission' }, [completion])).toBe(false);
  });
});
