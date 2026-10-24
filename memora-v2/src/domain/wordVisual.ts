import type { AtomicWord } from './unit';

export type MnemonicSceneKind = 'computer-compota' | 'desk-disco' | 'pan-panda';
/** Only depict the already authored story, never replace another author's cue. */
export function mnemonicSceneKind(word: AtomicWord): MnemonicSceneKind | undefined {
  if (word.associationMode !== 'acoustic_bridge' || word.imageUrl) return undefined;
  if (word.en === 'COMPUTER' && word.es === 'ordenador' && word.bridge === 'COMPOTA'
    && word.scene === 'La COMPOTA brota de un ORDENADOR y pega sus teclas.') return 'computer-compota';
  if (word.en === 'DESK' && word.es === 'escritorio' && word.bridge === 'DISCO'
    && word.scene === 'Un DISCO despliega patas y se convierte en ESCRITORIO.') return 'desk-disco';
  if (word.en === 'PAN' && word.es === 'sartén' && word.bridge === 'PANDA'
    && word.scene === 'Un PANDA se pone la SARTÉN de sombrero.') return 'pan-panda';
  return undefined;
}

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
