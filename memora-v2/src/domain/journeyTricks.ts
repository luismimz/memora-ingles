import type { UnitSummary } from '../services/directus';
import type { AtomicUnit } from './unit';
import { getPlayableGrammar } from './unit';
import { lessonForForm } from './grammarLesson';
import { orderedJourneyUnits } from './journey';
import type { LearningActivity } from './learningActivity';
import type { WordMemory } from './memory';
import { practicedWordMeaning } from './memory';
import { searchKeysLesson, searchKeysSkill } from './searchKeysPractice';
import { readTrickCheckpoint } from './trickCheckpoint';
import { bedMakingLesson } from './bedMakingPractice';

export interface JourneyTrick { sourceId: string; formId: string; skill: string; title: string; vocabulary: string[]; concept?: string }
const normalize = (word: string) => word.trim().toLocaleLowerCase('en');
export const isEquivalentUnit = (unit: UnitSummary) => Boolean(unit.words?.length && unit.words.every((word) => word.associationMode === 'cognate') || /^Cognados\s*·/iu.test(unit.title));

export function trickStop(source: UnitSummary, trick: JourneyTrick): UnitSummary {
  return { ...source, id: `trick:${encodeURIComponent(trick.sourceId)}:${encodeURIComponent(trick.formId)}`, title: trick.title, routeTrick: trick, grammarTricks: undefined };
}

/** Metadata comes exclusively from published, validated content, never demo lessons. */
export function grammarTricks(unit: AtomicUnit): JourneyTrick[] {
  if (unit.kind === 'grammar-lesson') return unit.grammarLesson ? [{ sourceId: unit.id, formId: unit.grammarLesson.id, skill: unit.grammarLesson.id, title: unit.grammarLesson.title, vocabulary: [...new Set(unit.grammarPrerequisites?.vocabulary.map(normalize) ?? [])], concept: unit.grammarLesson.id }] : [];
  if (unit.kind === 'vocabulary-pack') return [];
  return getPlayableGrammar(unit).flatMap((form) => {
    const base = unit.words.find((word) => normalize(word.en) === normalize(form.englishBase ?? ''))?.es.toLowerCase();
    const searchLesson = searchKeysLesson(unit, form.id);
    const bedLesson = bedMakingLesson(unit, form.id);
    const lesson = searchLesson ?? bedLesson ?? lessonForForm(form, base);
    // A short trick does not teach the source mission's context or conversation.
    // Keep only lexical items actually used by this lesson; its grammatical pieces
    // are explained in the lesson itself, not demanded as prior vocabulary.
    const english = normalize(lesson ? [...lesson.steps.map((step) => step.en.map((part) => part.text).join('')), ...lesson.checks.filter((check) => check.kind === 'write').flatMap((check) => check.answers)].join(' ') : '').replace(/[^\p{L}\p{N}]+/gu, ' ');
    const vocabulary = searchLesson ? ['key', 'phone'] : bedLesson ? ['make', 'bed', 'pillow'] : [...new Set([...(form.englishBase ? [normalize(form.englishBase)] : []), ...unit.words.filter((word) => (` ${english} `).includes(` ${normalize(word.en)} `)).map((word) => normalize(word.en)), ...(unit.grammarContinuation?.status === 'approved' && unit.grammarContinuation.formId === form.id ? unit.grammarContinuation.vocabulary.map(normalize) : [])])];
    return lesson ? [{ sourceId: unit.id, formId: form.id, skill: lesson.id, title: lesson.title === 'Lo que estás haciendo' ? `Estoy ${form.spanish}` : lesson.title, vocabulary, concept: form.lesson ? lesson.id : form.visualContract ?? form.id }] : [];
  });
}

/** Stable stop IDs separate a short trick from its source story and saved attempts. */
export function mixedJourneyUnits(units: readonly UnitSummary[]): UnitSummary[] {
  const ordered = orderedJourneyUnits(units);
  const equivalent = ordered.filter(isEquivalentUnit);
  const associations = ordered.filter((unit) => !isEquivalentUnit(unit));
  if (!equivalent.length || !associations.length) return ordered;
  const result: UnitSummary[] = [];
  for (let index = 0; index < Math.max(associations.length, equivalent.length); index++) {
    if (associations[index]) result.push(associations[index]);
    if (equivalent[index]) result.push(equivalent[index]);
  }
  return result;
}

export function buildJourneyRoute(units: readonly UnitSummary[], _memories: readonly WordMemory[] = []): UnitSummary[] {
  const ordered = mixedJourneyUnits(units.filter((unit) => unit.kind !== 'grammar-lesson'));
  const pending = [...ordered, ...units.filter((unit) => unit.kind === 'grammar-lesson')].flatMap((unit) => unit.grammarTricks ?? []);
  const used = new Set<string>();
  const concepts = new Set<string>();
  const introduced = new Set<string>();
  const route: UnitSummary[] = [];
  for (const unit of ordered) {
    route.push(unit);
    unit.words?.forEach((word) => introduced.add(normalize(word.en)));
    // Place an application as soon as its lexical preparation is on the route.
    // Actual learner readiness is still checked by missingTrickWords below.
    const eligible = pending.filter((candidate) => !used.has(candidate.skill) && candidate.vocabulary.every((word) => introduced.has(normalize(word))));
    const trick = eligible.find((candidate) => !concepts.has(candidate.concept ?? candidate.skill)) ?? eligible[0];
    if (!trick) continue; // No invented filler lesson to satisfy a fixed interval.
    used.add(trick.skill);
    concepts.add(trick.concept ?? trick.skill);
    const source = units.find((candidate) => candidate.id === trick.sourceId)!;
    route.push(trickStop(source, trick));
  }
  if (used.size) {
    for (const trick of pending) {
      if (used.has(trick.skill) || !trick.vocabulary.every((word) => introduced.has(normalize(word)))) continue;
      used.add(trick.skill);
      route.push(trickStop(units.find((candidate) => candidate.id === trick.sourceId)!, trick));
    }
  }
  return route;
}

export function missingTrickWords(stop: UnitSummary, memories: readonly WordMemory[], userId?: string): string[] {
  const known = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => normalize(memory.key)));
  // Only a validated, identified old writing task keeps its old prerequisite.
  // Fresh encounters still require both senses used by the new scene.
  if (userId && stop.routeTrick?.sourceId === 'm1-entry-keys' && stop.routeTrick.formId === 'looking-for' && stop.routeTrick.skill === searchKeysSkill) {
    const saved = readTrickCheckpoint(userId, stop.id, stop.contentVersion ?? '1');
    if (saved && !saved.episodeId && saved.stage === 2 && (saved.checkId === 'use' || saved.checkId === undefined && saved.checkIndex === 1)) return known.has('look') ? [] : ['look'];
  }
  return stop.routeTrick?.vocabulary.map(normalize).filter((word) => {
    const senses = stop.words?.filter((item) => normalize(item.en) === word) ?? [];
    return senses.length ? senses.some((sense) => !memories.some((memory) => practicedWordMeaning(memory, sense))) : !known.has(word);
  }) ?? [];
}

export function completedTrick(stop: UnitSummary, activities: readonly LearningActivity[]): boolean {
  const trick = stop.routeTrick;
  return Boolean(trick && activities.some((activity) => activity.unitId === trick.sourceId
    && activity.contentVersion === (stop.contentVersion ?? '1') && activity.source === 'learner'
    && activity.phase === 'completion' && (activity.activityId === `trick-completed:${trick.formId}` || activity.activityId === 'grammar-completed')));
}

/** Derive variety from existing journal evidence, not another persisted counter.
 * Undated legacy records are not invented as new intervening practice.
 * Replaying a previously completed vocabulary mission does not earn a new slot.
 */
function readyForAnotherTrick(route: readonly UnitSummary[], activities: readonly LearningActivity[]): boolean {
  const dated = activities.flatMap((activity, index) => {
    const at = Date.parse(activity.at);
    return activity.source === 'learner' && activity.phase === 'completion' && Number.isFinite(at) ? [{ activity, at, index }] : [];
  }).sort((left, right) => left.at - right.at || left.index - right.index);
  const tricks = route.filter((stop) => stop.routeTrick);
  let lastTrick = -1;
  dated.forEach(({ activity }, index) => {
    if (tricks.some((stop) => completedTrick(stop, [activity]))) lastTrick = index;
  });
  if (lastTrick < 0) return true;
  const vocabularyIds = new Set(route.filter((stop) => !stop.routeTrick).map((stop) => stop.id));
  const seen = new Set<string>();
  let interveningVocabulary = false;
  dated.forEach(({ activity }, index) => {
    if (activity.activityId !== 'vocabulary-completed' || !vocabularyIds.has(activity.unitId) || seen.has(activity.unitId)) return;
    seen.add(activity.unitId);
    if (index > lastTrick) interveningVocabulary = true;
  });
  // Variety, not a four-mission quota: one genuine new vocabulary episode
  // can create another opportunity. Replays cannot manufacture that evidence.
  return interveningVocabulary;
}

export function nextJourneyStop(currentId: string, route: readonly UnitSummary[], memories: readonly WordMemory[], activities: readonly LearningActivity[] = [], completedIds: ReadonlySet<string> = new Set()): UnitSummary | undefined {
  const current = route.findIndex((stop) => stop.id === currentId);
  if (current < 0) return undefined;
  // A previously deferred trick can join the adventure once its words are practiced.
  // Home must not drain the grammar catalogue as a consecutive quiz at the tail.
  // Keep all stable stops (including saved legacy tail positions) accessible, but
  // after a trick continue with pending vocabulary or finish this adventure run.
  // The independent grammar map deliberately uses nextGrammarStop instead.
  const grammarReady = !route[current].routeTrick && readyForAnotherTrick(route, activities);
  const available = (stop: UnitSummary) => (!stop.routeTrick || grammarReady)
    && !missingTrickWords(stop, memories).length && (stop.routeTrick ? !completedTrick(stop, activities) : !completedIds.has(stop.id));
  const following = route.slice(current + 1).find(available);
  const scheduled = route.slice(current + 1).find((stop) => stop.routeTrick ? !completedTrick(stop, activities) : !completedIds.has(stop.id));
  const replacement = scheduled?.routeTrick && missingTrickWords(scheduled, memories).length ? route.find((stop) => stop.routeTrick && available(stop)) : undefined;
  const varied = isEquivalentUnit(route[current]) && following && isEquivalentUnit(following)
    ? route.find((stop) => !stop.routeTrick && !isEquivalentUnit(stop) && stop.id !== currentId && available(stop)) : undefined;
  return route.slice(0, current).find((stop) => stop.routeTrick && available(stop))
    ?? replacement ?? varied ?? following
    ?? route.slice(0, current).find(available);
}
