import { expect, it } from 'vitest';
import { contextualCorrection } from './learningActivity';

it('señala sujeto o auxiliar solo en mensajes compatibles con la frase enseñada', () => {
  expect(contextualCorrection('  I   playing. ', 'I’m playing.')).toContain('Falta AM');
  expect(contextualCorrection('am playing', "I'm playing")).toContain('Añade quién');
  expect(contextualCorrection('playing', 'I am playing')).toContain('YO estoy');
  expect(contextualCorrection('am eating', 'I am playing', 'Pista revisada')).toBe('Pista revisada');
  expect(contextualCorrection('hotel', 'I am playing', 'Pista revisada')).toBe('Pista revisada');
  expect(contextualCorrection('am ready', 'I am ready', 'Pista revisada')).toBe('Pista revisada');
});

it('conserva las correcciones existentes y el fallback del consumidor', () => {
  expect(contextualCorrection("I'm looking my keys", "I'm looking for my keys")).toContain('falta FOR');
  expect(contextualCorrection('I have my key', 'I have my keys')).toContain('plural');
  expect(contextualCorrection('otra respuesta', 'otra frase')).toContain('Puedes volver a intentarlo');
  expect(contextualCorrection('otra respuesta', 'otra frase', 'Ayuda de esta lección')).toBe('Ayuda de esta lección');
});
