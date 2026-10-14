import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { reviewUnits } from '../preview/previewUnit';
import { GrammarMorphology } from './GrammarMorphology';
import { getPlayableGrammar, type GrammarForm } from '../domain/unit';

describe('patrón visual de gramática', () => {
  it.each(reviewUnits)('reutiliza raíz e intención para $title', (unit) => {
    const form = getPlayableGrammar(unit)[0];
    const markup = renderToStaticMarkup(<GrammarMorphology form={form} step={4} joined subjectIndex={0} />);
    expect(markup).toContain(`data-role="root">${form.spanishStem}`);
    expect(markup).toContain(`class="english-root morph-root">${form.englishRoot}`);
    expect(markup).toContain(`data-role="ending">${form.spanishEnding}`);
    expect(markup).toContain('class="english-nut morph-intent">ing');
    expect(markup).toContain('aria-label="Estoy"');
  });

  it('mantiene la persona inglesa al reducir el sujeto español', () => {
    const form = reviewUnits[0].grammar.find((item) => item.id === 'ing')!;
    const markup = renderToStaticMarkup(<GrammarMorphology form={form} step={4} joined subjectIndex={1} />);
    expect(markup).toContain('aria-label="Estás"');
    expect(markup).toContain('aria-label="You&#x27;re"');
  });

  it.each([
    {
      name: 'pasado regular', id: 'past-regular', contract: 'past-simple', spanish: ['jug', 'ué'], english: ['play', 'ed'],
      subject: { en: 'I', es: 'Yo', phrase: 'I played' },
    },
    {
      name: 'presente perfecto', id: 'present-perfect', contract: 'present-perfect', spanish: ['jug', 'ado'], english: ['play', 'ed'],
      subject: { en: "I've", expandedEn: 'I have', es: 'Yo he', reducedEs: 'He', phrase: "I've played" },
    },
    {
      name: 'futuro', id: 'will', contract: 'future-will', spanish: ['jugar', 'é'], english: ['play'],
      subject: { en: "I'll", expandedEn: 'I will', es: 'Yo', phrase: "I'll play" },
    },
    {
      name: 'condicional', id: 'would', contract: 'would', spanish: ['jugar', 'ía'], english: ['play'],
      subject: { en: "I'd", expandedEn: 'I would', es: 'Yo', phrase: "I'd play" },
    },
  ])('representa $name con piezas declaradas, sin adivinar terminaciones', ({ id, contract, spanish, english, subject }) => {
    const form: GrammarForm = {
      id,
      visualContract: contract,
      spanish: spanish.join(''), spanishStem: spanish[0], spanishEnding: spanish[1] || '',
      englishRoot: english[0], englishNut: english[1] || '', english: english.join(''), placement: 'after',
      spanishPieces: spanish.map((text, index) => ({ id: `es-${index}`, text, role: index ? 'ending' : 'root' })),
      englishPieces: english.map((text, index) => ({ id: `en-${index}`, text, role: index ? 'ending' : 'root' })),
      subjects: [subject],
    };
    const markup = renderToStaticMarkup(<GrammarMorphology form={form} step={4} joined subjectIndex={0} />);
    expect(markup).toContain(`data-role="root" class="english-root morph-root">${english[0]}`);
    if (english[1]) expect(markup).toContain(`data-role="ending"`);
    if ('expandedEn' in subject) expect(markup).toContain(`aria-label="${subject.en.replace("'", '&#x27;')}"`);
  });
});
