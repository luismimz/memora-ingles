import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MicroArcade } from './MicroArcade';
import { previewUnit } from '../preview/previewUnit';
import { microRounds } from '../domain/microArcade';
import { readWordMemories, recordWordRecall } from '../domain/memory';
import { readLearningActivities } from '../domain/learningActivity';
import { readAttempts } from '../domain/learningProfile';
import { recordActiveWordAttempt } from '../domain/activeRecall';
import { playEnglish, type PlaybackResult } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'browser' })), playSpanish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const user = 'listening-isolated';
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => (node.props['aria-label'] ?? text(node).trim()) === label)!;
const region = () => tree.root.findByProps({ role: 'region' });
async function swipe() {
  const event = { target: { closest: () => null }, currentTarget: { scrollTop: 0, scrollHeight: 600, clientHeight: 600 } };
  await act(async () => {
    region().props.onTouchStart({ ...event, touches: [{ clientY: 400 }] });
    region().props.onTouchMove({ ...event, touches: [{ clientY: 200 }] });
    region().props.onTouchEnd();
    vi.advanceTimersByTime(230);
  });
}
async function mount(unit = previewUnit, initialRound = 1, onExit = () => {}) { await act(async () => { tree = create(<MicroArcade userId={user} units={[unit]} inspection={false} initialRound={initialRound} onExit={onExit} automatic />); }); }
beforeEach(() => {
  vi.useFakeTimers(); vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'played', source: 'browser' });
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: true }) });
  for (const word of previewUnit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('escucha sin revelar la palabra, exige reproducción completada y registra capacidad auditiva con opciones', async () => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  expect(text(tree.toJSON())).toContain('ESCUCHA Y CONECTA');
  const choices = tree.root.findByProps({ 'aria-label': 'Significados preparados' }).findAllByType('button');
  expect(choices.every((node) => node.props.disabled)).toBe(true);
  expect(text(tree.toJSON())).not.toContain(target.en);
  await act(async () => button(target.es).props.onClick());
  expect(readLearningActivities(user)).toHaveLength(0);
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  expect(playEnglish).toHaveBeenCalledWith(target.en, target.audioUrl, true, expect.any(Function));
  expect(button(target.es).props.disabled).toBe(false);
  await act(async () => button(target.es).props.onClick());
  expect(readLearningActivities(user)).toMatchObject([{ correct: true, helped: true, modality: 'choice', response: target.es, expected: target.es }]);
  const memory = readWordMemories(user).find((item) => item.key === target.en.toLowerCase())!;
  expect(memory.capabilities?.auditory).toMatchObject({ attempts: 1, correct: 1, independentCorrect: 0 });
  expect(memory.capabilities?.recall).toBeUndefined();
  expect(readAttempts(user).at(-1)?.direction).toBe('auditory');
  expect(text(tree.toJSON())).toContain('Acertaste');
});

it('audio bloqueado permite texto sin fallo ni acierto auditivo ficticio', async () => {
  vi.mocked(playEnglish).mockResolvedValue({ status: 'blocked', source: null });
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  expect(button(target.es).props.disabled).toBe(true);
  expect(readLearningActivities(user)).toHaveLength(0);
  await act(async () => button('No se oye · usar texto').props.onClick());
  await act(async () => button(target.en).props.onClick());
  expect(readAttempts(user).at(-1)?.direction).toBe('recognition');
  expect(readWordMemories(user).find((item) => item.key === target.en.toLowerCase())?.capabilities?.auditory).toBeUndefined();
  expect(readLearningActivities(user)).toMatchObject([{ correct: true, helped: true, response: target.en }]);
});

it('audio tardío tras cambiar a texto no habilita otro modo ni escribe aprendizaje', async () => {
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await mount();
  await act(async () => { void button('🔊 Reproducir palabra inglesa').props.onClick(); });
  await act(async () => button('No se oye · usar texto').props.onClick());
  await act(async () => resolve({ status: 'played', source: 'browser' }));
  expect(text(tree.toJSON())).not.toContain('ESCUCHA Y CONECTA');
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('arrancar no habilita respuestas; pausar invalida la escucha y su final tardío', async () => {
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce((_text, _file, wait, started) => {
    expect(wait).toBe(true); started?.('kokoro');
    return new Promise((done) => { resolve = done; });
  });
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  await act(async () => { void button('🔊 Reproducir palabra inglesa').props.onClick(); });
  expect(text(tree.toJSON())).toContain('Escucha la palabra…');
  expect(button(target.es).props.disabled).toBe(true);
  await act(async () => button(target.es).props.onClick());
  expect(readLearningActivities(user)).toHaveLength(0);
  await act(async () => button('Pausar').props.onClick());
  await act(async () => resolve({ status: 'played', source: 'kokoro' }));
  await act(async () => button('Reanudar').props.onClick());
  expect(button(target.es).props.disabled).toBe(true);
  expect(text(tree.toJSON())).not.toContain('Reproducción finalizada');
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  expect(button(target.es).props.disabled).toBe(false);
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('tras acertar muestra palabra y significado con continuación junto al resultado, no otro reto bloqueado', async () => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  await act(async () => button(target.es).props.onClick());
  expect(tree.root.findAllByProps({ 'aria-label': 'Significados preparados' })).toHaveLength(0);
  expect(text(tree.root.findByType('h1'))).toBe(target.en);
  expect(text(tree.toJSON())).toContain(target.es);
  expect(text(tree.toJSON())).not.toContain('Escucha y elige lo que significa.');
  expect(button('Seguir →')).toBeUndefined();
  expect(button('Siguiente reto')).toBeDefined();
  expect(text(tree.toJSON())).toContain('Desliza hacia arriba');
  const before = readLearningActivities(user);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'blocked', source: 'kokoro' });
  await act(async () => button('🔊 Escuchar de nuevo').props.onClick());
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  expect(button('Siguiente reto').props.disabled).toBe(false);
  expect(readLearningActivities(user)).toEqual(before);
  await swipe();
  expect(tree.root.findAllByProps({ className: 'micro-content micro-answer-result' })).toHaveLength(0);
});
it('pausar la repetición del resultado no deja su altavoz bloqueado al reanudar', async () => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  await act(async () => button(target.es).props.onClick());
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce((_text, _file, _wait, started) => {
    started?.('kokoro'); return new Promise((done) => { resolve = done; });
  });
  await act(async () => { void button('🔊 Escuchar de nuevo').props.onClick(); });
  expect(button('🔊 Escuchar de nuevo').props.disabled).toBe(true);
  await act(async () => button('Pausar').props.onClick());
  await act(async () => button('Reanudar').props.onClick());
  await act(async () => resolve({ status: 'played', source: 'kokoro' }));
  expect(button('🔊 Escuchar de nuevo').props.disabled).toBe(false);
  expect(button('Siguiente reto').props.disabled).toBe(false);
  await act(async () => button('🔊 Escuchar de nuevo').props.onClick());
  expect(text(tree.toJSON())).not.toContain('No se completó el audio');
  expect(readLearningActivities(user)).toHaveLength(1);
});

it('no monta escucha sin dos significados y sonidos preparados distintos', async () => {
  const unit = { ...previewUnit, words: previewUnit.words.map((word) => ({ ...word, ipa: '/same/' })) };
  for (const word of unit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  await mount(unit);
  expect(text(tree.toJSON())).not.toContain('ESCUCHA Y CONECTA');
  expect(button('🔊 Reproducir palabra inglesa')).toBeUndefined();
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('enlaza elegir, escuchar y escribir deslizando, sin saltar preguntas ni resultados por tiempo', async () => {
  const rounds = microRounds(user, [previewUnit]);
  const exit = vi.fn();
  await mount(previewUnit, 0, exit);
  const header = tree.root.findByType('header');
  expect(header.findAllByType('details')).toHaveLength(1);
  const primaryHeader = header.findAllByType('button').filter((node) => node.parent?.props.className !== 'play-options-panel');
  expect(primaryHeader.map((node) => text(node))).toEqual(['← Salir', 'Pausar']);
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(readLearningActivities(user)).toHaveLength(0);
  await swipe();
  expect(readLearningActivities(user)).toHaveLength(0);
  expect(button(rounds[0].word.en)).toBeDefined();
  await act(async () => button(rounds[0].word.en).props.onClick());
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(text(tree.toJSON())).toContain('Acertaste');
  await swipe();
  expect(button('🔊 Reproducir palabra inglesa')).toBeDefined();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  await act(async () => button(rounds[1].word.es).props.onClick());
  await swipe();
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: rounds[2].word.en } }));
  await act(async () => { vi.advanceTimersByTime(450); });
  expect(button('Terminar el repaso')).toBeDefined();
  await swipe();
  expect(exit).toHaveBeenCalledOnce();
  await act(async () => { vi.advanceTimersByTime(10000); });
  expect(exit).toHaveBeenCalledOnce();
  expect(readAttempts(user).slice(-3).map((attempt) => attempt.direction)).toEqual(['recognition', 'auditory', 'recall']);
  expect(readLearningActivities(user)).toHaveLength(3);
});
it('el error espera ayuda sin saltar al siguiente reto y conserva el primer intento', async () => {
  const rounds = microRounds(user, [previewUnit]);
  await mount(previewUnit, 0);
  const wrong = previewUnit.words.find((word) => word.en !== rounds[0].word.en)!;
  await act(async () => button(wrong.en).props.onClick());
  const before = readLearningActivities(user);
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(readLearningActivities(user)).toEqual(before);
  expect(readLearningActivities(user)[0].correct).toBe(false);
  expect(button('Seguir con ayuda')).toBeDefined();
  expect(button('🔊 Reproducir palabra inglesa')).toBeUndefined();
  await swipe();
  expect(button('🔊 Reproducir palabra inglesa')).toBeDefined();
  expect(readLearningActivities(user)).toEqual(before);
});
it('una palabra pendiente de preparación conserva la pausa incluso después de acertar', async () => {
  const unit = { ...previewUnit, words: [previewUnit.words[0]] };
  localStorage.setItem(`memora-v2.memory.${user}`, '[]');
  recordActiveWordAttempt(user, unit, unit.words[0], '', 'skip', true);
  expect(microRounds(user, [unit])[0].pendingModel).toBe(true);
  const exit = vi.fn();
  await mount(unit, 0, exit);
  await act(async () => button(unit.words[0].en).props.onClick());
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(exit).not.toHaveBeenCalled();
  expect(button('Terminar el repaso')).toBeDefined();
  await swipe();
  expect(exit).toHaveBeenCalledOnce();
});
it('pausar retira el avance por gesto sin borrar el acierto y reanudar recupera el mismo resultado', async () => {
  const rounds = microRounds(user, [previewUnit]);
  await mount(previewUnit, 0);
  await act(async () => button(rounds[0].word.en).props.onClick());
  const before = readLearningActivities(user);
  await act(async () => button('Pausar').props.onClick());
  expect(button('Siguiente reto')).toBeUndefined();
  await swipe();
  expect(text(tree.toJSON())).toContain('Acertaste');
  await act(async () => button('Reanudar').props.onClick());
  expect(button('Siguiente reto')).toBeDefined();
  await swipe();
  expect(button('🔊 Reproducir palabra inglesa')).toBeDefined();
  expect(readLearningActivities(user)).toEqual(before);
});
it('deslizar con audio pendiente no responde, ni cambia la palabra, ni registra memoria', async () => {
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await mount();
  await act(async () => { void button('🔊 Reproducir palabra inglesa').props.onClick(); });
  await swipe();
  expect(text(tree.toJSON())).toContain('Preparando el audio');
  expect(readLearningActivities(user)).toHaveLength(0);
  await act(async () => resolve({ status: 'unavailable', source: null }));
  await swipe();
  expect(button('No se oye · usar texto')).toBeDefined();
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('el cierre de quince rondas conserva el pie vertical y no fabrica intentos al volver', async () => {
  const exit = vi.fn();
  await mount(previewUnit, 15, exit);
  expect(text(tree.toJSON())).toContain('Repaso terminado');
  const control = button('Volver al recorrido');
  expect(control.parent!.props.className).toBe('card-vertical-next');
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
  await swipe();
  expect(exit).toHaveBeenCalledOnce();
  expect(readLearningActivities(user)).toHaveLength(0);
});
it('otra tanda en el cierre es optativa y no responde ni atraviesa el reto siguiente', async () => {
  const exit = vi.fn();
  await mount(previewUnit, 15, exit);
  await act(async () => button('Jugar otra vez').props.onClick());
  expect(text(tree.toJSON())).not.toContain('Repaso terminado');
  expect(button('Volver al recorrido')).toBeUndefined();
  await swipe();
  expect(exit).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toHaveLength(0);
});
