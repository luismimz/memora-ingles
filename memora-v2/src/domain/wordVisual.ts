import type { AtomicWord } from './unit';

export type CognateSceneKind = 'hotel' | 'information' | 'radio' | 'music';
export function cognateSceneKind(word: AtomicWord): CognateSceneKind | undefined {
  if (word.associationMode !== 'cognate') return undefined;
  const key = word.en.trim().toLocaleLowerCase('en');
  const meaning = word.es.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
  if (!word.imageUrl && !word.bridge?.trim() && word.cognateEvidence?.sameMeaning === true) {
    if (key === 'radio' && ['radio', 'aparato de radio'].includes(meaning)) return 'radio';
    if (key === 'music' && meaning === 'musica') return 'music';
  }
  return key === 'hotel' || key === 'information' ? key : undefined;
}

/** Presentation fallback only; never changes the stored association or its approval. */
export function wordVisual(word: AtomicWord): AtomicWord {
  if (word.associationMode === 'cognate' && !word.imageUrl && word.en.trim().toUpperCase() === 'ADULT') {
    return { ...word, emojis: ['🧑'] };
  }
  return word;
}
