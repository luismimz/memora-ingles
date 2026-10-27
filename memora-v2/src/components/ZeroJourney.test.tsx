import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ZeroJourney } from './ZeroJourney';
import { GrammarOrder } from './GrammarOrder';
import { zeroJourney } from '../domain/zeroJourney';
import { readTrickCheckpoint } from '../domain/trickCheckpoint';
import { readLearningActivities } from '../domain/learningActivity';
import { readSentenceMemories, readWordMemories } from '../domain/memory';
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
const activate = async () => { await act(async () => tree.root.findAllByType('button').find((node) => node.props.className === 'zero-world' || node.props.className === 'zero-verb')!.props.onClick()); };
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
  await act(async () => button('💧Agua').props.onClick()); await wait();
  await activate(); await swipe(); await activate(); await swipe();
  await act(async () => button('AMestoy').props.onClick()); await wait();
  expect(step()).toBe('write-cold');
}
async function type(value: string) {
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value } }));
  await wait(500);
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
it('recorre dos intenciones y produce sin piezas tras actividades intermedias, sin prometer dominio', async () => {
  await reachWriting();
  expect(readGrammarAttempts(user)).toEqual([]);
  expect(events().filter((event) => event.modality === 'writing')).toEqual([]);
  await type('I am cold.'); await wait(); expect(step()).toBe('write-coffee');
  await type('I want coffee.'); await wait();
  expect(step()).toBe('handoff'); expect(next).toHaveBeenCalledOnce();
  expect(readGrammarAttempts(user)).toMatchObject([{ kind: 'write', correct: true, helped: false }, { kind: 'write', correct: true, helped: false }]);
  expect(readSentenceMemories(user).filter((memory) => memory.correct > 0)).toHaveLength(2);
  expect(events().filter((event) => event.phase === 'completion')).toMatchObject([{ correct: null }]);
  expect(readWordMemories(user).map((memory) => memory.word.en).sort()).toEqual(['COFFEE', 'COLD', 'WATER']);
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
  expect(events().at(-1)).toMatchObject({ source: 'authored', correct: null, response: 'WATER' });
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
  await act(async () => button('💧Agua').props.onClick());
  const before = events(), memories = readWordMemories(user);
  await act(async () => button('Volver al comienzo de este episodio').props.onClick());
  await wait(5000); expect(step()).toBe('water'); expect(events()).toEqual(before); expect(readWordMemories(user)).toEqual(memories);
});
it('la escritura no pasa por scroll ni por un borrador equivocado, y la ayuda no se convierte en recuerdo libre', async () => {
  await reachWriting();
  await swipe(); expect(step()).toBe('write-cold');
  await type('I cold'); await wait(5000); expect(events().some((event) => event.modality === 'writing')).toBe(false);
  await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  await type('I am cold'); await wait();
  expect(readGrammarAttempts(user)).toMatchObject([{ correct: false, helped: false }, { correct: true, helped: true }]);
  expect(readSentenceMemories(user).find((memory) => memory.sentenceEn === 'I am cold.')?.correct ?? 0).toBe(0);
});
it('inspección no guarda y desmontar cancela una transición pendiente', async () => {
  await mount(true); await activate(); await swipe();
  expect(events()).toEqual([]); expect(readTrickCheckpoint(user, zeroJourney.id, zeroJourney.version)).toBeNull();
  act(() => tree.unmount()); await reachBuild();
  await act(async () => tree.root.findByType(GrammarOrder).props.onAnswer('I WANT COFFEE'));
  act(() => tree.unmount()); await wait(5000);
  expect(step()).toBe('build-coffee'); expect(next).not.toHaveBeenCalled();
});
