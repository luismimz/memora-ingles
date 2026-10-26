import { expect, it } from 'vitest';
import { preparedFixture } from '../test/grammarPracticeFixtures';
import type { LearningActivity } from './learningActivity';
import { canReusePiecePreparation, piecePreparationKey } from './piecePreparation';
const slot = preparedFixture.sentence.slots[1], form = preparedFixture.grammar[0];
const event = { phase: 'construction', source: 'learner', modality: 'choice', correct: true, helped: true, pieceSignature: piecePreparationKey(slot, form), prompt: slot.es, response: slot.en, expected: slot.en } as LearningActivity;
it('solo una elección real correcta con contrato exacto abre preparación breve; no es dominio', () => {
  expect(canReusePiecePreparation([event], slot, form)).toBe(true);
  for (const change of [{ correct: false }, { correct: null }, { source: 'authored' }, { phase: 'completion' }, { modality: 'oral' }, { pieceSignature: undefined }, { response: 'otro mensaje' }, { expected: '' }]) expect(canReusePiecePreparation([{ ...event, ...change } as LearningActivity], slot, form)).toBe(false);
});
it('sentido, explicación, opciones o contrato cambiados conservan enseñanza completa', () => {
  expect(canReusePiecePreparation([event], { ...slot, es: 'otro sentido' }, form)).toBe(false);
  expect(canReusePiecePreparation([event], { ...slot, preparation: slot.preparation!.map((step, index) => index ? step : { ...step, explanation: 'Nueva enseñanza' }) }, form)).toBe(false);
  expect(canReusePiecePreparation([event], { ...slot, choices: ['otra pieza', slot.en] }, form)).toBe(false);
  expect(canReusePiecePreparation([event], slot, { ...form, visualContract: 'another-contract' })).toBe(false);
  expect(canReusePiecePreparation([event], undefined, form)).toBe(false);
});
it('un error posterior recupera la enseñanza; una corrección real permite volver a la práctica breve', () => {
  const wrong = { ...event, response: 'otra pieza', correct: false };
  expect(canReusePiecePreparation([event, wrong], slot, form)).toBe(false);
  expect(canReusePiecePreparation([event, wrong, event], slot, form)).toBe(true);
  expect(canReusePiecePreparation([event, { ...event, source: 'authored', correct: null }], slot, form)).toBe(false);
});
