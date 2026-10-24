import { getPlayableGrammar, getUnitSentences, type AtomicUnit, type GrammarForm, type UnitSentence } from './unit';
import { readGrammarAttempts } from './grammarMemory';
import { practicedWordMeaning, readSentenceMemories, readWordMemories } from './memory';
import { grammarTricks } from './journeyTricks';
import { missingGrammarWords } from './learningModes';
import { lessonForForm, type GrammarLessonData, type LessonCheck } from './grammarLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';
import { searchKeysLesson } from './searchKeysPractice';
import { bedMakingLesson } from './bedMakingPractice';
import { computerPlayingLesson, computerPlayingSkill, preparedComputerPlayingPractice } from './computerPlayingPractice';
import { deskLocationLesson, deskLocationSkill, preparedDeskLocationPractice } from './deskLocationPractice';
import { dinnerCookingLesson, dinnerCookingSkill, preparedDinnerCookingPractice } from './dinnerCookingPractice';
import { kitchenLocationLesson, kitchenLocationSkill, preparedKitchenLocationPractice } from './kitchenLocationPractice';
import { teethBrushingLesson, teethBrushingSkill, preparedTeethBrushingPractice } from './teethBrushingPractice';
import { mirrorLocationLesson, mirrorLocationSkill, preparedMirrorLocationPractice } from './mirrorLocationPractice';
import { dogWalkingLesson, dogWalkingSkill, preparedDogWalkingPractice } from './dogWalkingPractice';
import { treeLocationLesson, treeLocationSkill, preparedTreeLocationPractice } from './treeLocationPractice';
import { meatCookingLesson, meatCookingSkill, preparedMeatCookingPractice } from './meatCookingPractice';

export interface GrammarArcadeRound { unit: AtomicUnit; form?: GrammarForm; skill: string; sentence: UnitSentence; slotIndex: number; slot: { en: string; es: string; choices: string[]; note?: string }; conceptual: boolean; situation?: LessonCheck }

/** Reuse the authored question and distractors, never invent the next grammar topic. */
export function grammarArcadeRounds(userId: string, units: AtomicUnit[], inspection = false, preparationSources: readonly AtomicUnit[] = units): GrammarArcadeRound[] {
  const attempts = readGrammarAttempts(userId);
  const sentences = readSentenceMemories(userId);
  const memories = readWordMemories(userId);
  const known = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => memory.key.toLowerCase()));
  return units.flatMap<GrammarArcadeRound>((unit) => {
    const preparedWord = (en: string) => {
      const word = unit.words.find((item) => item.en.trim().toLowerCase() === en.trim().toLowerCase());
      return word ? memories.some((memory) => practicedWordMeaning(memory, word)) : known.has(en.trim().toLowerCase());
    };
    if (unit.kind === 'grammar-lesson' && unit.grammarLesson) {
      const lesson = unit.grammarLesson;
      if (!inspection && unit.grammarPrerequisites?.vocabulary.some((word) => !preparedWord(word))) return [];
      return lesson.checks.filter((check) => check.kind !== 'write' && check.choices && (inspection || attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === lesson.id && attempt.check === check.id && attempt.correct)))
        .map((check, index) => ({ unit, skill: lesson.id, sentence: unit.sentence, slotIndex: index, slot: { en: check.answers[0], es: check.prompt, choices: check.choices!, note: check.hint }, conceptual: true, ...(check.situation ? { situation: check } : {}) }));
    }
    const checks = getPlayableGrammar(unit).flatMap((form) => {
      const prerequisites = grammarTricks(unit).find((trick) => trick.formId === form.id)?.vocabulary;
      if (!inspection && (!prerequisites || prerequisites.some((word) => !preparedWord(word)))) return [];
      const base = unit.words.find((word) => word.en.toLowerCase() === form.englishBase?.toLowerCase())?.es.toLowerCase();
      const computer = computerPlayingLesson(unit, form.id);
      const usedComputer = computer && preparedWord('computer') && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === computer.id && attempt.check === 'computer-meaning-v1' && attempt.correct);
      const desk = deskLocationLesson(unit, form.id);
      const usedDesk = desk && preparedWord('desk') && preparedDeskLocationPractice(unit, form.id, memories, attempts) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === desk.id && attempt.check === 'desk-meaning-v1' && attempt.correct);
      const dinner = dinnerCookingLesson(unit, form.id);
      const usedDinner = dinner && preparedDinnerCookingPractice(unit, form.id, memories) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dinner.id && attempt.check === 'dinner-meaning-v1' && attempt.correct);
      const kitchen = kitchenLocationLesson(unit, form.id);
      const usedKitchen = kitchen && preparedKitchenLocationPractice(unit, form.id, memories, attempts) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === kitchen.id && attempt.check === 'kitchen-meaning-v1' && attempt.correct);
      const teeth = teethBrushingLesson(unit, form.id);
      const usedTeeth = teeth && preparedTeethBrushingPractice(unit, form.id, memories) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === teeth.id && attempt.check === 'teeth-meaning-v1' && attempt.correct);
      const mirror = mirrorLocationLesson(unit, form.id);
      const usedMirror = mirror && preparedMirrorLocationPractice(unit, form.id, memories, attempts) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === mirror.id && attempt.check === 'mirror-meaning-v1' && attempt.correct);
      const dog = dogWalkingLesson(unit, form.id);
      const usedDog = dog && preparedDogWalkingPractice(unit, form.id, memories) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dog.id && attempt.check === 'dog-meaning-v1' && attempt.correct);
      const tree = treeLocationLesson(unit, form.id);
      const usedTree = tree && preparedTreeLocationPractice(unit, form.id, memories, attempts) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === tree.id && attempt.check === 'tree-meaning-v1' && attempt.correct);
      const meat = meatCookingLesson(unit, form.id);
      const usedMeat = meat && preparedMeatCookingPractice(unit, form.id, memories, attempts, preparationSources) && attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === meat.id && attempt.check === 'meat-meaning-v1' && attempt.correct);
      const preparedLessons = [usedComputer ? computer : null, usedDesk ? desk : null, usedDinner ? dinner : null, usedKitchen ? kitchen : null, usedTeeth ? teeth : null, usedMirror ? mirror : null, usedDog ? dog : null, usedTree ? tree : null, usedMeat ? meat : null].filter((lesson): lesson is GrammarLessonData => Boolean(lesson));
      const fallback = searchKeysLesson(unit, form.id) ?? bedMakingLesson(unit, form.id) ?? lessonForForm(form, base);
      const lessons = preparedLessons.length ? preparedLessons : fallback ? [fallback] : [];
      return lessons.flatMap((lesson) => lesson.checks.filter((check) => check.kind !== 'write' && check.choices && check.choices.length >= 2 && (inspection || attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === lesson.id && attempt.check === check.id && attempt.correct)))
        .map((check, index) => ({ unit, form, skill: lesson.id, sentence: unit.sentence, slotIndex: index, slot: { en: check.answers[0], es: check.prompt, choices: check.choices!, note: check.hint }, conceptual: true, ...(check.situation ? { situation: check } : {}) })));
    });
    const form = getPlayableGrammar(unit)[0];
    if (!form) return checks;
    // The new message does not prepare the legacy AT MY DESK distractor.
    const computerReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === computerPlayingSkill && attempt.correct)
      ? preparedComputerPlayingPractice(unit, form.id, memories)?.unit : null;
    const deskReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === deskLocationSkill && attempt.correct)
      ? preparedDeskLocationPractice(unit, form.id, memories, attempts)?.unit : null;
    const dinnerReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dinnerCookingSkill && attempt.correct)
      ? preparedDinnerCookingPractice(unit, form.id, memories)?.unit : null;
    const kitchenReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === kitchenLocationSkill && attempt.correct)
      ? preparedKitchenLocationPractice(unit, form.id, memories, attempts)?.unit : null;
    const teethReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === teethBrushingSkill && attempt.correct)
      ? preparedTeethBrushingPractice(unit, form.id, memories)?.unit : null;
    const mirrorReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === mirrorLocationSkill && attempt.correct)
      ? preparedMirrorLocationPractice(unit, form.id, memories, attempts)?.unit : null;
    const dogReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === dogWalkingSkill && attempt.correct)
      ? preparedDogWalkingPractice(unit, form.id, memories)?.unit : null;
    const treeReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === treeLocationSkill && attempt.correct)
      ? preparedTreeLocationPractice(unit, form.id, memories, attempts)?.unit : null;
    const meatReview = attempts.some((attempt) => attempt.unitId === unit.id && attempt.skill === meatCookingSkill && attempt.correct)
      ? preparedMeatCookingPractice(unit, form.id, memories, attempts, preparationSources)?.unit : null;
    return [...checks, ...getUnitSentences(meatReview ?? treeReview ?? dogReview ?? mirrorReview ?? teethReview ?? kitchenReview ?? dinnerReview ?? deskReview ?? computerReview ?? unit).filter((sentence) => inspection || !missingGrammarWords(unit, memories).length && sentences.some((memory) => memory.unitId === unit.id && normalizeSentenceAnswer(memory.sentenceEn) === normalizeSentenceAnswer(sentence.en)))
      .flatMap((sentence) => sentence.slots.map((slot, slotIndex) => ({ unit, form, skill: form.lesson?.id ?? form.id, sentence, slotIndex, slot, conceptual: false })))];
  });
}
