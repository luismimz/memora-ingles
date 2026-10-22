import { expect, it } from 'vitest';
import { constructionFeedback } from './sentenceConstruction';
import type { UnitSentence } from './unit';

const sentence: UnitSentence = { en: 'I have a book.', es: 'Yo tengo un libro.', pronunciationTip: '', slots: [
  { en: 'I', es: 'Yo', choices: ['I', 'have'] },
  { en: 'have', es: 'tengo', choices: ['a', 'have'] },
  { en: 'a', es: 'un', choices: ['a', 'I'] },
  { en: 'book.', es: 'libro', choices: ['pen.', 'book.'] },
] };
it('deriva el significado de piezas enseñadas y conserva una corrección concreta', () => {
  expect(constructionFeedback(sentence, 1, 'a')).toBe('«a» corresponde a «un». Aquí necesitas «tengo».');
  expect(constructionFeedback(sentence, 1, 'have')).toBe('Pieza colocada con apoyo.');
});
it('no inventa una traducción para distractores ajenos o ambiguos', () => {
  expect(constructionFeedback(sentence, 3, 'pen.')).toBe('Esta pieza no comunica «libro» en este mensaje. Compara las piezas preparadas.');
  expect(constructionFeedback(sentence, 3, 'dog.')).toBe('');
  expect(constructionFeedback(sentence, -1, 'a')).toBe('');
  const ambiguous = { ...sentence, slots: [...sentence.slots, { en: 'a', es: 'otro sentido', choices: ['a', 'I'] as [string, string] }] };
  expect(constructionFeedback(ambiguous, 1, 'a')).not.toContain('corresponde a');
});
