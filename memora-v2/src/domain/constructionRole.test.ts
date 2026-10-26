import { expect, it } from 'vitest';
import { contextualProcessFixture as unit } from '../test/contextualProcessFixture';
import { lessonForForm } from './grammarLesson';
import { constructionRole } from './constructionRole';
const form = unit.grammar[0];
it('conserva persona, auxiliar y acción preparados en los dos idiomas sin confundir terminaciones', () => {
  for (const [en, es, role] of [['I', 'YO', 'subject'], ['am', 'estoy', 'auxiliary'], ['playing.', 'jugando', 'verb']]) {
    expect(constructionRole(en, form, 'en', 'jugar')).toBe(role);
    expect(constructionRole(es, form, 'es', 'jugar')).toBe(role);
  }
  expect(constructionRole('ING', form, 'en', 'jugar')).toBeUndefined();
  expect(constructionRole('something unknown', form, 'en', 'jugar')).toBeUndefined();
});
it('no inventa roles para contratos no preparados ni textos ambiguos', () => {
  expect(constructionRole('I', { ...form, id: 'unknown', visualContract: undefined, lesson: undefined }, 'en')).toBeUndefined();
  const lesson = lessonForForm(form, 'jugar')!;
  const ambiguous = { ...form, lesson: { ...lesson, steps: [...lesson.steps, { caption: 'Synthetic conflict', en: [{ text: 'I', role: 'verb' as const }], es: [] }] } };
  expect(constructionRole('I', ambiguous, 'en')).toBeUndefined();
});
