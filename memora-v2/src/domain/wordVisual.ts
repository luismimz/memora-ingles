import type { AtomicWord } from './unit';

export function cognateSceneKind(word: AtomicWord): 'hotel' | 'information' | undefined {
  if (word.associationMode !== 'cognate') return undefined;
  const key = word.en.trim().toLocaleLowerCase('en');
  return key === 'hotel' || key === 'information' ? key : undefined;
}

/** Presentation fallback only; never changes the stored association or its approval. */
export function wordVisual(word: AtomicWord): AtomicWord {
  if (word.associationMode === 'cognate' && !word.imageUrl && word.en.trim().toUpperCase() === 'ADULT') {
    return { ...word, emojis: ['🧑'] };
  }
  return word;
}
