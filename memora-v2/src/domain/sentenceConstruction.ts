import type { AtomicWord, UnitSentence } from './unit';
import { normalizeSentenceAnswer } from './sentenceAnswer';

/** Explain only authored correspondences; never guess a distractor's translation. */
export function constructionFeedback(sentence: UnitSentence, slotIndex: number, choice: string, vocabulary: readonly AtomicWord[] = []): string {
  const slot = sentence.slots[slotIndex];
  if (!slot || !slot.choices.includes(choice)) return '';
  if (choice === slot.en) return 'Pieza colocada con apoyo.';
  const key = normalizeSentenceAnswer(choice);
  const meanings = new Set([
    ...sentence.slots.filter((candidate) => normalizeSentenceAnswer(candidate.en) === key).map((candidate) => candidate.es),
    ...vocabulary.filter((word) => normalizeSentenceAnswer(word.en) === key).map((word) => word.es),
  ].map((meaning) => meaning.trim().toLocaleLowerCase('es')));
  const meaning = meanings.size === 1 ? [...meanings][0] : undefined;
  return meaning ? `«${choice}» corresponde a «${meaning}». Aquí necesitas «${slot.es}».`
    : `Esta pieza no comunica «${slot.es}» en este mensaje. Compara las piezas preparadas.`;
}
