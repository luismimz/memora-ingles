import { beforeEach, expect, it, vi } from 'vitest';
import { grammarArcadeRounds } from './grammarArcadeRounds';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from './grammarLesson';
import { recordGrammarAttempt } from './grammarMemory';
import { recordSentenceExposure, recordWordRecall } from './memory';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('el catálogo no habilita preguntas; solo reutiliza el chequeo correcto ya practicado', () => {
  expect(grammarArcadeRounds('learner', [previewUnit])).toEqual([]);
  const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
  const check = lesson.checks.find((check) => check.id === 'meaning-now-v1')!;
  recordWordRecall('learner', previewUnit.words[0], 'quick');
  recordGrammarAttempt('learner', { unitId: previewUnit.id, skill: lesson.id, check: check.id, kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  const rounds = grammarArcadeRounds('learner', [previewUnit]);
  expect(rounds).toHaveLength(1);
  expect(rounds[0].conceptual).toBe(true);
  expect(rounds[0].slot.es).toBe(check.prompt);
  expect(rounds[0].slot.choices).toEqual(check.choices);
  expect(rounds[0].slot.note).toBe(check.hint);
  expect(rounds[0].situation).toEqual(check);
  expect(grammarArcadeRounds('learner', [{ ...previewUnit, words: previewUnit.words.map((word, index) => index ? word : { ...word, es: 'interpretar una obra' }) }])).toEqual([]);
});
it('no incluye las frases ampliadas hasta que se hayan enseñado realmente', () => {
  for (const word of previewUnit.words) recordWordRecall('learner', word, 'quick');
  recordSentenceExposure('learner', previewUnit.id, previewUnit.sentence);
  const rounds = grammarArcadeRounds('learner', [previewUnit]);
  expect(rounds).toHaveLength(previewUnit.sentence.slots.length);
  expect(rounds.every((round) => !round.conceptual && round.sentence.en === previewUnit.sentence.en)).toBe(true);
});
it('los trucos independientes entran en Arcade solo después de su práctica real', () => {
  const lesson = { ...lessonForForm(previewUnit.grammar[0], 'jugar')!, id: 'independent-lesson' };
  const source = { ...previewUnit, id: 'standalone', kind: 'grammar-lesson' as const, grammar: [], grammarLesson: lesson, grammarPrerequisites: { vocabulary: ['play'] } };
  expect(grammarArcadeRounds('learner', [source])).toEqual([]);
  recordGrammarAttempt('learner', { unitId: source.id, skill: lesson.id, check: 'meaning-now-v1', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
  expect(grammarArcadeRounds('learner', [source])).toEqual([]);
  recordWordRecall('learner', previewUnit.words[0], 'quick');
  const rounds = grammarArcadeRounds('learner', [source]);
  expect(rounds).toHaveLength(1); expect(rounds[0].skill).toBe(lesson.id); expect(rounds[0].form).toBeUndefined();
});
