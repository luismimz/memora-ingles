import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GrammarComparison } from './GrammarComparison';
import { piece, type LessonStep } from '../domain/grammarLesson';

const first: LessonStep = { caption: 'Yo.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] };
const next: LessonStep = { caption: 'Yo estoy.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] };
it('mantiene el modelo completo y señala el cambio con texto, no solo color', () => {
  const html = renderToStaticMarkup(<GrammarComparison step={next} previous={first} />);
  expect(html).toContain('coach-subject">I ');
  expect(html).toContain('coach-auxiliary comparison-changed">AM');
  expect(html).toContain('Cambia aquí:');
  expect(html).toContain('ESPAÑOL'); expect(html).toContain('INGLÉS');
});
it('no revela inglés ni compara contra un modelo que todavía estaba oculto', () => {
  const hidden = { ...first, hideEnglish: true };
  expect(renderToStaticMarkup(<GrammarComparison step={hidden} />)).not.toContain('INGLÉS');
  expect(renderToStaticMarkup(<GrammarComparison step={next} previous={hidden} />)).not.toContain('comparison-changed');
  expect(renderToStaticMarkup(<GrammarComparison step={next} previous={next} />)).not.toContain('Cambia aquí:');
});
