import { expect, it } from 'vitest';
import { previewUnit as source } from '../preview/previewUnit';
import { computerPlayingLesson, preparedComputerPlayingPractice } from './computerPlayingPractice';
import { grammarChecksForExperience, validateGrammarLesson } from './grammarLesson';
import { validateUnit } from './unit';
import type { WordMemory } from './memory';
const memories = source.words.map((word) => ({ key: word.en.toLowerCase(), correct: 1, word })) as WordMemory[];
it('prepara MY y ON MY COMPUTER antes de comprender, montar y escribir un único aviso', () => {
  const before = JSON.stringify(source);
  const prepared = preparedComputerPlayingPractice(source, 'ing', memories)!;
  expect(prepared).not.toBeNull();
  expect(() => validateGrammarLesson(prepared.lesson)).not.toThrow();
  expect(() => validateUnit(prepared.unit)).not.toThrow();
  expect(prepared.lesson.steps[3].en.map((part) => part.text).join('')).toBe('MY COMPUTER');
  expect(prepared.lesson.steps[4].caption).toContain('no traduce siempre');
  expect([2, 3, 1, 0].map((i) => prepared.lesson.checks[0].ordering![i].text).join(' ')).toBe('I AM PLAYING ON MY COMPUTER');
  expect(grammarChecksForExperience(prepared.lesson, [prepared.unit.sentence.en], [prepared.unit.sentence.en]).map((check) => check.id)).toEqual(['computer-meaning-v1', 'computer-repair-am-v1']);
  expect(prepared.unit.practiceSentences).toEqual([]);
  expect(prepared.unit.communication?.dialogue?.partnerLanguage).toBe('es');
  expect(JSON.stringify(source)).toBe(before);
});
it('no confunde PLAY practicado con COMPUTER preparado, ni reemplaza otra autoría o sentido', () => {
  expect(preparedComputerPlayingPractice(source, 'ing', memories.slice(0, 1))).toBeNull();
  expect(preparedComputerPlayingPractice(source, 'ing', memories.map((memory) => ({ ...memory, word: { ...memory.word, es: 'otro sentido' } })))).toBeNull();
  expect(preparedComputerPlayingPractice({ ...source, words: source.words.map((word) => ({ ...word, associationVersion: 9 })) }, 'ing', memories)).toBeNull();
  expect(computerPlayingLesson({ ...source, id: 'another' }, 'ing')).toBeNull();
  expect(computerPlayingLesson({ ...source, sentence: { ...source.sentence, en: 'An authored replacement.' } }, 'ing')).toBeNull();
  expect(computerPlayingLesson({ ...source, grammarContinuation: { status: 'needs_review', formId: 'ing', vocabulary: ['play'], grammarSkills: [] } }, 'ing')).toBeNull();
});
