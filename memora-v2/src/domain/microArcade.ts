import type { AtomicUnit, AtomicWord } from './unit';
import { readSentenceMemories, readWordMemories, wordKey } from './memory';
import { readLearningActivities } from './learningActivity';
import type { LearningActivity } from './learningActivity';
import type { WordMemory } from './memory';
import type { UnitSummary } from '../services/directus';

export function arcadeCandidateIds(units: readonly UnitSummary[], memories: readonly WordMemory[], activities: readonly LearningActivity[], currentId?: string, now = Date.now()): string[] {
  const byWord = new Map(memories.map((memory) => [memory.key, memory]));
  const touched = new Map<string, number>();
  for (const activity of activities.filter((item) => item.source === 'learner')) touched.set(activity.unitId, Math.max(touched.get(activity.unitId) ?? 0, Date.parse(activity.at) || 0));
  const candidates = units.flatMap((unit) => {
    if (!touched.has(unit.id)) return [];
    const words = unit.words?.flatMap((word) => byWord.get(word.en.trim().toLowerCase()) ?? []) ?? [];
    const due = Math.min(...words.map((memory) => Date.parse(memory.nextReviewAt)).filter(Number.isFinite));
    return [{ id: unit.id, due, touched: touched.get(unit.id) ?? 0 }];
  });
  const due = candidates.filter((candidate) => candidate.due <= now).sort((left, right) => left.due - right.due || left.id.localeCompare(right.id)).map((candidate) => candidate.id);
  const recent = [...candidates].sort((left, right) => right.touched - left.touched || left.id.localeCompare(right.id)).map((candidate) => candidate.id);
  return [...new Set([...(currentId ? [currentId] : []), ...due.slice(0, 6), ...recent, ...due.slice(6)])].slice(0, 12);
}

export interface MicroRound { unit: AtomicUnit; word: AtomicWord; phrase: { en: string; es: string; key: string }; options: string[]; due: boolean; pendingModel?: boolean }
/** Real prior exposure is required. A catalogue entry/completion flag is not proof. */
export function microRounds(userId: string, units: AtomicUnit[], now = Date.now()): MicroRound[] {
  const words = readWordMemories(userId);
  const phrases = readSentenceMemories(userId);
  const activities = readLearningActivities(userId);
  const rounds: MicroRound[] = [];
  const included = new Set<string>();
  for (const unit of units) {
    const taught = unit.words.flatMap((word) => {
      const memory = words.find((value) => value.key === wordKey(word));
      if (memory && memory.word.bridge === word.bridge && memory.word.scene === word.scene && memory.word.es === word.es && memory.word.associationId === word.associationId && memory.word.associationVersion === word.associationVersion) return [{ key: memory.key, word, due: Date.parse(memory.nextReviewAt) <= now, pendingModel: memory.correct === 0 }];
      // A consulted model is teaching evidence, not a missed recall or a second SRS.
      // Legacy events without a snapshot cannot silently approve changed content.
      const model = activities.some((activity) => {
        const snapshot = activity.wordSnapshot;
        return activity.unitId === unit.id && activity.contentVersion === (unit.contentVersion ?? '1') && activity.activityId === `active-recall:${word.en}` && activity.phase === 'arcade' && activity.source === 'learner' && activity.correct === null && activity.helped && activity.response === '(pasó con modelo)' && activity.expected === word.en && activity.prompt === word.es && snapshot &&
          snapshot.en === word.en && snapshot.es === word.es && snapshot.bridge === word.bridge && snapshot.scene === word.scene && snapshot.associationId === word.associationId && snapshot.associationVersion === word.associationVersion;
      });
      return model ? [{ key: wordKey(word), word, due: false, pendingModel: true }] : [];
    });
    for (const memory of taught) {
      if (included.has(memory.key)) continue;
      included.add(memory.key);
      // Arcade repasa la palabra y su puente; no exige una frase ni vocabulario sin enseñar.
      const options = [...new Set([memory.word.en, ...taught.filter((other) => other.key !== memory.key).map((other) => other.word.en), ...words.filter((other) => other.key !== memory.key).map((other) => other.word.en)])].slice(0, 3);
      const phraseMemory = phrases.find((phrase) => phrase.unitId === unit.id && phrase.sentenceEn === unit.sentence.en);
      rounds.push({ unit, word: memory.word, phrase: phraseMemory ? { en: phraseMemory.sentenceEn, es: phraseMemory.sentenceEs, key: phraseMemory.key } : { en: unit.sentence.en, es: unit.sentence.es, key: '' }, options: options.length >= 2 ? options.reverse() : [], due: memory.due, ...(memory.pendingModel ? { pendingModel: true } : {}) });
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
