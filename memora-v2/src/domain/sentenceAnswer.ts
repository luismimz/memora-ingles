/** Ignore typography, punctuation and an expanded contraction, not missing words. */
export function normalizeSentenceAnswer(value: string): string {
  return value.toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/\b(i'm|you're|he's|she's|we're|they're)\b/g, (match) => ({
      "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "we're": 'we are', "they're": 'they are',
    })[match] ?? match)
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reuse prepared spoken chunks only when they reconstruct this exact message.
 * Morphological fragments are visual pieces, not standalone pronunciation models. */
export function sentenceSpeechParts(phrase: string, parts: readonly string[]): string[] {
  if (parts.length < 2 || parts.some((part) => !part.trim() || /^(?:['’]?(?:m|re|ve|ll|d|s)|ing|ed)[.!?]?$/iu.test(part.trim()))) return [];
  return normalizeSentenceAnswer(parts.join(' ')) === normalizeSentenceAnswer(phrase) ? [...parts] : [];
}

/** Point at a near-complete draft, never provide the answer or grade a pause.
 * Equal-length single substitutions/transpositions exclude unfinished prefixes. */
export function sentenceDraftCue(draft: string, expected: string): string | undefined {
  const words = normalizeSentenceAnswer(draft).split(' ');
  const target = normalizeSentenceAnswer(expected).split(' ');
  if (words.length < 3 || words.length !== target.length || !/^[a-z ]+$/i.test(draft.trim())) return;
  const different = words.flatMap((word, index) => word === target[index] ? [] : [index]);
  if (!different.length || different.length > 2 || words.length - different.length < 2) return;
  if (!different.every((index) => {
    const word = words[index], model = target[index];
    if (word.length !== model.length) return false;
    const positions = [...word].flatMap((letter, position) => letter === model[position] ? [] : [position]);
    return positions.length === 1 || positions.length === 2 && positions[1] === positions[0] + 1 && word[positions[0]] === model[positions[1]] && word[positions[1]] === model[positions[0]];
  })) return;
  return `Revisa ${different.map((index) => `«${words[index]}»`).join(' y ')}.`;
}

export interface SpellingRepair {
  changes: { written: string; expected: string; start: number; end: number }[];
  corrected: string;
}

function oneLetterApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  if (a.length === b.length) {
    const different = [...a].flatMap((letter, index) => letter === b[index] ? [] : [index]);
    return different.length === 1 || different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]];
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  let index = 0;
  while (index < short.length && long[index] === short[index]) index++;
  return long.slice(index + 1) === short.slice(index);
}

/** Locate small edits against this prepared message, not a dictionary or a grade.
 * Ranges retain the learner's actual text; applying a repair is always explicit. */
export function sentenceSpellingRepair(draft: string, expected: string): SpellingRepair | undefined {
  if (draft.length > 300 || !/^[a-z'’‘.,!?;:\s-]+$/iu.test(draft)) return;
  const tokens = (value: string) => [...value.matchAll(/[a-z]+(?:['’‘][a-z]+)?/giu)].flatMap((match) => {
    const normalized = normalizeSentenceAnswer(match[0]).replace(/\bdon't\b/gu, 'do not');
    return normalized.split(' ').map((word) => ({ word, written: match[0], start: match.index!, end: match.index! + match[0].length }));
  });
  const words = tokens(draft), target = tokens(expected);
  if (words.length < 3 || words.length > 16 || words.length !== target.length) return;
  const different = words.flatMap((entry, index) => entry.word === target[index].word ? [] : [index]);
  if (!different.length || different.length > 2 || words.length - different.length < 2) return;
  // A final prefix without a boundary is still being typed, not misspelled.
  const last = words.length - 1;
  if (different.includes(last) && target[last].word.startsWith(words[last].word) && !/[\s.,!?;:]$/u.test(draft)) return;
  if (!different.every((index) => oneLetterApart(words[index].word, target[index].word))) return;
  const changes = different.map((index) => ({ written: words[index].written, expected: target[index].word, start: words[index].start, end: words[index].end }));
  if (new Set(changes.map((change) => change.start)).size !== changes.length) return;
  let corrected = draft;
  for (const change of [...changes].reverse()) corrected = corrected.slice(0, change.start) + change.expected + corrected.slice(change.end);
  return { changes, corrected };
}
