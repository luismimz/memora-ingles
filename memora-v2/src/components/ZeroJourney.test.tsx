import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ZeroJourney } from './ZeroJourney';
import { GrammarOrder } from './GrammarOrder';
import { PlayGrammarToy } from './PlayGrammarToy';
import { dueZeroReviews, freshZeroJourney, zeroJourney, zeroMessages, zeroRecallSteps, zeroSteps, zeroWritingGuide } from '../domain/zeroJourney';
import { readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { ZeroDoorScene, ZeroJourneyScene } from './ZeroJourneyScene';
import { readLearningActivities } from '../domain/learningActivity';
import { readSentenceMemories, readWordMemories, recordSentenceExposure } from '../domain/memory';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { playEnglish } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
const user = 'zero-game-isolated', next = vi.fn(), exit = vi.fn();
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).replace(/\s/gu, '') === label.replace(/\s/gu, ''))!;
const checkpoint = () => readTrickCheckpoint(user, zeroJourney.id, zeroJourney.version)!;
const step = () => checkpoint().checkId;
const events = () => readLearningActivities(user);
const mount = async (inspection = false) => { await act(async () => { tree = create(<ZeroJourney userId={user} inspection={inspection} onExit={exit} onNext={next} />); }); };
const wait = async (ms = 1400) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const activate = async () => { const world = tree.root.findAllByType('button').find((node) => node.props.className === 'zero-world'); await act(async () => world ? world.props.onClick() : tree.root.findByType(PlayGrammarToy).findByProps({ className: 'order-bank' }).findByType('button').props.onClick({ detail: 0 })); };
async function swipe() {
  const region = tree.root.findByProps({ role: 'region' });
  const target = { closest: () => null }, currentTarget = { scrollTop: 0, scrollHeight: 600, clientHeight: 600 };
  await act(async () => { region.props.onTouchStart({ target, currentTarget, touches: [{ clientX: 100, clientY: 350 }] }); region.props.onTouchMove({ target, currentTarget, touches: [{ clientX: 100, clientY: 200 }] }); vi.advanceTimersByTime(230); });
}
async function reachBuild() {
  await mount();
  for (let i = 0; i < 3; i++) { await activate(); await swipe(); }
  expect(step()).toBe('build-coffee');
}
async function solveBuild() {
  await act(async () => { tree.root.findByType(GrammarOrder).props.onChange([2, 1, 0]); tree.root.findByType(GrammarOrder).props.onAnswer('I WANT COFFEE'); });
  await wait();
}
async function reachWriting() {
  await reachBuild(); await solveBuild();
  await act(async () => button('Agua').props.onClick()); await wait();
  await activate(); await swipe(); await activate(); await swipe();
  await act(async () => button('AMestoy').props.onClick()); await wait();
  expect(step()).toBe('not-want'); await activate(); await swipe();
  await act(async () => { tree.root.findByType(GrammarOrder).props.onChange([2, 0, 1]); tree.root.findByType(GrammarOrder).props.onAnswer("I DON'T WANT WATER"); }); await wait();
  expect(step()).toBe('cold-order'); await activate();
  expect(tree.root.findByType(PlayGrammarToy).props).toMatchObject({ revealed: true, token: { text: 'COLD', role: 'context' }, after: { en: 'COFFEE' } });
  await swipe(); expect(step()).toBe('arcade-refusal-action');
  await act(async () => button('← Retirar').props.onClick()); await wait();
  expect(step()).toBe('write-cold-water');
}
async function type(value: string) {
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value } }));
  await wait(500);
}
async function tapPiece(value: string) {
  const bank = tree.root.findByType(GrammarOrder).findByProps({ className: 'order-bank' });
  await act(async () => bank.findAllByType('button').find((node) => text(node) === value)!.props.onClick({ detail: 0 }));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('entra jugando, no muestra botones de comprobar/continuar y el gesto no acredita descubrir', async () => {
  await mount();
  expect(tree.root.findAllByProps({ className: 'card-vertical-next' })).toHaveLength(0);
  expect(tree.root.findAllByType('button').some((node) => /comprobar|continuar/iu.test(text(node)))).toBe(false);
  await swipe(); expect(step()).toBe('water'); expect(events()).toEqual([]);
  await activate(); expect(events()).toMatchObject([{ source: 'authored', correct: null, response: 'WATER' }]);
  await wait(60000); expect(step()).toBe('water'); expect(readWordMemories(user)).toEqual([]);
  expect(playEnglish).toHaveBeenCalledWith('WATER');
  await swipe(); expect(step()).toBe('coffee');
});
it('un doble toque no duplica el modelo ni convierte la exploración en acierto', async () => {
  await mount();
  const touch = tree.root.findByProps({ className: 'zero-world' }).props.onClick;
  await act(async () => { touch(); touch(); });
  expect(events()).toHaveLength(1); expect(events()[0].correct).toBeNull();
  expect(readWordMemories(user)).toEqual([]);
});
it('el menú no queda tapando el reto tras una acción y Escape lo cierra sin registrar aprendizaje', async () => {
  await mount();
  const menu = tree.root.findByProps({ className: 'zero-menu' });
  const currentTarget = { open: true };
  act(() => menu.props.onClick({ target: { closest: () => ({ tagName: 'BUTTON' }) }, currentTarget }));
  expect(currentTarget.open).toBe(false);
  currentTarget.open = true;
  const preventDefault = vi.fn(), stopPropagation = vi.fn();
  act(() => menu.props.onKeyDown({ key: 'Escape', currentTarget, preventDefault, stopPropagation }));
  expect(currentTarget.open).toBe(false); expect(preventDefault).toHaveBeenCalledOnce();
  expect(events()).toEqual([]);
});
it('usa estructuras para pedidos nuevos, rechazos y una puerta sin copiar los mensajes transferidos', async () => {
  await reachWriting();
  expect(readGrammarAttempts(user)).toEqual([]);
  expect(events().filter((event) => event.modality === 'writing')).toEqual([]);
  expect(events().some((event) => event.source === 'authored' && event.response === 'I want cold water.')).toBe(false);
  await type('I want cold water.'); await wait(); expect(step()).toBe('key');
  expect(tree.root.findAllByType(ZeroJourneyScene)).toHaveLength(0);
  expect(tree.root.findAllByType(ZeroDoorScene)).toHaveLength(1);
  await activate(); await swipe(); expect(step()).toBe('have');
  expect(text(tree.toJSON())).toContain('A KEY'); await activate(); await swipe();
  expect(step()).toBe('have-meaning');
  await act(async () => button('HAVEtengo').props.onClick()); await wait();
  expect(step()).toBe('write-key');
  expect(events().some((event) => event.source === 'authored' && event.response === 'I want a key.')).toBe(false);
  await type('I want a key.'); await wait();
  expect(step()).toBe('complete'); expect(next).toHaveBeenCalledOnce();
  expect(readGrammarAttempts(user)).toHaveLength(2);
  expect(readGrammarAttempts(user).every((attempt) => attempt.kind === 'write' && attempt.correct && !attempt.helped)).toBe(true);
  expect(readSentenceMemories(user).filter((memory) => memory.correct > 0)).toHaveLength(2);
  expect(events().filter((event) => event.phase === 'completion')).toMatchObject([{ correct: null }]);
  expect(readWordMemories(user).map((memory) => memory.word.en).sort()).toEqual(['COLD', 'KEY', 'WATER']);
});
it('conserva piezas, primer error y demora al recargar; dos fallos ofrecen modelo sin acierto', async () => {
  await reachBuild();
  await act(async () => { tree.root.findByType(GrammarOrder).props.onChange([0, 1]); tree.root.findByType(GrammarOrder).props.onAnswer('COFFEE WANT I'); });
  const first = events().find((event) => event.correct === false)!;
  act(() => tree.unmount()); await wait(7000); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([0, 1]);
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('WANT COFFEE I'));
  expect(events().filter((event) => event.correct === false)[1]).toMatchObject({ parentAttemptId: first.id });
  expect(events().filter((event) => event.correct === false)[1].responseDelayMs).toBeGreaterThanOrEqual(7000);
  await wait(20000); expect(step()).toBe('build-coffee');
  expect(events().filter((event) => event.correct === true)).toEqual([]);
  await swipe(); expect(step()).toBe('arcade-water');
});
it('Arcade solo cuenta sobre material ya enseñado, y caducar es omisión neutral', async () => {
  await reachBuild(); await solveBuild(); expect(step()).toBe('arcade-water');
  const memories = readWordMemories(user);
  await wait(11000);
  expect(checkpoint()).toMatchObject({ checkFailures: 2, helped: true });
  expect(events().at(-1)).toMatchObject({ source: 'authored', correct: null, response: 'I want water.' });
  expect(readWordMemories(user)).toEqual(memories);
  await swipe(); expect(step()).toBe('cold');
});
it('modo tranquilo y pausa detienen reloj/avance; reiniciar no borra intentos ni memoria', async () => {
  await reachBuild();
  await act(async () => button('Modo tranquilo').props.onClick());
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I WANT COFFEE'));
  await wait(20000); expect(step()).toBe('build-coffee');
  await swipe(); expect(step()).toBe('arcade-water'); await wait(20000);
  expect(checkpoint().checkFailures).toBe(0);
  await act(async () => button('Pausar').props.onClick());
  expect(text(tree.toJSON())).toContain('En pausa');
  await wait(20000); expect(step()).toBe('arcade-water');
  await act(async () => button('Reanudar').props.onClick());
  await act(async () => button('Agua').props.onClick());
  const before = events(), memories = readWordMemories(user);
  await act(async () => button('Volver al comienzo de este episodio').props.onClick());
  await wait(5000); expect(step()).toBe('water'); expect(events()).toEqual(before); expect(readWordMemories(user)).toEqual(memories);
});
it('la escritura no pasa por scroll ni por un borrador equivocado, y la ayuda no se convierte en recuerdo libre', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-cold'), checkId: 'write-cold' });
  await mount();
  await swipe(); expect(step()).toBe('write-cold');
  const beforeDraft = events().filter((event) => event.source === 'learner').length;
  await type('I cold'); await wait(5000);
  expect(events().filter((event) => event.source === 'learner')).toHaveLength(beforeDraft);
  expect(events().at(-1)).toMatchObject({ source: 'authored', correct: null, feedback: 'Pista de borrador: no es un envío ni un error.' });
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  await type('I am cold'); await wait();
  expect(readGrammarAttempts(user).filter((attempt) => attempt.check === 'write-cold')).toMatchObject([{ correct: false, helped: true }, { correct: true, helped: true }]);
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === 'I am cold.')?.correct ?? 0).toBe(0);
});

it('desatasca la captura ya guardada: señala WHATER, corrige solo esa palabra y sigue como práctica asistida', async () => {
  const saved = { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-cold-water'), checkId: 'write-cold-water', input: 'i want cold whater', feedback: 'help' as const, helped: true, checkFailures: 1, previousAttemptId: 'first-error', correctionResponse: 'i want cold whater' };
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, saved);
  await mount();
  expect(tree.root.findByType('input').props.value).toBe(saved.input);
  expect(tree.root.findByType('del').children).toEqual(['whater']);
  expect(text(tree.toJSON())).toContain('WATER');
  expect(text(tree.toJSON())).not.toContain('En •••');
  expect(events()).toEqual([]);
  await act(async () => button('Corregir esta palabra').props.onClick());
  expect(checkpoint()).toMatchObject({ episodeId: saved.episodeId, input: 'i want cold water', helped: true, feedback: 'correct', checkFailures: 1 });
  expect(events()).toMatchObject([{ phase: 'construction', modality: 'choice', correct: true, helped: true, parentAttemptId: 'first-error', response: 'i want cold water' }]);
  expect(readGrammarAttempts(user)).toMatchObject([{ kind: 'choose', helped: true, correct: true }]);
  expect(readSentenceMemories(user)).toMatchObject([{ correct: 0 }]);
  expect(readWordMemories(user)).toEqual([]);
  expect(text(tree.toJSON())).toContain('Con ayuda');
  await wait(); expect(step()).toBe('key');
});

it('orienta cada errata distinta sin inventar envíos y al editar retira el rojo sin borrar primer intento', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-cold-water'), checkId: 'write-cold-water' });
  await mount(); await type('i want cold whater'); await wait(700);
  expect(tree.root.findByType('del').children).toEqual(['whater']);
  expect(events()).toMatchObject([{ source: 'authored', correct: null, helped: true }]);
  expect(readGrammarAttempts(user)).toEqual([]);
  await type('i want cold watre');
  expect(tree.root.findAllByType('del')).toHaveLength(0);
  await wait(700); expect(tree.root.findByType('del').children).toEqual(['watre']);
  expect(events()).toHaveLength(2);
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  const first = events().find((event) => event.correct === false)!;
  await type('i want cold w');
  expect(checkpoint()).toMatchObject({ feedback: 'idle', checkFailures: 1, previousAttemptId: first.id, helped: true });
  await wait(2000); expect(events().filter((event) => event.correct === false)).toHaveLength(1);
  await type('i want cold water'); await wait();
  expect(readGrammarAttempts(user)).toMatchObject([{ kind: 'write', correct: false, helped: true }, { kind: 'write', correct: true, helped: true }]);
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === zeroMessages.coldWater.en)?.correct ?? 0).toBe(0);
  expect(step()).toBe('key');
});

it('ofrece bloques espejo a la vista, conserva el montaje al recargar y lo termina sin exigir copiar después', async () => {
  const saved = { ...freshZeroJourney(['write-cold-water', 'write-key']), input: 'no se', previousAttemptId: 'original-error', helped: true, checkFailures: 1 };
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, saved);
  await mount(); expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  await act(async () => button('🧩 Armar juntos').props.onClick());
  expect(text(tree.root.findByProps({ className: 'zero-mirror' }))).toContain('COLD fría');
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  expect(events()).toMatchObject([{ source: 'authored', phase: 'construction', correct: null, helped: true }]);
  await tapPiece('I'); await tapPiece('WANT');
  expect(checkpoint()).toMatchObject({ input: 'no se', previousAttemptId: 'original-error', continuation: { order: [1, 2], filledSlots: 2, modelUsed: true } });
  act(() => tree.unmount()); await wait(6000); await mount();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([1, 2]);
  await tapPiece('COLD'); await tapPiece('WATER');
  expect(checkpoint()).toMatchObject({ feedback: 'correct', helped: true, episodeId: saved.episodeId });
  const learner = events().filter((event) => event.source === 'learner');
  expect(learner).toMatchObject([{ modality: 'choice', correct: true, helped: true, parentAttemptId: 'original-error', response: 'I WANT COLD WATER' }]);
  expect(learner[0].responseDelayMs).toBeGreaterThanOrEqual(6000);
  expect(readGrammarAttempts(user)).toMatchObject([{ kind: 'choose', correct: true, helped: true }]);
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === zeroMessages.coldWater.en)?.correct).toBe(0);
  await wait(); expect(step()).toBe('write-key'); expect(checkpoint().continuation).toBeUndefined();
  expect(checkpoint().review).toEqual({ pending: ['write-key'], total: 2 });
});

it.each(zeroRecallSteps)('la salida asistida funciona también en %s, sin crear escritura o recuerdo libre', async (id) => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf(id), checkId: id, input: 'borrador propio' });
  await mount(); await act(async () => button('🧩 Armar juntos').props.onClick());
  for (const part of zeroWritingGuide(id).model) await tapPiece(part.en);
  expect(checkpoint()).toMatchObject({ feedback: 'correct', helped: true });
  expect(readGrammarAttempts(user)).toMatchObject([{ kind: 'choose', correct: true, helped: true }]);
  expect(events().some((event) => event.modality === 'writing')).toBe(false);
  expect(readSentenceMemories(user).every((memory) => memory.correct === 0)).toBe(true);
  expect(readWordMemories(user)).toEqual([]);
});

it('dos errores escritos no cierran la reparación y dos montajes fallidos ofrecen salida neutral, sin bucle', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-cold-water'), checkId: 'write-cold-water', input: 'i want cold whater', feedback: 'help', helped: true, checkFailures: 2 });
  await mount(); expect(button('Corregir esta palabra')).toBeDefined();
  await act(async () => button('🧩 Armar juntos').props.onClick());
  for (const part of ['WATER', 'I', 'WANT', 'COLD']) await tapPiece(part);
  expect(checkpoint().continuation?.failures).toBe(1);
  act(() => tree.unmount()); await mount();
  expect(checkpoint().continuation?.failures).toBe(1);
  const line = tree.root.findByProps({ 'aria-label': 'Tu mensaje ordenado' });
  await act(async () => line.findAllByType('button')[0].props.onClick({ detail: 0 }));
  // Put WATER second instead of last: another real, different wrong order.
  await act(async () => tree.root.findByType(GrammarOrder).props.onChange([1, 0, 2]));
  await tapPiece('COLD');
  expect(checkpoint().continuation?.failures).toBe(2);
  expect(tree.root.findByType(GrammarOrder).props.locked).toBe(true);
  expect(text(tree.toJSON())).toContain('Puedes deslizar y seguir sin repetir');
  expect(events().filter((event) => event.correct === false)).toHaveLength(2);
  expect(events().filter((event) => event.correct === true)).toEqual([]);
  expect(readSentenceMemories(user).every((memory) => memory.correct === 0)).toBe(true);
  await swipe(); expect(step()).toBe('key'); expect(checkpoint().continuation).toBeUndefined();
});

it('la ayuda no actúa por una pausa ni persiste datos al inspeccionar', async () => {
  await reachWriting(); await type('i want cold whater');
  await act(async () => button('Pausar').props.onClick());
  const before = events(); await wait(3000); expect(events()).toEqual(before);
  await act(async () => button('Reanudar').props.onClick());
  expect(tree.root.findAllByType('del')).toHaveLength(0);
  await type('i want cold watre'); await wait(700);
  expect(tree.root.findByType('del').children).toEqual(['watre']);
  act(() => tree.unmount());
  const saved = checkpoint(), recorded = events(), memories = readSentenceMemories(user);
  await mount(true); // Inspection starts fresh and never restores the real learner's draft.
  await activate(); await swipe();
  expect(checkpoint()).toEqual(saved); expect(events()).toEqual(recorded); expect(readSentenceMemories(user)).toEqual(memories);
});
it('un episodio terminado en la versión anterior entra en lo nuevo; un borrador pendiente se conserva', async () => {
  const old = { ...freshZeroJourney(), stage: 10, checkId: 'handoff', feedback: 'correct' as const, input: 'I want coffee.' };
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, old);
  await mount(); expect(step()).toBe('not-want'); expect(next).not.toHaveBeenCalled(); expect(events()).toEqual([]);
  act(() => tree.unmount());
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...old, stage: 9, checkId: 'write-coffee', feedback: 'idle', input: 'I want co', checkFailures: 1, helped: true });
  await mount(); expect(step()).toBe('write-coffee'); expect(tree.root.findByType('input').props.value).toBe('I want co');
  await type('I want coffee'); await wait(); expect(step()).toBe('not-want');
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: true, helped: true }]);
});
it('un borrador de frío anterior no salta la enseñanza nueva ni exige escribirlo dos veces', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: 8, checkId: 'write-cold', input: 'I am c' });
  await mount(); expect(tree.root.findByType('input').props.value).toBe('I am c');
  expect(checkpoint().resumeAfter).toBe('not-want');
  act(() => tree.unmount()); await mount(); expect(checkpoint().resumeAfter).toBe('not-want');
  await type('I am cold'); await wait(); expect(step()).toBe('not-want');
  expect(checkpoint().resumeAfter).toBeUndefined();
  await activate(); await swipe();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer("I DON'T WANT WATER")); await wait();
  await activate(); await swipe();
  await act(async () => button('← Retirar').props.onClick()); await wait();
  expect(step()).toBe('write-cold-water');
  await type('I want cold water'); await wait(); expect(step()).toBe('key');
  expect(readGrammarAttempts(user).filter((attempt) => attempt.check === 'write-cold')).toHaveLength(1);
});
it('la nueva escritura conserva primer error/demora; el modelo no crea acierto ni puerta abierta', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-key'), checkId: 'write-key' });
  await mount(); await type('I have a key');
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(tree.root.findByType(ZeroDoorScene).props.opened).toBe(false);
  expect(readSentenceMemories(user)).toEqual([]);
  const first = events().find((event) => event.correct === false)!;
  act(() => tree.unmount()); await wait(6000); await mount();
  expect(tree.root.findByType('input').props.value).toBe('I have a key');
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  const attempts = events().filter((event) => event.correct === false);
  expect(attempts[1]).toMatchObject({ parentAttemptId: first.id, helped: true });
  expect(attempts[1].responseDelayMs).toBeGreaterThanOrEqual(6000);
  expect(readSentenceMemories(user)).toMatchObject([{ sentenceEn: 'I want a key.', correct: 0 }]);
  expect(tree.root.findByType(ZeroDoorScene).props.opened).toBe(false);
  await wait(10000); expect(step()).toBe('write-key');
  await swipe(); expect(step()).toBe('complete');
  expect(events().filter((event) => event.correct === true)).toEqual([]);
});
it('la elección señala la opción tocada; tener no se confunde con querer y el error conserva su ayuda', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('have-meaning'), checkId: 'have-meaning' });
  await mount(); await act(async () => button('WANTquiero').props.onClick());
  expect(button('WANTquiero').props.className).toBe('is-answer-wrong');
  expect(button('WANTquiero').props['aria-pressed']).toBe(true);
  expect(text(tree.toJSON())).toContain('HAVE: ya la tienes. WANT: la quieres.');
  await act(async () => button('HAVEtengo').props.onClick());
  expect(button('HAVEtengo').props.className).toBe('is-answer-correct');
  expect(events().filter((event) => event.source === 'learner')).toMatchObject([{ response: 'WANT', correct: false, helped: true }, { response: 'HAVE', correct: true, helped: true }]);
  expect(readWordMemories(user)).toEqual([]); await wait(); expect(step()).toBe('write-key');
});
it('el segundo Arcade caducado muestra el rechazo completo, no afirma haber entregado una bebida', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('arcade-refusal'), checkId: 'arcade-refusal' });
  await mount(); await wait(11000);
  expect(events()).toMatchObject([{ source: 'authored', response: "I don't want coffee.", correct: null }]);
  expect(readWordMemories(user)).toEqual([]);
  await wait(15000); expect(step()).toBe('arcade-refusal');
  await swipe(); expect(step()).toBe('write-cold-water');
});
it('el nuevo Arcade de retirar conserva el primer error y la acción española, no inventa una palabra producida', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('arcade-refusal-action'), checkId: 'arcade-refusal-action' });
  await mount(); await swipe(); expect(step()).toBe('arcade-refusal-action');
  await act(async () => button('Dejar →').props.onClick());
  const first = events().at(-1)!;
  expect(first).toMatchObject({ phase: 'arcade', modality: 'choice', response: 'DEJAR', expected: 'RETIRAR', responseLanguage: 'es', correct: false, helped: true });
  await act(async () => button('← Retirar').props.onClick());
  expect(events().at(-1)).toMatchObject({ response: 'RETIRAR', correct: true, parentAttemptId: first.id, helped: true });
  expect(readWordMemories(user)).toEqual([]); expect(readGrammarAttempts(user)).toEqual([]);
  await wait(); expect(step()).toBe('write-cold-water');
});
it('vuelve a una escena según la fecha del SRS sin repetir modelos ni acreditar una visita', async () => {
  const start = Date.now();
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.coldWater);
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.wantKey);
  recordSentenceExposure(user, 'otro-curso', zeroMessages.cold);
  // The have-model has no corresponding written review in this release.
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.haveKey);
  expect(dueZeroReviews(user, start)).toEqual([]);
  vi.setSystemTime(start + 3_600_001);
  const due = dueZeroReviews(user);
  expect(due).toEqual(['write-cold-water', 'write-key']);
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('complete'), checkId: 'complete' });
  await mount(); expect(step()).toBe('write-cold-water');
  expect(checkpoint().review).toEqual({ pending: due, total: 2 });
  expect(text(tree.toJSON())).toContain('SIN VOLVER A MIRAR');
  expect(events()).toEqual([]); expect(playEnglish).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(GrammarOrder)).toHaveLength(0);
  expect(text(tree.toJSON())).not.toContain('I want cold water');
  await type('I want cold water'); await wait(); expect(step()).toBe('write-key');
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === zeroMessages.coldWater.en)?.step).toBe(1);
  await type('I want a key'); await wait(); expect(step()).toBe('complete');
  expect(checkpoint().review).toEqual({ pending: [], total: 2 });
  expect(next).toHaveBeenCalledOnce();
  expect(dueZeroReviews(user)).toEqual([]);
  expect(readGrammarAttempts(user).every((attempt) => attempt.correct && !attempt.helped)).toBe(true);
});
it('un repaso reanuda su borrador/cola; consultar modelo no lo declara recordado ni repite la tarea en esa visita', async () => {
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.coldWater);
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.wantKey);
  const original = readSentenceMemories(user);
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, freshZeroJourney(['write-cold-water', 'write-key']));
  await mount(); await type('I want water cold');
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  const first = events().find((event) => event.correct === false)!;
  act(() => tree.unmount()); await wait(5000); await mount();
  expect(step()).toBe('write-cold-water'); expect(tree.root.findByType('input').props.value).toBe('I want water cold');
  expect(checkpoint().review?.pending).toEqual(['write-cold-water', 'write-key']);
  await act(async () => button('Ver una ayuda').props.onClick());
  expect(events().at(-1)).toMatchObject({ correct: null, source: 'authored' });
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: false, helped: false }]);
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === zeroMessages.coldWater.en)).toMatchObject({ correct: 0, lapses: 1 });
  await swipe(); expect(step()).toBe('write-key');
  await act(async () => button('Ver una ayuda').props.onClick()); await swipe();
  expect(step()).toBe('complete'); expect(next).toHaveBeenCalledOnce();
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === zeroMessages.wantKey.en)).toEqual(original.find((memory) => memory.sentenceEn === zeroMessages.wantKey.en));
  expect(events().filter((event) => event.correct === false)).toMatchObject([{ id: first.id }]);
  expect(events().filter((event) => event.correct === true)).toEqual([]);
});
it('una tarea aún empezada tiene prioridad sobre repasos nuevos que venzan al recargar', async () => {
  recordSentenceExposure(user, zeroJourney.id, zeroMessages.wantKey, new Date(Date.now() - 86_400_000));
  const pending = { ...freshZeroJourney(), stage: zeroSteps.indexOf('build-no-water'), checkId: 'build-no-water', order: [2], helped: true };
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, pending);
  await mount(); expect(step()).toBe('build-no-water');
  expect(checkpoint().review).toBeUndefined();
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([2]);
});
it('una construcción casi terminada recibe pista sin Enter ni rojo; recarga conserva la ayuda y acertar con ella no da recuerdo libre', async () => {
  writeTrickCheckpoint(user, zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('write-key'), checkId: 'write-key' });
  await mount(); await type('I want'); await wait(2000); expect(events()).toEqual([]);
  await type('I want key'); await wait(1000);
  expect(readGrammarAttempts(user)).toEqual([]);
  expect(tree.root.findByProps({ className: 'game-card-anchor card-vertical zero-card' }).props['data-feedback']).toBeUndefined();
  expect(text(tree.toJSON())).toContain('Una llave se dice A KEY.');
  expect(events()).toMatchObject([{ source: 'authored', correct: null, helped: true }]);
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Una llave se dice A KEY.');
  expect(tree.root.findByType('input').props.value).toBe('I want key');
  await type('I want a key'); await wait();
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: true, helped: true }]);
  expect(readSentenceMemories(user).some((memory) => memory.correct > 0)).toBe(false);
});
it('inspección no guarda y desmontar cancela una transición pendiente', async () => {
  await mount(true); await activate(); await swipe();
  expect(events()).toEqual([]); expect(readTrickCheckpoint(user, zeroJourney.id, zeroJourney.version)).toBeNull();
  act(() => tree.unmount()); await reachBuild();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I WANT COFFEE'));
  act(() => tree.unmount()); await wait(5000);
  expect(step()).toBe('build-coffee'); expect(next).not.toHaveBeenCalled();
});
