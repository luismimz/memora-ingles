import { describe, it, expect } from 'vitest';
import raw from '../../content/keys-mission.json';
import { validateUnit } from './unit';
import { markGrammarText, grammarSentencePieces, grammarTransition } from './grammarPresentation';
import { validateGrammarLesson } from './grammarLesson';

it('compara ocurrencias, no acredita palabras repetidas como piezas ya presentes', () => {
  const step = { caption: '', es: [], en: [{ text: 'very ', role: 'context' as const }, { text: 'very ', role: 'context' as const }, { text: 'good', role: 'verb' as const }] };
  expect(grammarTransition(step, { ...step, en: [step.en[0], step.en[2]] }).changed).toEqual([1]);
  expect(grammarTransition(step, { ...step, hideEnglish: true }).changed).toEqual([]);
  expect(grammarTransition({ ...step, hideEnglish: true }, step).changed).toEqual([]);
  expect(grammarTransition(step, { ...step, en: [{ text: 'other', role: 'context' }] }).changed).toEqual([]);
});

describe('piezas visuales declaradas, sin adivinar terminaciones', () => {
  const form = validateUnit(raw).grammar[0];
  it('colorea ESTOY e I AM/IM como la misma pieza y ANDO/ING como el cambio', () => {
    for (const [text, language, auxiliary, ending] of [['Estoy buscando', 'es', 'Estoy', 'ando'], ["I'm looking", 'en', "I'm", 'ing']] as const) {
      const parts = grammarSentencePieces(text, form, language);
      expect(parts.map((part) => part.text).join('')).toBe(text);
      expect(parts.find((part) => part.text.trim() === auxiliary)?.role).toBe('auxiliary');
      expect(parts.find((part) => part.text === ending)?.role).toBe('change');
    }
  });
  it('no marca ER de COMPUTER ni altera mayúsculas, espacios o texto del alumno', () => {
    const text = "I'm LOOKING for my COMPUTER.";
    const parts = grammarSentencePieces(text, form, 'en');
    expect(parts.map((part) => part.text).join('')).toBe(text);
    expect(parts.filter((part) => part.role === 'change').map((part) => part.text)).toEqual(['ING']);
  });
  it('las marcas de una explicación son literales y no colorean partes de otras palabras', () => {
    const parts = markGrammarText('FOR forma parte de LOOK FOR, no de FORMA.', [{ text: 'LOOK FOR', role: 'verb' }, { text: 'FOR', role: 'verb' }]);
    expect(parts.filter((part) => part.role === 'verb').map((part) => part.text)).toEqual(['FOR', 'LOOK FOR']);
  });
  it('el JSON alinea las piezas enseñadas sin cargar el truco con el plural', () => {
    const last = form.lesson!.steps.at(-1)!;
    expect(last.es.map((part) => part.text).join('')).toBe('Estoy buscando mis llaves.');
    expect(last.en.map((part) => part.text).join('')).toBe("I'm looking for my keys.");
    expect(last.es.filter((part) => part.role === 'change').map((part) => part.text)).toEqual(['ando']);
    expect(last.en.filter((part) => part.role === 'change').map((part) => part.text)).toEqual(['ing']);
    expect(() => validateGrammarLesson(form.lesson!)).not.toThrow();
  });
});
