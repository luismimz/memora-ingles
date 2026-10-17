import type { UnitSummary } from '../services/directus';
import type { AtomicUnit } from './unit';
import { getPlayableGrammar } from './unit';
import { lessonForForm } from './grammarLesson';
import { orderedJourneyUnits } from './journey';
import type { LearningActivity } from './learningActivity';
import type { WordMemory } from './memory';

export interface JourneyTrick { sourceId: string; formId: string; skill: string; title: string; vocabulary: string[] }
const normalize = (word: string) => word.trim().toLocaleLowerCase('en');

export function trickStop(source: UnitSummary, trick: JourneyTrick): UnitSummary {
  return { ...source, id: `trick:${encodeURIComponent(trick.sourceId)}:${encodeURIComponent(trick.formId)}`, title: trick.title, routeTrick: trick, grammarTricks: undefined };
}

/** Metadata comes exclusively from published, validated content, never demo lessons. */
export function grammarTricks(unit: AtomicUnit): JourneyTrick[] {
  if (unit.kind === 'vocabulary-pack') return [];
  return getPlayableGrammar(unit).flatMap((form) => {
    const base = unit.words.find((word) => normalize(word.en) === normalize(form.englishBase ?? ''))?.es.toLowerCase();
    const lesson = lessonForForm(form, base);
    // A short trick does not teach the source mission's context or conversation.
    // Keep only lexical items actually used by this lesson; its grammatical pieces
    // are explained in the lesson itself, not demanded as prior vocabulary.
    const english = normalize(lesson ? [...lesson.steps.map((step) => step.en.map((part) => part.text).join('')), ...lesson.checks.filter((check) => check.kind === 'write').flatMap((check) => check.answers)].join(' ') : '').replace(/[^\p{L}\p{N}]+/gu, ' ');
    const vocabulary = [...new Set([...(form.englishBase ? [normalize(form.englishBase)] : []), ...unit.words.filter((word) => (` ${english} `).includes(` ${normalize(word.en)} `)).map((word) => normalize(word.en))])];
    return lesson ? [{ sourceId: unit.id, formId: form.id, skill: lesson.id, title: lesson.title === 'Lo que estás haciendo' ? `Estoy ${form.spanish}` : lesson.title, vocabulary }] : [];
  });
}

/** Stable stop IDs separate a short trick from its source story and saved attempts. */
export function mixedJourneyUnits(units: readonly UnitSummary[]): UnitSummary[] {
  const ordered = orderedJourneyUnits(units);
  const isEquivalent = (unit: UnitSummary) => unit.words?.length && unit.words.every((word) => word.associationMode === 'cognate') || /^Cognados\s*·/iu.test(unit.title);
  const equivalent = ordered.filter(isEquivalent);
  const associations = ordered.filter((unit) => !isEquivalent(unit));
  if (!equivalent.length || !associations.length) return ordered;
  // Distribute the scarce associations over the whole catalogue instead of
  // exhausting them first and leaving a long, uninterrupted tail of cognates.
  const result: UnitSummary[] = [];
  let position = 0;
  associations.forEach((association, index) => {
    result.push(association);
    const limit = Math.ceil(equivalent.length * (index + 1) / associations.length);
    while (position < limit) result.push(equivalent[position++]);
  });
  return result;
}

export function buildJourneyRoute(units: readonly UnitSummary[], memories: readonly WordMemory[] = []): UnitSummary[] {
  const ordered = mixedJourneyUnits(units);
  const pending = ordered.flatMap((unit) => unit.grammarTricks ?? []);
  const used = new Set<string>();
  const introduced = new Set<string>();
  const practiced = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => normalize(memory.key)));
  const route: UnitSummary[] = [];
  let sinceTrick = 0;
  for (const unit of ordered) {
    route.push(unit);
    unit.words?.forEach((word) => introduced.add(normalize(word.en)));
    sinceTrick++;
    if (sinceTrick < 4) continue;
    const trick = pending.find((candidate) => !used.has(candidate.skill) && candidate.vocabulary.every((word) => practiced.has(normalize(word))))
      ?? pending.find((candidate) => !used.has(candidate.skill) && candidate.vocabulary.every((word) => introduced.has(normalize(word))));
    if (!trick) continue; // No invented filler lesson to satisfy a fixed interval.
    used.add(trick.skill);
    const source = units.find((candidate) => candidate.id === trick.sourceId)!;
    route.push(trickStop(source, trick));
    sinceTrick = 0;
  }
  return route;
}

export function missingTrickWords(stop: UnitSummary, memories: readonly WordMemory[]): string[] {
  const known = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => normalize(memory.key)));
  return stop.routeTrick?.vocabulary.map(normalize).filter((word) => !known.has(word)) ?? [];
}

export function completedTrick(stop: UnitSummary, activities: readonly LearningActivity[]): boolean {
  const trick = stop.routeTrick;
  return Boolean(trick && activities.some((activity) => activity.unitId === trick.sourceId
    && activity.contentVersion === (stop.contentVersion ?? '1') && activity.source === 'learner'
    && activity.phase === 'completion' && (activity.activityId === `trick-completed:${trick.formId}` || activity.activityId === 'grammar-completed')));
}

export function nextJourneyStop(currentId: string, route: readonly UnitSummary[], memories: readonly WordMemory[], activities: readonly LearningActivity[] = [], completedIds: ReadonlySet<string> = new Set()): UnitSummary | undefined {
  const current = route.findIndex((stop) => stop.id === currentId);
  if (current < 0) return undefined;
  // A previously deferred trick can join the adventure once its words are practiced.
  const available = (stop: UnitSummary) => !missingTrickWords(stop, memories).length && (stop.routeTrick ? !completedTrick(stop, activities) : !completedIds.has(stop.id));
  return route.slice(0, current).find((stop) => stop.routeTrick && available(stop))
    ?? route.slice(current + 1).find(available);
}
