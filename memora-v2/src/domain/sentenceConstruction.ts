import type { AtomicWord, GrammarForm, UnitSentence } from './unit';
import { normalizeSentenceAnswer } from './sentenceAnswer';

/** Match an explicitly authored sentence piece, not the last form visited or an inferred tense. */
export function constructionGrammar(sentence: UnitSentence, forms: readonly GrammarForm[]): GrammarForm | undefined {
  if (forms.length === 1) return forms[0];
  const key = (text: string) => text.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/[.!?]+$/u, '').replace(/\s+/g, ' ').trim();
  const pieces = new Set(sentence.slots.map((slot) => key(slot.en)));
  const matches = forms.filter((form) => form.subjects.some((subject) => pieces.has(key(subject.phrase))));
  // Ambiguous or unlinked content must not silently show an unrelated trick.
  return matches.length === 1 ? matches[0] : undefined;
}

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
