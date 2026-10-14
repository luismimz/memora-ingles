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
