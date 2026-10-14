import { describe, it, expect } from 'vitest';
import raw from '../../content/keys-mission.json';
import { makeRecallChoices, validateUnit } from './unit';
import { gameReducer, initialGame } from './game';
import { contextualCorrection } from './learningActivity';

describe('misión de llaves', () => {
  it('tiene diálogo, cambio de papel y transferencia con vocabulario introducido', () => {
    const unit = validateUnit(raw);
    expect(unit.words.map((word) => word.en)).toEqual(['KEY', 'PHONE', 'POCKET', 'LOCK']);
    expect(unit.grammar[0].lesson?.steps).toHaveLength(2);
    expect(unit.grammar[0].lesson?.checks).toHaveLength(2);
    expect(unit.communication!.dialogue!.turns[0].acceptedAnswers).toContain('What are you looking for?');
    expect(unit.communication!.dialogue!.transfer!.acceptedAnswers).toContain("I'm looking for my phone.");
  });
  it('termina la recuperación al llegar a la segunda palabra, conservando las misiones de tres', () => {
    const state = { ...initialGame, phase: 'recall' as const, recallIndex: 1, recallAnswered: true };
    expect(gameReducer(state, { type: 'nextRecall', wordCount: 2 }).phase).toBe('reward');
    expect(gameReducer(state, { type: 'nextRecall' }).phase).toBe('recall');
  });
  it('permite revisar la cuarta palabra sin truncarla y limita las opciones a tres', () => {
    const unit = validateUnit(raw);
    const selected = gameReducer(initialGame, { type: 'reviewJump', phase: 'associate', index: 3 });
    expect(selected.wordIndex).toBe(3);
    const recall = gameReducer(selected, { type: 'reviewJump', phase: 'recall', index: 3 });
    expect(recall.recallIndex).toBe(3);
    expect(makeRecallChoices(unit, 3, 42)).toHaveLength(3);
    expect(makeRecallChoices(unit, 3, 42).some((word: { en: string }) => word.en === 'LOCK')).toBe(true);
  });
  it('corrige la pieza que falta y no atribuye un fallo a un acento', () => {
    expect(contextualCorrection('I looking for my keys', "I'm looking for my keys")).toContain('Falta AM');
    expect(contextualCorrection("I'm looking my keys", "I'm looking for my keys")).toContain('falta FOR');
  });
  it('rechaza una transferencia sin contexto o con una respuesta no revisada', () => {
    const broken = structuredClone(raw);
    broken.communication.dialogue.transferContext = '';
    expect(() => validateUnit(broken)).toThrow('transferencia');
  });
});
