/** The historical word list is an input pool, never an approved learner queue.
 * Pure parsing lets the app and the audit use exactly the same unique counts. */
export interface CatalogCandidate {
  lemma: string;
  meaning: string;
  partOfSpeech: string;
  domains: string[];
  sourceLines: number[];
  itemType: 'word' | 'chunk';
  status: 'needs_review';
}
export function parseProductionCandidates(source: string): CatalogCandidate[] {
  const result = new Map<string, CatalogCandidate>();
  let domain = 'general';
  source.split(/\r?\n/u).forEach((line, index) => {
    if (line.startsWith('## ')) { domain = line.split('|').slice(1).join('|').trim() || 'general'; return; }
    if (!line.trim() || line.startsWith('#')) return;
    const [rawLemma, meaning, partOfSpeech] = line.split('|').map((value) => value.trim());
    if (!rawLemma || !meaning || !partOfSpeech) return;
    const lemma = rawLemma.toLowerCase().replace(/\s+/gu, ' ');
    const key = `${lemma}:${partOfSpeech}`;
    const previous = result.get(key);
    if (previous) {
      if (!previous.domains.includes(domain)) previous.domains.push(domain);
      previous.sourceLines.push(index + 1);
      return;
    }
    result.set(key, { lemma, meaning, partOfSpeech, domains: [domain], sourceLines: [index + 1], itemType: /^[a-z]+$/u.test(lemma) && partOfSpeech !== 'phr' ? 'word' : 'chunk', status: 'needs_review' });
  });
  return [...result.values()];
}
export function countUniqueVocabulary(candidates: CatalogCandidate[]): number {
  return new Set(candidates.filter((candidate) => candidate.itemType === 'word').map((candidate) => candidate.lemma)).size;
}
export const productionReleaseGates = ['text-reviewed', 'bridge-defensible', 'english-audio-reviewed', 'no-answer-leak', 'known-vocabulary-only', 'practice-and-retry', 'srs-and-history', 'reload-and-resume', 'directus-persistence', 'regression-check', 'github-secret-check'] as const;
