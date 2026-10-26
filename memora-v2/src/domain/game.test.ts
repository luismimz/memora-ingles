import { describe, expect, it } from 'vitest';
import { advanceReviewedGrammar, gameReducer, initialGame, type GameState } from './game';

describe('flujo de la unidad', () => {
  it('pasa directamente sobre repasos sin inventar resultados y se detiene ante una forma nueva o posición empezada', () => {
    const state: GameState = { ...initialGame, phase: 'grammar', filledSlots: 1, sentenceIndex: 1 };
    const known = [{ index: 0, lessonId: 'a' }, { index: 1, lessonId: 'b' }];
    expect(advanceReviewedGrammar(state, known, 2)).toMatchObject({ phase: 'build', filledSlots: 1, sentenceIndex: 1, correct: 0 });
    expect(advanceReviewedGrammar(state, known.slice(0, 1), 2)).toMatchObject({ phase: 'grammar', grammarIndex: 1 });
    const started = { ...state, coach: { lessonId: 'a', position: { stage: 1, checkIndex: 0, input: '', feedback: 'idle' as const, helped: false } } };
    expect(advanceReviewedGrammar(started, known, 2)).toBe(started);
    expect(advanceReviewedGrammar(state, [], 2)).toBe(state);
    expect(advanceReviewedGrammar(initialGame, known, 2)).toBe(initialGame);
  });
  it('la posición del coach pertenece a la forma activa y se retira al cambiar de forma o fase', () => {
    const state: GameState = { ...initialGame, phase: 'grammar', grammarPlayed: true };
    const action = { type: 'coachProgress' as const, grammarIndex: 0, lessonId: 'prepared', position: { stage: 1, checkIndex: 0, input: '', feedback: 'idle' as const, helped: false } };
    const saved = gameReducer(state, action);
    expect(saved.coach?.lessonId).toBe('prepared');
    expect(gameReducer(initialGame, action)).toBe(initialGame);
    expect(gameReducer(saved, { ...action, grammarIndex: 1 })).toBe(saved);
    expect(gameReducer(saved, { type: 'continue', grammarCount: 2 }).coach).toBeUndefined();
    expect(gameReducer(saved, { type: 'continue', grammarCount: 1 })).toMatchObject({ phase: 'build', coach: undefined });
  });
  it('el modelo de reconocimiento solo cierra una tarea nueva pendiente, sin sumar ni restar evidencia', () => {
    const legacy: GameState = { ...initialGame, phase: 'recall' };
    expect(gameReducer(legacy, { type: 'recognitionModel' })).toBe(legacy);
    const pending: GameState = { ...legacy, recognitionStyle: 'scene-delivery-v1', correct: 1, combo: 1 };
    const model = gameReducer(pending, { type: 'recognitionModel' });
    expect(model).toMatchObject({ recallAnswered: true, recallOutcome: 'modeled', correct: 1, combo: 1 });
    expect(gameReducer(model, { type: 'recognitionModel' })).toBe(model);
    expect(gameReducer(model, { type: 'answered', correct: true })).toBe(model);
    const failed = gameReducer(pending, { type: 'answered', correct: false, choice: 'other' });
    expect(gameReducer(failed, { type: 'recognitionModel' })).toBe(failed);
  });
  it('reanuda lectura de preparación sin aciertos y rechaza duplicados o saltos de pasos', () => {
    const state: GameState = { ...initialGame, phase: 'build', filledSlots: 1 };
    const action = { type: 'prepareSlot' as const, sentenceIndex: 0, slotIndex: 1, step: 1, stepCount: 3 };
    const first = gameReducer(state, action);
    expect(first).toEqual({ ...state, preparationStep: 1 });
    expect(gameReducer(first, action)).toBe(first);
    expect(gameReducer(first, { ...action, step: 3 })).toBe(first);
    expect(gameReducer(first, { ...action, slotIndex: 0, step: 2 })).toBe(first);
    expect(gameReducer(first, { ...action, sentenceIndex: 1, step: 2 })).toBe(first);
    expect(gameReducer(initialGame, action)).toBe(initialGame);
    const second = gameReducer(first, { ...action, step: 2 });
    expect(second.correct).toBe(0); expect(second.filledSlots).toBe(1);
    expect(gameReducer(second, { type: 'chooseSlot', correct: true, slotCount: 2 }).preparationStep).toBeUndefined();
  });
  it('el modo gramática termina tras su propia práctica sin repetir construcción o forzar chat', () => {
    const state = { ...initialGame, phase: 'grammar' as const, grammarPlayed: true };
    expect(gameReducer(state, { type: 'continue', grammarCount: 1, grammarOnly: true }).phase).toBe('complete');
    expect(gameReducer(state, { type: 'continue', grammarCount: 1 }).phase).toBe('build');
  });
  it('una misión con diálogo pasa a conversación antes de completarse', () => {
    const state = { ...initialGame, phase: 'build' as const, filledSlots: 3 };
    const next = gameReducer(state, { type: 'continue', sentenceCount: 1, slotCount: 3, conversation: true });
    expect(next.phase).toBe('conversation');
    expect(gameReducer(next, { type: 'continue' }).phase).toBe('complete');
  });
  it('abre directamente la tarjeta de asociación sin fase de escucha intermedia', () => {
    expect(initialGame.phase).toBe('associate');
    expect(gameReducer(initialGame, { type: 'connected' })).toMatchObject({ phase: 'associate', wordIndex: 1 });
  });

  it('mantiene las tres palabras antes de recuperación', () => {
    let state = initialGame;
    for (let index = 0; index < 3; index++) {
      state = gameReducer(state, { type: 'connected' });
    }
    expect(state.phase).toBe('recall');
    expect(state.wordIndex).toBe(2);
  });

  it('no permite saltarse una forma gramatical', () => {
    const state = { ...initialGame, phase: 'grammar' as const };
    expect(gameReducer(state, { type: 'continue' })).toBe(state);
    expect(gameReducer(gameReducer(state, { type: 'grammarPlayed' }), { type: 'continue' }).grammarIndex).toBe(1);
  });

  it('termina el taller tras las dos formas del primer mundo', () => {
    const first = { ...initialGame, phase: 'grammar' as const, grammarPlayed: true };
    const second = gameReducer(first, { type: 'continue', grammarCount: 2 });
    expect(second.grammarIndex).toBe(1);
    expect(gameReducer({ ...second, grammarPlayed: true }, { type: 'continue', grammarCount: 2 }).phase).toBe('build');
  });

  it('no deja avanzar con una opción incorrecta', () => {
    const state = { ...initialGame, phase: 'build' as const };
    expect(gameReducer(state, { type: 'chooseSlot', correct: false, slotCount: 4 }).filledSlots).toBe(0);
    expect(gameReducer(state, { type: 'continue', sentenceCount: 2, slotCount: 4 }).phase).toBe('build');
  });

  it('encadena frases de distinta longitud y solo completa después de la última', () => {
    let state: GameState = { ...initialGame, phase: 'build' };
    for (let sentence = 0; sentence < 3; sentence++) {
      const slotCount = sentence === 2 ? 5 : 4;
      for (let slot = 0; slot < slotCount; slot++) state = gameReducer(state, { type: 'chooseSlot', correct: true, slotCount });
      state = gameReducer(state, { type: 'continue', sentenceCount: 3, slotCount });
      expect(state.phase).toBe(sentence === 2 ? 'complete' : 'build');
      if (sentence < 2) expect(state.filledSlots).toBe(0);
    }
  });

  it('no fuerza una segunda ronda: los fallos vuelven en el repaso', () => {
    const state = { ...initialGame, phase: 'reward' as const, correct: 0 };
    expect(gameReducer(state, { type: 'continue' }).phase).toBe('grammar');
  });
  it('no obliga a repetir una misión de una palabra cuando ya se ha acertado', () => {
    expect(gameReducer({ ...initialGame, phase: 'reward', correct: 1 }, { type: 'continue', wordCount: 1 }).phase).toBe('grammar');
  });

  it('permite inspeccionar una pantalla sin arrastrar el estado de la anterior', () => {
    const inProgress = { ...initialGame, phase: 'build' as const, filledSlots: 2, correct: 3 };
    const inspected = gameReducer(inProgress, { type: 'reviewJump', phase: 'grammar', index: 1 });
    expect(inspected).toMatchObject({ phase: 'grammar', grammarIndex: 1, filledSlots: 0, correct: 0, grammarPlayed: false });
    expect(gameReducer(inspected, { type: 'reviewJump', phase: 'build', index: 2 }).sentenceIndex).toBe(2);
  });
});
