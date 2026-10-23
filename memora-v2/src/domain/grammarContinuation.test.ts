import { expect, it } from 'vitest';
import { contextualProcessFixture as unit } from '../test/contextualProcessFixture';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { preparedGrammarContinuation, preparedActionPractice } from './grammarContinuation';
import { validateUnit } from './unit';
import { grammarChecksForExperience, lessonForForm } from './grammarLesson';
import type { WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { grammarTricks, missingTrickWords, trickStop } from './journeyTricks';

const memories = [{ key: 'play', correct: 1, word: unit.words[0] }] as WordMemory[];
it.each(['brush', 'cook'])('la aplicación de %s exige su sentido y forma exactos y deja intactas sus piezas fuente', (base) => {
  const source = reviewUnits.find((item) => item.grammar.some((form) => form.englishBase === base) && !item.grammar[0].lesson && item.words.some((word) => word.en.toLowerCase() === base))!;
  const word = source.words.find((item) => item.en.toLowerCase() === base)!;
  const own = [{ key: base, correct: 1, word }] as WordMemory[];
  const before = JSON.stringify(source);
  const practice = preparedActionPractice(source, 'ing', own)!;
  expect(practice.sentence.en).toBe(`I am ${source.grammar[0].english}.`);
  expect(() => validateUnit(practice)).not.toThrow();
  expect(preparedActionPractice(source, 'ing', memories)).toBeNull();
  expect(preparedActionPractice(source, 'ing', [{ ...own[0], word: { ...word, es: 'otro sentido' } }])).toBeNull();
  expect(preparedActionPractice({ ...source, grammar: [{ ...source.grammar[0], english: 'playing' }] }, 'ing', own)).toBeNull();
  expect(JSON.stringify(source)).toBe(before);
});
it('el tramo público de PLAY usa solo la frase ya enseñada, preserva la fuente y no aprueba un borrador', () => {
  const before = JSON.stringify(previewUnit);
  const practice = preparedActionPractice(previewUnit, 'ing', memories)!;
  expect(practice.id).toBe(previewUnit.id);
  expect(practice.contentVersion).toBe(previewUnit.contentVersion);
  expect(practice.grammarContinuation).toBeUndefined();
  expect(practice.sentence.en).toBe('I am playing.');
  expect(practice.sentence.slots.flatMap((slot) => slot.choices).every((value) => ['I', 'am', 'playing.'].includes(value))).toBe(true);
  expect(practice.practiceSentences).toEqual([]);
  expect(practice.communication!.dialogue!.partnerLanguage).toBe('es');
  expect(() => validateUnit(practice)).not.toThrow();
  expect(preparedActionPractice(previewUnit, 'ing', [])).toBeNull();
  expect(preparedActionPractice({ ...unit, grammarContinuation: { ...unit.grammarContinuation!, status: 'needs_review' } }, 'ing', memories)).toBeNull();
  expect(preparedActionPractice({ ...previewUnit, words: previewUnit.words.map((word, index) => index ? word : { ...word, es: 'tocar un instrumento' }) }, 'ing', memories)).toBeNull();
  expect(JSON.stringify(previewUnit)).toBe(before);
});
it('solo enlaza opt-in revisado, sentido y habilidades realmente preparados, sin modificar memoria', () => {
  const before = JSON.stringify(memories);
  expect(preparedGrammarContinuation(previewUnit, 'ing', memories, [])).toBe(false);
  expect(preparedGrammarContinuation(unit, 'ing', [], [])).toBe(false);
  expect(preparedGrammarContinuation(unit, 'ing', [{ ...memories[0], correct: 0 }], [])).toBe(false);
  expect(preparedGrammarContinuation(unit, 'ing', [{ ...memories[0], word: { ...unit.words[0], es: 'obra de teatro' } }], [])).toBe(false);
  expect(preparedGrammarContinuation(unit, 'ing', memories, [])).toBe(true);
  expect(preparedGrammarContinuation({ ...unit, grammarContinuation: { ...unit.grammarContinuation!, status: 'needs_review' } }, 'ing', memories, [])).toBe(false);
  expect(preparedGrammarContinuation({ ...unit, grammarContinuation: { ...unit.grammarContinuation!, status: undefined } }, 'ing', memories, [])).toBe(false);
  const needsSkill = { ...unit, grammarContinuation: { ...unit.grammarContinuation!, grammarSkills: ['present-continuous:play'] } };
  expect(preparedGrammarContinuation(needsSkill, 'ing', memories, [{ skill: 'present-continuous:play', kind: 'write', correct: true, helped: true }] as GrammarAttempt[])).toBe(false);
  expect(preparedGrammarContinuation(needsSkill, 'ing', memories, [{ skill: 'present-continuous:play', kind: 'write', correct: true, helped: false }] as GrammarAttempt[])).toBe(true);
  expect(JSON.stringify(memories)).toBe(before);
});
it('rechaza una pregunta inglesa, distractor nuevo, repetición o pieza sin preparar dentro del episodio', () => {
  expect(() => validateUnit({ ...unit, communication: { ...unit.communication, dialogue: { ...unit.communication!.dialogue, partnerLanguage: 'en' } } })).toThrow(/pregunta inglesa/);
  expect(() => validateUnit({ ...unit, communication: { ...unit.communication, dialogue: { ...unit.communication!.dialogue, roleSwap: true } } })).toThrow(/sin preparar/);
  expect(() => validateUnit({ ...unit, sentence: { ...unit.sentence, slots: unit.sentence.slots.map((slot, index) => index ? slot : { ...slot, choices: ['I', 'tomorrow'] }) } })).toThrow(/distractor/);
  expect(() => validateUnit({ ...unit, sentence: { ...unit.sentence, slots: unit.sentence.slots.map((slot) => ({ ...slot, preparation: [{ en: 'my', es: 'mi', explanation: 'Otra pieza.' }] })) } })).toThrow(/novedades ocultas/);
  expect(() => validateUnit({ ...unit, practiceSentences: [unit.sentence] })).toThrow(/mismo mensaje/);
});
it('delega construcción y escritura al episodio manteniendo comprensión y el coach legacy intacto', () => {
  const lesson = lessonForForm(unit.grammar[0], 'jugar')!;
  const checks = grammarChecksForExperience(lesson, unit.communication!.dialogue!.turns[1].acceptedAnswers, [unit.sentence.en]);
  expect(checks.map((check) => check.id)).toEqual(['meaning-now-v1']);
  expect(grammarChecksForExperience(lesson)).toEqual(lesson.checks);
});
it('Inicio incluye también los requisitos del contexto aprobado, no los de un borrador', () => {
  const context = { ...unit, grammarContinuation: { ...unit.grammarContinuation!, vocabulary: ['play', 'desk'] } };
  const descriptor = grammarTricks(context)[0];
  expect(descriptor.vocabulary).toEqual(['play', 'desk']);
  expect(missingTrickWords(trickStop(context, descriptor), memories)).toEqual(['desk']);
  expect(grammarTricks({ ...context, grammarContinuation: { ...context.grammarContinuation, status: 'needs_review' } })[0].vocabulary).toEqual(['play']);
});
