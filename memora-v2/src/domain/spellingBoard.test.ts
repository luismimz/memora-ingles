import { expect, it } from 'vitest';
import { spellingBoard } from './spellingBoard';
import { cognateLetters } from './cognateLetters';

it('MATHEMATICS nuevo usa tres huecos literales, no parejas de letras arbitrarias', () => {
  const board = spellingBoard('MATHEMATICS');
  expect(board.parts).toEqual(Array.from('MATHEMATICS'));
  expect(board.guided).toBe(true); expect(board.gaps).toEqual([1, 5, 9]);
  expect(spellingBoard('SCIENCE').gaps).toEqual([1, 3, 5]);
});
it('preserva el tablero legacy y no exige colocar espacios en uno nuevo', () => {
  expect(spellingBoard('MATHEMATICS', undefined, true).parts).toEqual(['MA', 'TH', 'EM', 'AT', 'IC', 'S']);
  expect(spellingBoard('GO OUT').gaps).toEqual([0, 1, 3, 4, 5]);
});
it('cognado compara grafías sin cambiar textos ni inventar coincidencias fonéticas', () => {
  const shared = cognateLetters('SCIENCE', 'ciencia');
  expect(shared.en.map((i) => 'SCIENCE'[i]).join('')).toBe('CIENC');
  expect(shared.es.map((i) => 'ciencia'[i]).join('').toUpperCase()).toBe('CIENC');
  expect(cognateLetters('ABC', 'xyz')).toEqual({ en: [], es: [] });
  expect(cognateLetters('RADIO', 'rádio')).toEqual({ en: [0, 1, 2, 3, 4], es: [0, 1, 2, 3, 4] });
});
