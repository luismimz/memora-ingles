import { expect, it } from 'vitest';
import { freshZeroJourney, resumeZeroJourney, zeroAccepts, zeroCoffeePieces, zeroMessages, zeroSteps, zeroWords } from './zeroJourney';
it('el comienzo tiene tres palabras, dos estructuras y una transferencia distinta del modelo inicial', () => {
  expect(new Set(zeroWords.map((word) => word.en)).size).toBe(3);
  expect(zeroWords.every((word) => !word.imageUrl && word.ipa && word.scene && word.associationId)).toBe(true);
  expect([2, 1, 0].map((index) => zeroCoffeePieces[index].text).join(' ').toLowerCase()).toBe('i want coffee');
  expect(zeroMessages.water.en).not.toBe(zeroMessages.coffee.en);
  expect(zeroSteps.indexOf('want')).toBeLessThan(zeroSteps.indexOf('build-coffee'));
  expect(zeroSteps.indexOf('be')).toBeLessThan(zeroSteps.indexOf('write-cold'));
  expect(zeroAccepts("I'm cold", zeroMessages.cold.en)).toBe(true);
  expect(zeroAccepts('I want cold', zeroMessages.cold.en)).toBe(false);
});
it('reanuda el mismo paso y rechaza índices de otra disposición sin tocar otros recorridos', () => {
  const state = freshZeroJourney();
  expect(resumeZeroJourney(state)).toEqual(state);
  expect(resumeZeroJourney({ ...state, checkId: 'write-cold' })).toBeNull();
  expect(resumeZeroJourney({ ...state, order: [4] })).toBeNull();
});
