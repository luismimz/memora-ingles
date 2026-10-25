import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialGame } from './game';
import { clearGameCheckpoint, clearMirrorCheckpoint, hasGameCheckpoint, readGameCheckpoint, readMirrorCheckpoint, writeGameCheckpoint, writeMirrorCheckpoint } from './gameCheckpoint';

const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  });
});

describe('navigation checkpoints', () => {
  it('restaura el formato existente del coach y descarta solo una posición inválida', () => {
    const state = { ...initialGame, phase: 'grammar' as const, coach: { lessonId: 'prepared', position: { stage: 2, checkIndex: 0, checkId: 'write', input: 'draft', feedback: 'help' as const, helped: true, previousAttemptId: 'prior', checkFailures: 1 } } };
    writeGameCheckpoint('learner', 'coach', '1', state);
    expect(readGameCheckpoint('learner', 'coach', '1')).toEqual(state);
    expect(readGameCheckpoint('other', 'coach', '1')).toBeNull();
    expect(readGameCheckpoint('learner', 'coach', '2')).toBeNull();
    writeGameCheckpoint('learner', 'coach', '1', { ...state, coach: { ...state.coach, position: { ...state.coach.position, checkFailures: 5 } } });
    expect(readGameCheckpoint('learner', 'coach', '1')).toMatchObject({ phase: 'grammar', grammarIndex: 0 });
    expect(readGameCheckpoint('learner', 'coach', '1')?.coach).toBeUndefined();
  });
  it('guarda navegación gramatical sin cruzar usuario/versión ni perder la fase por un subpaso corrupto', () => {
    const state = { ...initialGame, phase: 'grammar' as const, fallbackLesson: { step: 4, subjectIndex: 0, checkIndex: 0, prepared: true, outcome: 'correct' as const, failures: 0 } };
    writeGameCheckpoint('learner', 'fallback', '1', state);
    expect(readGameCheckpoint('learner', 'fallback', '1')).toEqual(state);
    expect(readGameCheckpoint('other', 'fallback', '1')).toBeNull();
    expect(readGameCheckpoint('learner', 'fallback', '2')).toBeNull();
    writeGameCheckpoint('learner', 'fallback', '1', { ...state, fallbackLesson: { ...state.fallbackLesson, failures: 8 } });
    expect(readGameCheckpoint('learner', 'fallback', '1')).toMatchObject({ phase: 'grammar', grammarIndex: 0 });
    expect(readGameCheckpoint('learner', 'fallback', '1')?.fallbackLesson).toBeUndefined();
  });
  it('conserva piezas/ayudas en la misma posición y descarta solo un subpaso corrupto', () => {
    const state = { ...initialGame, wordIndex: 2, wordAssembly: { selected: [0, 2], hinted: true, modelUsed: false } };
    writeGameCheckpoint('learner', 'letters', '1', state);
    expect(readGameCheckpoint('learner', 'letters', '1')).toEqual(state);
    expect(readGameCheckpoint('other', 'letters', '1')).toBeNull();
    expect(readGameCheckpoint('learner', 'letters', '2')).toBeNull();
    for (const selected of [[0, 0], [-1], [1.5]]) {
      writeGameCheckpoint('learner', 'letters', '1', { ...state, wordAssembly: { ...state.wordAssembly, selected } });
      expect(readGameCheckpoint('learner', 'letters', '1')).toMatchObject({ phase: 'associate', wordIndex: 2 });
      expect(readGameCheckpoint('learner', 'letters', '1')?.wordAssembly).toBeUndefined();
    }
  });
  it('el desenlace con modelo requiere su identidad nueva y rechaza estilos o elecciones corruptos', () => {
    const state = { ...initialGame, phase: 'recall' as const, recognitionStyle: 'scene-delivery-v1' as const, recallAnswered: true, recallOutcome: 'modeled' as const };
    writeGameCheckpoint('learner', 'model', '1', state);
    expect(readGameCheckpoint('learner', 'model', '1')).toEqual(state);
    for (const corrupt of [{ ...state, recognitionStyle: undefined }, { ...state, recognitionStyle: 'unknown' }, { ...state, recallChoice: 2 }]) {
      data.set('memora-v2.checkpoint.learner.invalid-model', JSON.stringify({ version: '1', state: corrupt }));
      expect(readGameCheckpoint('learner', 'invalid-model', '1')).toBeNull();
    }
  });
  it('conserva reparación y consulta del modelo sin aceptar contadores inválidos', () => {
    const state = { ...initialGame, phase: 'build' as const, buildRepair: { failures: 2, choice: 'wrong', previousAttemptId: 'prior' }, buildModelUsed: true };
    writeGameCheckpoint('learner', 'repair', '1', state);
    expect(readGameCheckpoint('learner', 'repair', '1')).toEqual(state);
    writeGameCheckpoint('learner', 'invalid-repair', '1', { ...state, buildRepair: { ...state.buildRepair, failures: 15 } });
    expect(readGameCheckpoint('learner', 'invalid-repair', '1')).toBeNull();
  });
  it('restaura el desenlace de una respuesta sin convertir el checkpoint en intento y rechaza valores corruptos', () => {
    const state = { ...initialGame, phase: 'recall' as const, recallAnswered: true, recallOutcome: 'wrong' as const };
    writeGameCheckpoint('learner', 'feedback', '1', state);
    expect(readGameCheckpoint('learner', 'feedback', '1')).toEqual(state);
    data.set('memora-v2.checkpoint.learner.invalid-feedback', JSON.stringify({ version: '1', state: { ...state, recallOutcome: 'passed' } }));
    expect(readGameCheckpoint('learner', 'invalid-feedback', '1')).toBeNull();
    expect(readGameCheckpoint('learner', 'feedback', '1')).toEqual(state);
  });
  it('guarda la subposición de preparación con el checkpoint existente sin cruzar usuario ni versión', () => {
    const state = { ...initialGame, phase: 'build' as const, filledSlots: 1, preparationStep: 2 };
    writeGameCheckpoint('learner', 'prepared', 'draft-1', state);
    expect(readGameCheckpoint('learner', 'prepared', 'draft-1')).toEqual(state);
    expect(readGameCheckpoint('other', 'prepared', 'draft-1')).toBeNull();
    expect(readGameCheckpoint('learner', 'prepared', 'draft-2')).toBeNull();
    writeGameCheckpoint('learner', 'invalid', '1', { ...state, preparationStep: 4 });
    expect(readGameCheckpoint('learner', 'invalid', '1')).toBeNull();
    expect(readGameCheckpoint('learner', 'prepared', 'draft-1')).toEqual(state);
  });
  it('resumes the same game activity without accepting an older content version', () => {
    const state = { ...initialGame, phase: 'recall' as const, recallIndex: 2, recallAnswered: true, correct: 2 };
    writeGameCheckpoint('learner', 'mission', '2', state);
    expect(readGameCheckpoint('learner', 'mission', '2')).toEqual(state);
    expect(readGameCheckpoint('learner', 'mission', '3')).toBeNull();
    clearGameCheckpoint('learner', 'mission');
    expect(hasGameCheckpoint('learner', 'mission')).toBe(false);
  });

  it('keeps mirror progress separate and clears it after completion', () => {
    const state = { stage: 4, person: true, reveal: 3, index: 1, questionReady: true, seen: [0, 1], startedAt: '2026-10-13T00:00:00.000Z' };
    writeMirrorCheckpoint('learner', 'mirror', '1', state);
    expect(hasGameCheckpoint('learner', 'mirror')).toBe(true);
    expect(readMirrorCheckpoint('learner', 'mirror', '1')).toEqual(state);
    clearMirrorCheckpoint('learner', 'mirror');
    expect(readMirrorCheckpoint('learner', 'mirror', '1')).toBeNull();
  });
});
