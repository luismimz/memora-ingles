import { beforeEach, expect, it, vi } from 'vitest';
import { grammarArcadeRounds } from './grammarArcadeRounds';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from './grammarLesson';
import { recordGrammarAttempt } from './grammarMemory';
import { recordSentenceExposure } from './memory';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('el catálogo no habilita preguntas; solo reutiliza el chequeo correcto ya practicado', () => {
  expect(grammarArcadeRounds('learner', [previewUnit])).toEqual([]);
  const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
  const check = lesson.checks[0];
  recordGrammarAttempt('learner', { unitId: previewUnit.id, skill: lesson.id, check: check.id, kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  const rounds = grammarArcadeRounds('learner', [previewUnit]);
  expect(rounds).toHaveLength(1);
  expect(rounds[0].conceptual).toBe(true);
  expect(rounds[0].slot.es).toBe(check.prompt);
  expect(rounds[0].slot.choices).toEqual(check.choices);
  expect(rounds[0].slot.note).toBe(check.hint);
});
it('no incluye las frases ampliadas hasta que se hayan enseñado realmente', () => {
  recordSentenceExposure('learner', previewUnit.id, previewUnit.sentence);
  const rounds = grammarArcadeRounds('learner', [previewUnit]);
  expect(rounds).toHaveLength(previewUnit.sentence.slots.length);
  expect(rounds.every((round) => !round.conceptual && round.sentence.en === previewUnit.sentence.en)).toBe(true);
});
