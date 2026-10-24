import { expect, it } from 'vitest';
import { previewUnit as unit } from '../preview/previewUnit';
import { deskLocationLesson, preparedDeskLocationPractice } from './deskLocationPractice';
import { computerPlayingSkill } from './computerPlayingPractice';
import { validateGrammarLesson, grammarChecksForExperience } from './grammarLesson';
import { validateUnit } from './unit';
import type { WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
const memories = unit.words.map((word) => ({ key: word.en.toLowerCase(), correct: 1, word })) as WordMemory[];
const prior = [{ unitId: unit.id, skill: computerPlayingSkill, kind: 'write', correct: true, helped: false }] as GrammarAttempt[];
it('enseña ubicación AT MY DESK, sin evaluar encima del tablero o AT=EN universal', () => {
  const prepared = preparedDeskLocationPractice(unit, 'ing', memories, prior)!;
  expect(() => validateGrammarLesson(prepared.lesson)).not.toThrow();
  expect(() => validateUnit(prepared.unit)).not.toThrow();
  expect(prepared.lesson.steps[4].caption).toContain('no traduce cualquier');
  expect([2,3,1,0].map((index) => prepared.lesson.checks[0].ordering![index].text).join(' ')).toBe('I AM PLAYING AT MY DESK');
  expect(grammarChecksForExperience(prepared.lesson, [prepared.unit.sentence.en], [prepared.unit.sentence.en]).map((check) => check.id)).toEqual(['desk-meaning-v1']);
  expect(prepared.unit.practiceSentences).toEqual([]);
  expect(prepared.unit.communication?.dialogue?.partnerLanguage).toBe('es');
});
it('requiere uso previo sin ayuda del bloque de ordenador y los sentidos/versiones de las tres palabras', () => {
  expect(preparedDeskLocationPractice(unit, 'ing', memories, [])).toBeNull();
  expect(preparedDeskLocationPractice(unit, 'ing', memories, prior.map((attempt) => ({ ...attempt, helped: true })))).toBeNull();
  expect(preparedDeskLocationPractice(unit, 'ing', memories.slice(0,2), prior)).toBeNull();
  expect(preparedDeskLocationPractice(unit, 'ing', memories.map((memory) => ({ ...memory, word: { ...memory.word, es: 'otro' } })), prior)).toBeNull();
  expect(preparedDeskLocationPractice({ ...unit, words: unit.words.map((word) => ({ ...word, associationVersion: 99 })) }, 'ing', memories, prior)).toBeNull();
  expect(deskLocationLesson({ ...unit, practiceSentences: [] }, 'ing')).toBeNull();
});
