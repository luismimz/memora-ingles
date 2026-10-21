import { describe, it, expect } from 'vitest';
import raw from '../../content/keys-mission.json';
import { reviewUnits } from '../preview/previewUnit';
import { validateUnit } from './unit';
import { acceptedConversationAnswer, conversationPracticeAnswers, conversationTurns, demonstratedConversationQuestionSkills, followingConversationTurn } from './conversation';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import { grammarChecksForExperience } from './grammarLesson';

describe('intercambio escrito dentro del chat', () => {
  it('solo difiere escrituras de los turnos realmente previstos para el alumno, no del personaje', () => {
    const unit = validateUnit(structuredClone(raw));
    const dialogue = unit.communication!.dialogue!;
    dialogue.roleSwap = true; dialogue.questionSkillId = 'question:look-for';
    const question = dialogue.turns[0].en;
    expect(conversationPracticeAnswers(unit)).not.toContain(question);
    expect(conversationPracticeAnswers(unit)).toContain(dialogue.turns[1].en);
    expect(conversationPracticeAnswers(unit)).toContain(dialogue.transfer!.en);
    const pending = grammarChecksForExperience({ ...unit.grammar[0].lesson!, checks: [
      ...unit.grammar[0].lesson!.checks,
      { id: 'ask', kind: 'write', prompt: 'Pregunta', answers: [question], hint: 'Ayuda', success: 'Listo' },
    ] }, conversationPracticeAnswers(unit));
    expect(pending.map((check) => check.id)).toContain('ask');
    expect(pending.map((check) => check.id)).not.toContain('use');
    expect(conversationPracticeAnswers(unit, new Set(['question:look-for']))).toContain(question);
  });
  it('usa el mismo umbral de escritura independiente que el chat para activar preguntas', () => {
    const base = { unitId: 'u', check: 'q', at: '2026-10-21T17:00:00Z' };
    const skills = demonstratedConversationQuestionSkills([
      { ...base, skill: 'correct', kind: 'write', correct: true, helped: false },
      { ...base, skill: 'helped', kind: 'write', correct: true, helped: true },
      { ...base, skill: 'choice', kind: 'choose', correct: true, helped: false },
      { ...base, skill: 'wrong', kind: 'write', correct: false, helped: false },
    ]);
    expect([...skills]).toEqual(['correct']);
  });
  it('incluye variantes aceptadas solo si corresponden al primer intercambio real', () => {
    const unit = validateUnit(structuredClone(raw));
    unit.communication!.acceptedAnswers = ['Mi variante revisada.'];
    expect(conversationPracticeAnswers(unit)).toContain('Mi variante revisada.');
    unit.communication!.practicePrompt = 'Una pregunta diferente.';
    expect(conversationPracticeAnswers(unit)).not.toContain('Mi variante revisada.');
    delete unit.communication!.dialogue;
    expect(conversationPracticeAnswers(unit)).toEqual([]);
  });
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
