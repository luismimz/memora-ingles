import type { UnitSummary } from '../services/directus';

/** Call with the learner's published catalogue, not the admin draft list. */
export function catalogueStats(units: UnitSummary[]) {
  const words = new Set<string>();
  const expressions = new Set<string>();
  for (const unit of units) for (const word of unit.words ?? []) {
    const key = word.en.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
    if (key) (key.includes(' ') ? expressions : words).add(key);
  }
  return { words: words.size, expressions: expressions.size };
}
