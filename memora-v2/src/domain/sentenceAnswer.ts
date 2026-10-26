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
