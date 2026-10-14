import type { AtomicUnit, AtomicWord } from './unit';
import { readSentenceMemories, readWordMemories, wordKey } from './memory';
import { readLearningActivities } from './learningActivity';

export interface MicroRound { unit: AtomicUnit; word: AtomicWord; phrase: { en: string; es: string; key: string }; options: string[]; due: boolean }
/** Real prior exposure is required. A catalogue entry/completion flag is not proof. */
export function microRounds(userId: string, units: AtomicUnit[], now = Date.now()): MicroRound[] {
  const words = readWordMemories(userId);
  const phrases = readSentenceMemories(userId);
  const rounds: MicroRound[] = [];
  for (const unit of units) {
    const taught = unit.words.flatMap((word) => {
      const memory = words.find((value) => value.key === wordKey(word));
      return memory && memory.word.bridge === word.bridge && memory.word.scene === word.scene && memory.word.es === word.es && memory.word.associationId === word.associationId && memory.word.associationVersion === word.associationVersion ? [memory] : [];
    });
    for (const memory of taught) {
      // Arcade repasa la palabra y su puente; no exige una frase ni vocabulario sin enseñar.
      const options = [...new Set([memory.word.en, ...words.filter((other) => other.key !== memory.key).map((other) => other.word.en)])].slice(0, 3);
      const phraseMemory = phrases.find((phrase) => phrase.unitId === unit.id && phrase.sentenceEn === unit.sentence.en);
      rounds.push({ unit, word: memory.word, phrase: phraseMemory ? { en: phraseMemory.sentenceEn, es: phraseMemory.sentenceEs, key: phraseMemory.key } : { en: unit.sentence.en, es: unit.sentence.es, key: '' }, options: options.length >= 2 ? options.reverse() : [], due: Date.parse(memory.nextReviewAt) <= now });
    }
  }
  return rounds.sort((a, b) => Number(b.due) - Number(a.due));
}
/** Contextual invitation: new learning or a due recall, not a fixed pop-up cadence. */
export function shouldOfferMicroArcade(userId: string, unitId: string, now = Date.now()): boolean {
  const events = readLearningActivities(userId).filter((event) => event.unitId === unitId);
  const lastArcade = events.filter((event) => event.activityId.startsWith('micro:')).at(-1);
  const newLearning = events.some((event) => !event.activityId.startsWith('micro:') && event.correct === true && (!lastArcade || event.at > lastArcade.at));
  const due = readSentenceMemories(userId).some((memory) => memory.unitId === unitId && Date.parse(memory.nextReviewAt) <= now);
  return newLearning || due;
}
