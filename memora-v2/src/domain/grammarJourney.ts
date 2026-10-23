import type { AtomicUnit } from './unit';
import type { UnitSummary } from '../services/directus';
import { grammarTricks, completedTrick, missingTrickWords, mixedJourneyUnits, trickStop } from './journeyTricks';
import { getPlayableGrammar } from './unit';
import { requiredGrammarWords } from './learningModes';
import type { LearningActivity } from './learningActivity';
import type { WordMemory } from './memory';
import { progressStorage } from './progressJournal';

export function readGrammarPosition(userId: string): string | null {
  try { return progressStorage().getItem(`memora-v2.grammar-position.${userId}`); } catch { return null; }
}
export function writeGrammarPosition(userId: string, id: string | null) {
  try { progressStorage().setItem(`memora-v2.grammar-position.${userId}`, id ?? ''); } catch { /* The map remains playable without local storage. */ }
}

/** The grammar map uses the same stop IDs and completion events as Home. */
export function grammarJourney(units: readonly AtomicUnit[]): UnitSummary[] {
  const used = new Set<string>();
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  return mixedJourneyUnits(units).flatMap<UnitSummary>((summary) => {
    const unit = byId.get(summary.id)!;
    if (unit.kind === 'vocabulary-pack') return [];
    const tricks = grammarTricks(unit);
    if (tricks.length) return tricks.filter((trick) => {
      if (used.has(trick.skill)) return false;
      used.add(trick.skill); return true;
    }).map((trick) => trickStop(unit, trick));
    // Keep legacy authored lessons playable with their existing engine.
    const form = getPlayableGrammar(unit)[0];
    return unit.mirror || form ? [{ ...unit, title: unit.mirror?.novelty ?? `Usar «${form?.spanish ?? 'una frase'}»` }] : [];
  });
}

export function missingGrammarStop(stop: UnitSummary, units: readonly AtomicUnit[], memories: readonly WordMemory[], userId?: string): string[] {
  if (stop.routeTrick) return missingTrickWords(stop, memories, userId);
  const unit = units.find((candidate) => candidate.id === stop.id);
  const known = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => memory.key.toLowerCase()));
  return unit ? requiredGrammarWords(unit).filter((word) => !known.has(word.toLowerCase())) : ['contenido pendiente'];
}

export function completedGrammarStop(stop: UnitSummary, activities: readonly LearningActivity[]): boolean {
  if (stop.routeTrick) return completedTrick(stop, activities);
  return activities.some((activity) => activity.unitId === stop.id && activity.contentVersion === (stop.contentVersion ?? '1')
    && activity.source === 'learner' && activity.phase === 'completion'
    && ['grammar-completed', 'mirror-complete'].includes(activity.activityId));
}

/** Choose real published vocabulary; never manufacture a bridge or a learned flag. */
export function grammarPreparationCandidate(stop: UnitSummary, summaries: readonly UnitSummary[], units: readonly AtomicUnit[], memories: readonly WordMemory[]): UnitSummary | undefined {
  const missing = new Set(missingGrammarStop(stop, units, memories));
  if (!missing.size) return undefined;
  return summaries.map((unit, index) => ({ unit, index, coverage: unit.words?.filter((word) => missing.has(word.en.trim().toLowerCase())).length ?? 0 }))
    .filter((candidate) => candidate.coverage > 0)
    .sort((left, right) => right.coverage - left.coverage || left.index - right.index)[0]?.unit;
}

export function nextGrammarStop(currentId: string, route: readonly UnitSummary[], units: readonly AtomicUnit[], memories: readonly WordMemory[], activities: readonly LearningActivity[], inspection = false): UnitSummary | undefined {
  const index = route.findIndex((stop) => stop.id === currentId);
  if (index < 0) return undefined;
  const pending = (stop: UnitSummary) => inspection || !completedGrammarStop(stop, activities) && !missingGrammarStop(stop, units, memories).length;
  return route.slice(index + 1).find(pending) ?? route.slice(0, index).find(pending);
}
