import { expect, it } from 'vitest';
import { freshZeroJourney, nextZeroStep, resumeZeroJourney, zeroAccepts, zeroCorrection, zeroDraftCue, zeroCoffeePieces, zeroNoWaterPieces, zeroMessages, zeroRecallSteps, zeroSpellingRepair, zeroSteps, zeroTask, zeroWords, zeroWritingGuide } from './zeroJourney';
it('cada transferencia sigue a la enseñanza de sus piezas y usa un mensaje diferente', () => {
  expect(new Set(zeroWords.map((word) => word.en)).size).toBe(4);
  expect(zeroWords.every((word) => !word.imageUrl && word.ipa && word.scene && word.associationId)).toBe(true);
  expect([2, 1, 0].map((index) => zeroCoffeePieces[index].text).join(' ').toLowerCase()).toBe('i want coffee');
  expect(zeroMessages.water.en).not.toBe(zeroMessages.coffee.en);
  expect(zeroSteps.indexOf('want')).toBeLessThan(zeroSteps.indexOf('build-coffee'));
  expect(zeroSteps.indexOf('be')).toBeLessThan(zeroSteps.indexOf('write-cold'));
  expect(zeroSteps.indexOf('not-want')).toBeLessThan(zeroSteps.indexOf('build-no-water'));
  expect(zeroSteps.indexOf('cold-order')).toBeLessThan(zeroSteps.indexOf('write-cold-water'));
  expect(zeroSteps.indexOf('have')).toBeLessThan(zeroSteps.indexOf('write-key'));
  expect([2, 0, 1].map((index) => zeroNoWaterPieces[index].text).join(' ').toLowerCase()).toBe("i don't want water");
  expect(zeroMessages.coldWater.en).not.toBe(zeroMessages.coldCoffee.en);
  expect(zeroMessages.wantKey.en).not.toBe(zeroMessages.haveKey.en);
  expect(zeroAccepts("I'm cold", zeroMessages.cold.en)).toBe(true);
  expect(zeroAccepts('I want cold', zeroMessages.cold.en)).toBe(false);
  expect(zeroAccepts('I do not want coffee', zeroMessages.noCoffee.en)).toBe(true);
  expect(zeroAccepts('I want coffee', zeroMessages.noCoffee.en)).toBe(false);
  expect(zeroAccepts('I have a key', zeroMessages.wantKey.en)).toBe(false);
  expect(zeroTask('write-cold-water').words.map((word) => word.en)).toEqual(['WATER', 'COLD']);
});

it('repara la errata de la captura sin aceptarla como respuesta y prepara ayuda bilingüe para cada escritura', () => {
  const draft = 'i want cold whater';
  expect(zeroAccepts(draft, zeroMessages.coldWater.en)).toBe(false);
  expect(zeroDraftCue('write-cold-water', draft)).toBe('whater → WATER. El resto de tu frase está bien.');
  expect(zeroSpellingRepair('write-cold-water', draft)?.corrected).toBe('i want cold water');
  expect(zeroSpellingRepair('cold-order', draft)).toBeUndefined();
  for (const step of zeroRecallSteps) {
    const guide = zeroWritingGuide(step);
    expect(zeroAccepts(guide.model.map((part) => part.en).join(' '), zeroTask(step).expected)).toBe(true);
    expect(guide.model.every((part) => part.es && part.role)).toBe(true);
    expect(guide.pieces.map((part) => part.text).sort()).toEqual(guide.model.map((part) => part.en).sort());
    expect(guide.pieces[0].text).not.toBe('I');
  }
  expect(zeroWritingGuide('write-cold').model).toContainEqual({ en: 'AM COLD', es: 'tengo frío', role: 'verb' });
});

it('reanuda el montaje asistido y rechaza índices, huecos o continuaciones de otra actividad', () => {
  const saved = { ...freshZeroJourney(['write-cold-water', 'write-key']), input: 'i want cold whater', helped: true, checkFailures: 1, previousAttemptId: 'first-error', continuation: { phase: 'build' as const, sentenceIndex: 0, filledSlots: 2, modelUsed: true, order: [1, 2], failures: 1 as const } };
  expect(resumeZeroJourney(saved)).toEqual(saved);
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, order: [1, 1] } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, order: [1, -1] } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, order: [1, 4] } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, order: [1, 1.5] } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, filledSlots: 1 } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, modelUsed: false } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, continuation: { ...saved.continuation, phase: 'conversation' } })).toBeNull();
  expect(resumeZeroJourney({ ...saved, checkId: 'build-coffee', review: undefined })).toBeNull();
});
it('da una reparación del error observado, no una orden genérica de volver a escuchar', () => {
  expect(zeroCorrection('write-cold-water', 'I want water cold')).toContain('COLD va delante');
  expect(zeroCorrection('write-key', 'I have a key')).toContain('WANT, quiero');
  expect(zeroCorrection('write-key', 'I want key')).toContain('A KEY');
  expect(zeroCorrection('use-refusal', 'I want coffee')).toContain("DON'T WANT rechaza");
  expect(zeroCorrection('write-cold', 'I have cold')).toContain('En esta expresión');
  expect(zeroAccepts('I don’t want coffee', zeroMessages.noCoffee.en)).toBe(true);
  expect(zeroTask('not-want').target).toBe('No quiero café.');
  expect(zeroTask('have').target).toBe('Tengo una llave.');
  expect(zeroDraftCue('write-key', 'I want')).toBeUndefined();
  expect(zeroDraftCue('write-key', 'I want a k')).toBeUndefined();
  expect(zeroDraftCue('write-key', 'I want key')).toContain('A KEY');
  expect(zeroDraftCue('use-refusal', 'I dont want coffee')).toContain('apóstrofo');
});
it('migra por identidad, conserva borradores e historial, y rechaza piezas inválidas', () => {
  const state = freshZeroJourney();
  expect(resumeZeroJourney(state)).toEqual(state);
  expect(resumeZeroJourney({ ...state, stage: 8, checkId: 'write-cold', input: 'I am c', helped: true, previousAttemptId: 'previous' })).toMatchObject({ stage: zeroSteps.indexOf('write-cold'), input: 'I am c', helped: true, previousAttemptId: 'previous', resumeAfter: 'not-want' });
  expect(resumeZeroJourney({ ...state, checkId: 'another-route' })).toBeNull();
  expect(resumeZeroJourney({ ...state, order: [4] })).toBeNull();
  expect(resumeZeroJourney({ ...state, checkId: 'build-no-water', order: [2, 0] })?.order).toEqual([2, 0]);
  expect(resumeZeroJourney({ ...state, checkId: 'build-no-water', order: [2, 2] })).toBeNull();
  expect(resumeZeroJourney({ ...state, checkId: 'handoff' })).toMatchObject({ checkId: 'not-want', feedback: 'idle', input: '', helped: false, episodeId: state.episodeId });
  expect(nextZeroStep('write-key')).toBe('complete');
  expect(nextZeroStep('write-coffee')).toBe('not-want');
  expect(resumeZeroJourney(freshZeroJourney(['write-key']))).toMatchObject({ checkId: 'write-key', review: { pending: ['write-key'], total: 1 } });
  expect(resumeZeroJourney({ ...freshZeroJourney(['write-key']), checkId: 'water' })).toBeNull();
  expect(resumeZeroJourney({ ...freshZeroJourney(['write-key']), review: { pending: ['have'], total: 1 } })).toBeNull();
  expect(resumeZeroJourney({ ...state, resumeAfter: 'write-key' })).toBeNull();
});
