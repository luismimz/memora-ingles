import type { AtomicWord } from './unit';

/** Presentation fallback only; never changes the stored association or its approval. */
export function wordVisual(word: AtomicWord): AtomicWord {
  if (word.associationMode === 'cognate' && !word.imageUrl && word.en.trim().toUpperCase() === 'ADULT') {
    return { ...word, emojis: ['🧑'] };
  }
  return word;
}
