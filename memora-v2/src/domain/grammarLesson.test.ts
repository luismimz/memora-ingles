import { describe, it, expect } from 'vitest';
import { lessonForForm, validateGrammarLesson } from './grammarLesson';
import { grammarExamples } from '../preview/grammarExamples';
import { previewUnit } from '../preview/previewUnit';

describe('trucos que se comprueban y se usan', () => {
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
});
