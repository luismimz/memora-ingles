import { getPlayableGrammar, getUnitSentences, type AtomicUnit } from './unit';
import { readGrammarAttempts } from './grammarMemory';
import { readSentenceMemories, readWordMemories } from './memory';
import { grammarTricks } from './journeyTricks';
import { missingGrammarWords } from './learningModes';
import { lessonForForm } from './grammarLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';

/** Reuse the authored question and distractors, never invent the next grammar topic. */
export function grammarArcadeRounds(userId: string, units: AtomicUnit[], inspection = false) {
  const attempts = readGrammarAttempts(userId);
  const sentences = readSentenceMemories(userId);
  const memories = readWordMemories(userId);
  const known = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => memory.key.toLowerCase()));
  return units.flatMap((unit) => {
    const checks = getPlayableGrammar(unit).flatMap((form) => {
      const prerequisites = grammarTricks(unit).find((trick) => trick.formId === form.id)?.vocabulary;
      if (!inspection && (!prerequisites || prerequisites.some((word) => !known.has(word)))) return [];
      const base = unit.words.find((word) => word.en.toLowerCase() === form.englishBase?.toLowerCase())?.es.toLowerCase();
      const lesson = lessonForForm(form, base);
      return lesson?.checks.filter((check) => check.kind !== 'write' && check.choices && check.choices.length >= 2 && (inspection || attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === lesson.id && attempt.check === check.id && attempt.correct)))
        .map((check, index) => ({ unit, form, sentence: unit.sentence, slotIndex: index, slot: { en: check.answers[0], es: check.prompt, choices: check.choices!, note: check.hint }, conceptual: true })) ?? [];
    });
    const form = getPlayableGrammar(unit)[0];
    if (!form) return checks;
    return [...checks, ...getUnitSentences(unit).filter((sentence) => inspection || !missingGrammarWords(unit, memories).length && sentences.some((memory) => memory.unitId === unit.id && normalizeSentenceAnswer(memory.sentenceEn) === normalizeSentenceAnswer(sentence.en)))
      .flatMap((sentence) => sentence.slots.map((slot, slotIndex) => ({ unit, form, sentence, slotIndex, slot, conceptual: false })))];
  });
}
