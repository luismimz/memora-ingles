import { afterEach, describe, expect, it, vi } from 'vitest';
import { isReviewDue, journeySteps, nextPlayableUnit, readUnitProgress } from './journey';

afterEach(() => vi.unstubAllGlobals());

describe('recorrido', () => {
  it('ordena la base antes del contenido de examen', () => {
    expect(journeySteps[0].id).toBe('m1-z1-01');
    expect(journeySteps[1].id).toBe('m1-bedroom-02');
    expect(journeySteps.findIndex((step) => step.id === 'present-actions')).toBeLessThan(journeySteps.findIndex((step) => step.id === 'past-stories'));
  });

  it('continúa a la siguiente escena disponible y reconoce el fin de la tanda', () => {
    const units = [{ id: 'm1-z1-01' }, { id: 'm1-bedroom-02' }];
    expect(nextPlayableUnit(units[0].id, units)?.id).toBe(units[1].id);
    expect(nextPlayableUnit(units[1].id, units)).toBeUndefined();
  });

  it('mantiene la continuidad de las escenas antiguas usadas en vista previa', () => {
    const units = [{ id: 'legacy-one' }, { id: 'legacy-two' }];
    expect(nextPlayableUnit('legacy-one', units)?.id).toBe('legacy-two');
  });

  it('separa repaso vencido, futuro y progreso corrupto', () => {
    const record = { completedAt: '2026-10-09T10:00:00.000Z', nextReviewAt: '2026-10-09T11:00:00.000Z', correct: 3, attempted: 3 };
    vi.stubGlobal('localStorage', { getItem: (key: string) => key.endsWith('.ready') ? JSON.stringify(record) : '{invalid' });
    expect(isReviewDue(readUnitProgress('student', 'ready'), Date.parse('2026-10-09T12:00:00.000Z'))).toBe(true);
    expect(isReviewDue(readUnitProgress('student', 'ready'), Date.parse('2026-10-09T10:30:00.000Z'))).toBe(false);
    expect(readUnitProgress('student', 'broken')).toBeNull();
  });
});
