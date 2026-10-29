import { beforeEach, expect, it, vi } from 'vitest';
import { clearTrickCheckpoint, parseTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint } from './trickCheckpoint';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('conserva el paso opcional de preparación y acepta checkpoints anteriores sin ese campo', () => {
  const legacy = { stage: 3, checkIndex: 1, input: '', feedback: 'correct' as const, helped: false, episodeId: 'ing', continuation: { phase: 'build' as const, sentenceIndex: 0, filledSlots: 1, modelUsed: true } };
  expect(parseTrickCheckpoint(legacy)).toEqual(legacy);
  const state = { ...legacy, continuation: { ...legacy.continuation, preparationStep: 1 } };
  writeTrickCheckpoint('isolated', 'preparation', '1', state);
  expect(readTrickCheckpoint('isolated', 'preparation', '1')).toEqual(state);
});
it.each([-1, 1.5, NaN, Infinity, '1', null])('descarta solo preparationStep inválido %s sin borrar la posición ni modificar la entrada', (preparationStep) => {
  const legacy = { stage: 3, checkIndex: 1, input: '', feedback: 'correct' as const, helped: false, episodeId: 'ing', continuation: { phase: 'build' as const, sentenceIndex: 0, filledSlots: 1, modelUsed: true } };
  const raw = { ...legacy, continuation: { ...legacy.continuation, preparationStep } };
  expect(parseTrickCheckpoint(raw)).toEqual(legacy);
  expect(raw.continuation.preparationStep).toBe(preparationStep);
});
it('reanuda el paso, respuesta y pista solo para el usuario y versión correspondientes', () => {
  const checkpoint = { stage: 2, checkIndex: 1, input: "I'm playing", feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', checkpoint);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(checkpoint);
  expect(readTrickCheckpoint('u2', 'trick:play', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '2')).toBeNull();
  clearTrickCheckpoint('u1', 'trick:play');
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toBeNull();
});
it('conserva la identidad aditiva de la tarea y rechaza identidades malformadas sin borrar otros datos', () => {
  const state = { stage: 3, checkIndex: 0, checkId: 'explain', input: '', feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', state);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
  localStorage.setItem('memora-v2.trick.u1.invalid', JSON.stringify({ version: '1', state: { ...state, checkId: 12 } }));
  expect(readTrickCheckpoint('u1', 'invalid', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
});
it('conserva el último envío errado separado del borrador y admite registros antiguos', () => {
  const state = { stage: 3, checkIndex: 2, checkId: 'use', input: 'I am play', correctionResponse: 'I playing', feedback: 'help' as const, helped: true };
  writeTrickCheckpoint('u1', 'trick:play', '1', state);
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
  localStorage.setItem('memora-v2.trick.u1.invalid', JSON.stringify({ version: '1', state: { ...state, correctionResponse: 12 } }));
  expect(readTrickCheckpoint('u1', 'invalid', '1')).toBeNull();
  expect(readTrickCheckpoint('u1', 'trick:play', '1')).toEqual(state);
});

it('conserva dos fallos y el enlace al intento, sin aceptar cuotas inválidas ni borrar otros checkpoints', () => {
  const state = { stage: 3, checkIndex: 0, checkId: 'order-message-v1', input: '', feedback: 'help' as const, helped: true, checkFailures: 2, previousAttemptId: 'first-error' };
  writeTrickCheckpoint('isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
  for (const checkFailures of [-1, 15, 1.5, '2']) {
    localStorage.setItem('memora-v2.trick.isolated.invalid', JSON.stringify({ version: '1', state: { ...state, checkFailures } }));
    expect(readTrickCheckpoint('isolated', 'invalid', '1')).toBeNull();
  }
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
});

it('reanuda episodio y piezas parciales con ayuda sin aceptar índices duplicados o fases inventadas', () => {
  const state = { stage: 3, checkIndex: 1, input: '', feedback: 'correct' as const, helped: false, episodeId: 'ing:short-playing-v1', episodeStartedAt: '2026-10-23T10:00:00.000Z', continuation: { phase: 'build' as const, sentenceIndex: 0, filledSlots: 0, order: [1], failures: 1, modelUsed: true, previousAttempt: 'first' } };
  writeTrickCheckpoint('isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
  for (const continuation of [{ ...state.continuation, order: [1, 1] }, { ...state.continuation, order: [8] }, { ...state.continuation, failures: 3 }, { ...state.continuation, modelUsed: 'true' }, { ...state.continuation, phase: 'finished' }]) {
    localStorage.setItem('memora-v2.trick.isolated.invalid', JSON.stringify({ version: '1', state: { ...state, continuation } }));
    expect(readTrickCheckpoint('isolated', 'invalid', '1')).toBeNull();
  }
  expect(readTrickCheckpoint('isolated', 'valid', '1')).toEqual(state);
});
it('conserva la reflexión libre sin dar dominio y descarta solo un borrador inválido', () => {
  const state = { stage: 9, checkIndex: 0, checkId: 'repair', input: 'reparado', feedback: 'correct' as const, helped: true, reflection: { draft: 'FOR va con LOOKING.', compared: false } };
  writeTrickCheckpoint('reflection-isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('reflection-isolated', 'valid', '1')).toEqual(state);
  for (const reflection of [{ draft: 'a'.repeat(501), compared: false }, { draft: 'x', compared: 'yes' }, null]) {
    localStorage.setItem('memora-v2.trick.reflection-isolated.invalid', JSON.stringify({ version: '1', state: { ...state, reflection } }));
    expect(readTrickCheckpoint('reflection-isolated', 'invalid', '1')).toMatchObject({ stage: 9, input: 'reparado', feedback: 'correct' });
    expect(readTrickCheckpoint('reflection-isolated', 'invalid', '1')?.reflection).toBeUndefined();
  }
});
it('guarda una cola finita de navegación de repaso sin fechas ni afectar checkpoints anteriores', () => {
  const legacy = { stage: 3, checkIndex: 0, input: '', feedback: 'idle' as const, helped: false };
  expect(parseTrickCheckpoint(legacy)).toEqual(legacy);
  const state = { ...legacy, review: { pending: ['write-cold', 'write-key'], total: 2 } };
  writeTrickCheckpoint('review-isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('review-isolated', 'valid', '1')).toEqual(state);
  for (const review of [null, { pending: ['a', 'a'], total: 2 }, { pending: ['a'], total: 0 }, { pending: ['a', 'b'], total: 1 }, { pending: [1], total: 1 }, { pending: [''], total: 1 }, { pending: [], total: 9 }]) {
    expect(parseTrickCheckpoint({ ...legacy, review })).toBeNull();
  }
  expect(parseTrickCheckpoint({ ...legacy, review: { pending: [], total: 2 } })).not.toBeNull();
  expect(readTrickCheckpoint('review-isolated', 'valid', '1')).toEqual(state);
});
it('conserva la vuelta de una tarea migrada y rechaza destinos malformados', () => {
  const state = { stage: 13, checkIndex: 0, checkId: 'write-cold', input: 'I am c', feedback: 'idle' as const, helped: false, resumeAfter: 'not-want' };
  writeTrickCheckpoint('migration-isolated', 'valid', '1', state);
  expect(readTrickCheckpoint('migration-isolated', 'valid', '1')).toEqual(state);
  for (const resumeAfter of [null, 2, '', 'x'.repeat(81)]) expect(parseTrickCheckpoint({ ...state, resumeAfter })).toBeNull();
});
it('conserva el motivo de transferencia sin cambiar el significado del repaso antiguo',()=>{
  const base={stage:3,checkIndex:0,input:'',feedback:'idle' as const,helped:false,review:{pending:['order-tea'],total:1}};
  expect(parseTrickCheckpoint(base)).toEqual(base);
  expect(parseTrickCheckpoint({...base,review:{...base.review,mode:'transfer'}})?.review?.mode).toBe('transfer');
  expect(parseTrickCheckpoint({...base,review:{...base.review,mode:'invented'}})).toBeNull();
});
