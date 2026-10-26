import { describe, it, expect } from 'vitest';
import { grammarChecksForExperience, lessonForForm, validateGrammarLesson } from './grammarLesson';
import { grammarExamples } from '../preview/grammarExamples';
import { previewUnit } from '../preview/previewUnit';

describe('trucos que se comprueban y se usan', () => {
  it('difiere solo el montaje coincidente y permite conservar una tarea ya iniciada', () => {
    const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
    expect(grammarChecksForExperience(lesson, [], ['I am playing.']).map((check) => check.id)).toEqual(['meaning-now-v1', 'use']);
    expect(grammarChecksForExperience(lesson, [], ['I am playing.'], 'order-message-v1')).toEqual(lesson.checks);
    expect(grammarChecksForExperience(lesson, [], ['I am cooking.'])).toEqual(lesson.checks);
  });
  it('separa el objetivo visible de las instrucciones de mover piezas', () => {
    const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
    expect(lesson.checks[0].prompt).toBe('Estoy jugando.');
    expect(lesson.checks[0].answers).toEqual(['I am playing']);
    expect(lesson.steps).toHaveLength(3);
  });
  it('separa mensaje español de consigna sin exigir migrar lecciones antiguas', () => {
    const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
    expect(lesson.checks[2].targetEs).toBe('Estoy jugando.');
    const legacy = structuredClone(lesson); delete legacy.checks[2].targetEs;
    expect(() => validateGrammarLesson(legacy)).not.toThrow();
    const empty = structuredClone(lesson); empty.checks[2].targetEs = ' ';
    expect(() => validateGrammarLesson(empty)).toThrow('objetivo escrito');
    const mixed = structuredClone(lesson); mixed.checks[0].targetEs = 'Estoy jugando.';
    expect(() => validateGrammarLesson(mixed)).toThrow('objetivo escrito');
  });
  it.each([
    ['brush', 'brushing', 'cepillar', 'cepillando', 'brushing', 'brush-ready'],
    ['cook', 'cooking', 'cocinar', 'cocinando', 'cooking', 'cook-ready'],
  ])('prepara escenas distintas para %s sin ampliar el inglés exigido', (base, action, baseEs, actionEs, active, waiting) => {
    const form = { ...previewUnit.grammar[0], englishBase: base, english: action, englishRoot: base, englishNut: 'ing', spanish: actionEs, spanishStem: actionEs.slice(0, -4), spanishEnding: 'ando', subjects: [{ en: "I'm", expandedEn: 'I am', es: 'Yo estoy', phrase: `I'm ${action}` }] };
    const lesson = lessonForForm(form, baseEs)!;
    expect(() => validateGrammarLesson(lesson)).not.toThrow();
    expect(lesson.checks[1].situation).toEqual({ message: `I am ${action}`, scenes: [
      { choice: `Estoy ${actionEs} ahora.`, state: active }, { choice: `Todavía no estoy ${actionEs}.`, state: waiting },
    ] });
    expect(lessonForForm(form, 'otro sentido')!.checks[1].situation).toBeUndefined();
    const mixed = structuredClone(lesson); mixed.checks[1].situation!.scenes[1].state = 'waiting';
    expect(() => validateGrammarLesson(mixed)).toThrow();
  });
  it('exige comprensión y producción en cada estructura de ejemplo', () => {
    for (const lesson of grammarExamples) expect(() => validateGrammarLesson(lesson)).not.toThrow();
    expect(() => validateGrammarLesson({ ...grammarExamples[0], checks: grammarExamples[0].checks.slice(0, 1) })).toThrow();
  });
  it('crea el truco continuo con las piezas del verbo, no del sustantivo', () => {
    const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
    expect(lesson.steps.at(-1)!.en.map((piece) => piece.text).join('')).toBe("I'm playing");
    expect(lesson.checks.at(-1)!.answers).toContain('I am playing');
    expect(lessonForForm({ ...previewUnit.grammar[0], id: 'unknown', visualContract: 'unknown' }, 'jugar')).toBeNull();
  });
  it('sustituye la pregunta de regla desde el primer encuentro por piezas enseñadas y escritura', () => {
    const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
    expect(() => validateGrammarLesson(lesson)).not.toThrow();
    expect(lesson.checks.map((check) => check.id)).toEqual(['order-message-v1', 'meaning-now-v1', 'use']);
    expect(JSON.stringify(lesson)).not.toContain('¿Qué falta?');
    expect(lesson.checks[0].ordering?.map((part) => part.text)).toEqual(['PLAYING', 'I', 'AM']);
    expect(lesson.checks[2].hint).toContain('I + AM');
    expect(() => validateGrammarLesson({ ...lesson, checks: [lesson.checks[2]] })).toThrow();
  });
  it('el mensaje preparado de jugar permite elegir una escena sin atribuirla a otras acciones', () => {
    const form = previewUnit.grammar[0];
    const lesson = lessonForForm(form, 'jugar')!;
    expect(() => validateGrammarLesson(lesson)).not.toThrow();
    expect(lesson.checks[1].situation).toEqual({ message: 'I am playing', scenes: [
      { choice: 'Estoy jugando ahora.', state: 'playing' },
      { choice: 'Todavía no estoy jugando.', state: 'waiting' },
    ] });
    expect(lessonForForm({ ...form, englishBase: 'read', english: 'reading', spanish: 'leyendo' }, 'leer')!.checks[1].situation).toBeUndefined();
    expect(lessonForForm({ ...form, spanish: 'bailando' }, 'jugar')!.checks[1].situation).toBeUndefined();
  });
});
