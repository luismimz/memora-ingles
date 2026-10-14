import { describe, it, expect } from 'vitest';
import raw from '../../content/keys-mission.json';
import { reviewUnits } from '../preview/previewUnit';
import { validateUnit } from './unit';
import { acceptedConversationAnswer, conversationTurns, followingConversationTurn } from './conversation';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import { grammarChecksForExperience } from './grammarLesson';

describe('intercambio escrito dentro del chat', () => {
  it('pregunta primero, espera respuesta y transfiere sin exigir una pregunta no enseñada', () => {
    const turns = conversationTurns(validateUnit(raw));
    expect(turns.map((turn) => turn.id)).toEqual(['respond', 'transfer']);
    expect(turns[0].prompt?.en).toBe('What are you looking for?');
    expect(turns[0].reply.es).toBe('Busquemos juntos.');
    expect(turns[1].expected.en).toBe("I'm looking for my phone.");
    expect(followingConversationTurn(1, turns.length)).toBeNull();
  });
  it('termina también los diálogos existentes sin transferencia', () => {
    const unit = validateUnit(structuredClone(raw));
    delete unit.communication!.dialogue!.transfer; delete unit.communication!.dialogue!.transferContext;
    expect(conversationTurns(unit)).toHaveLength(1);
    expect(followingConversationTurn(0, 1)).toBeNull();
  });
  it('admite la contracción expandida, pero no aprobaría una frase sin FOR', () => {
    const expected = normalizeSentenceAnswer("I'm looking for my keys.");
    expect(normalizeSentenceAnswer('I am looking for my keys')).toBe(expected);
    expect(normalizeSentenceAnswer("I'm looking my keys")).not.toBe(expected);
  });
  it('solo traslada al chat la escritura que realmente está presente allí', () => {
    const unit = validateUnit(raw);
    const lesson = unit.grammar[0].lesson!;
    const answers = conversationTurns(unit).flatMap((turn) => turn.expected.acceptedAnswers);
    expect(grammarChecksForExperience(lesson, answers).map((check) => check.id)).toEqual(['teach']);
    expect(grammarChecksForExperience(lesson, ['Una respuesta diferente']).map((check) => check.id)).toContain('use');
    expect(grammarChecksForExperience(lesson).map((check) => check.id)).toContain('use');
  });
  it('solo activa el cambio de papel cuando la gramática de la pregunta se ha demostrado', () => {
    const unit = validateUnit(structuredClone(raw));
    unit.communication!.dialogue!.roleSwap = true;
    unit.communication!.dialogue!.questionSkillId = 'question:what-are-you-doing';
    expect(conversationTurns(unit).map((turn) => turn.id)).toEqual(['respond', 'transfer']);
    expect(conversationTurns(unit, new Set(['question:what-are-you-doing'])).map((turn) => turn.id)).toEqual(['respond', 'ask', 'transfer']);
  });
  it('acepta las respuestas revisadas de la misión en la primera réplica, sin ampliarlas a otros turnos', () => {
    const kitchen = validateUnit(reviewUnits.find((unit) => unit.id === 'm1-test-kitchen')!);
    kitchen.communication!.dialogue!.roleSwap = true;
    kitchen.communication!.dialogue!.questionSkillId = 'question:what-are-you-doing';
    const turns = conversationTurns(kitchen, new Set(['question:what-are-you-doing']));
    expect(acceptedConversationAnswer(kitchen, turns[0], "I'm cooking dinner in the kitchen.")).toBe(true);
    expect(acceptedConversationAnswer(kitchen, turns[1], "I'm cooking dinner in the kitchen.")).toBe(false);
  });
});
