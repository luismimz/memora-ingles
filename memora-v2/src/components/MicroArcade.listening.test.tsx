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
import { GameCard } from './GameCard';
import { ArcadePairs } from './ArcadePairs';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'browser' })), playSpanish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const user = 'listening-isolated';
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => (node.props['aria-label'] ?? text(node).trim()) === label)!;
const region = () => tree.root.findByProps({ role: 'region' });
function pairTile(side: 'en' | 'es', value: string) {
  return tree.root.findByProps({ 'aria-label': side === 'en' ? 'Palabras inglesas' : 'Significados en español' }).findAllByType('button').find((node) => text(node.findAllByType('span')[0]) === value)!;
}
async function connectPairs() {
  for (const round of tree.root.findByType(ArcadePairs).props.rounds) {
    await act(async () => pairTile('en', round.word.en).props.onClick());
    await act(async () => pairTile('es', round.word.es).props.onClick());
  }
}
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

it('parejas conserva la respuesta real, error y ayuda, y exige completar el tablero para seguir', async () => {
  await mount(previewUnit, 0);
  const rounds = tree.root.findByType(ArcadePairs).props.rounds;
  const [target, other] = rounds;
  await act(async () => pairTile('en', target.word.en).props.onClick());
  await swipe();
  expect(readLearningActivities(user)).toEqual([]);
  expect(button('Siguiente reto')).toBeUndefined();
  await act(async () => pairTile('es', other.word.es).props.onClick());
  expect(readLearningActivities(user)).toMatchObject([{ prompt: target.word.en, response: other.word.es, expected: target.word.es, correct: false, helped: true, modality: 'choice' }]);
  const memory = readWordMemories(user).find((item) => item.key === target.word.en.toLowerCase())!;
  expect(memory.capabilities?.recall).toBeUndefined();
  await act(async () => button('Ver conexiones').props.onClick());
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toHaveLength(1);
  expect(readLearningActivities(user).filter((event) => event.source === 'authored')).toHaveLength(rounds.length - 1);
  expect(button('Siguiente reto')).toBeDefined();
  const before = readLearningActivities(user);
  await swipe();
  expect(button('🔊 Reproducir palabra inglesa')).toBeDefined();
  expect(readLearningActivities(user)).toEqual(before);
});

it('el acierto se confirma donde se eligió, sin sustituir el reto ni reiniciar el slide', async () => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  const stepKey = tree.root.findByType(GameCard).props.stepKey;
  const choices = tree.root.findByProps({ 'aria-label': 'Significados preparados' });
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  const selected = button(target.es);
  await act(async () => selected.props.onClick());
  expect(tree.root.findByProps({ 'aria-label': 'Significados preparados' })).toBe(choices);
  expect(button(target.es)).toBe(selected);
  expect(selected.props.className).toBe('is-correct');
  expect(selected.props.disabled).toBe(true);
  expect(tree.root.findByType(GameCard).props.stepKey).toBe(stepKey);
  expect(tree.root.findByType(GameCard).props.onAdvance).toBeTypeOf('function');
  expect(text(tree.toJSON())).toContain('Acertaste');
  const before = readLearningActivities(user);
  await act(async () => selected.props.onClick());
  expect(readLearningActivities(user)).toEqual(before);
});
it.each([0, 2])('opciones y escritura conservan su superficie tras acertar en ronda %s', async (index) => {
  const target = microRounds(user, [previewUnit])[index].word;
  await mount(index === 0 ? { ...previewUnit, words: [target] } : previewUnit, index);
  const stepKey = tree.root.findByType(GameCard).props.stepKey;
  const control = index === 2 ? tree.root.findByType('input') : button(target.en);
  if (index === 2) {
    await act(async () => control.props.onChange({ target: { value: target.en } }));
    await act(async () => { vi.advanceTimersByTime(450); });
  } else await act(async () => control.props.onClick());
  expect(index === 2 ? tree.root.findByType('input') : button(target.en)).toBe(control);
  expect(control.props.disabled).toBe(true);
  if (index === 2) expect(text(tree.root.findByType('label'))).toBe('Tu respuesta');
  expect(tree.root.findByType(GameCard).props.stepKey).toBe(stepKey);
  expect(text(tree.toJSON())).toContain('Acertaste');
  expect(readLearningActivities(user)).toMatchObject([{ correct: true, modality: index === 2 ? 'writing' : 'choice', helped: index !== 2 }]);
  expect(button('🔊 Escuchar de nuevo')).toBeDefined();
});

it('el rescate Arcade respeta el puente rechazado sin inventar un acierto ni perder el primer error', async () => {
  const target = microRounds(user, [previewUnit])[1].word;
  localStorage.setItem(`memora-v2.rejected-association.${user}.${target.en.toLowerCase()}`, '1');
  await mount();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  await act(async () => button(previewUnit.words.find((word) => word.en !== target.en)!.es).props.onClick());
  expect(text(tree.toJSON())).not.toContain(target.bridge);
  expect(text(tree.toJSON())).not.toContain(target.scene);
  expect(text(tree.toJSON())).toContain(target.en);
  expect(readLearningActivities(user).filter((event) => event.source === 'learner')).toMatchObject([{ correct: false }]);
  expect(button('Seguir con ayuda')).toBeDefined();
  const before = readLearningActivities(user);
  vi.mocked(playEnglish).mockRejectedValueOnce(new Error('offline'));
  await act(async () => button('Escuchar').props.onClick());
  expect(playEnglish).toHaveBeenLastCalledWith(target.en, target.audioUrl, true, expect.any(Function));
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  expect(readLearningActivities(user)).toEqual(before);
});
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

it.each([false, true])('reintentar audio pendiente en resultado=%s ignora su final antiguo sin fabricar aprendizaje', async (result) => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  if (result) {
    await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
    await act(async () => button(target.es).props.onClick());
  }
  const before = readLearningActivities(user);
  const label = result ? '🔊 Escuchar de nuevo' : '🔊 Reproducir palabra inglesa';
  let old!: (value: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { old = done; }));
  await act(async () => button(label).props.onClick());
  expect(button(label).props.disabled).toBe(false);
  expect(button(label).props['aria-busy']).toBe(true);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'blocked', source: null });
  await act(async () => button(label).props.onClick());
  await act(async () => old({ status: 'played', source: 'kokoro' }));
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  if (!result) expect(button(target.es).props.disabled).toBe(true);
  expect(readLearningActivities(user)).toEqual(before);
  await act(async () => button(label).props.onClick());
  expect(text(tree.toJSON())).not.toContain('No se completó el audio');
  if (!result) expect(button(target.es).props.disabled).toBe(false);
  expect(readLearningActivities(user)).toEqual(before);
});
it.each([false, true])('cancelar audio en resultado=%s no lo presenta como fallo ni acierto auditivo', async (result) => {
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  if (result) {
    await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
    await act(async () => button(target.es).props.onClick());
  }
  const before = readLearningActivities(user);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'cancelled', source: null });
  await act(async () => button(result ? '🔊 Escuchar de nuevo' : '🔊 Reproducir palabra inglesa').props.onClick());
  expect(text(tree.toJSON())).not.toContain('No se completó el audio');
  if (!result) expect(button(target.es).props.disabled).toBe(true);
  expect(readLearningActivities(user)).toEqual(before);
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
  expect(tree.root.findAllByProps({ 'aria-label': 'Significados preparados' })).toHaveLength(1);
  expect(button(target.es).props.className).toBe('is-correct');
  expect(text(tree.root.findByType('h1'))).toBe('Conexión correcta');
  expect(text(tree.toJSON())).toContain(target.es);
  expect(text(tree.toJSON())).not.toContain('Escucha y elige lo que significa.');
  expect(button('Seguir →')).toBeUndefined();
  expect(button('Siguiente reto')).toBeDefined();
  expect(button('Siguiente reto').props.title).toContain('Desliza hacia arriba');
  const before = readLearningActivities(user);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'blocked', source: 'kokoro' });
  await act(async () => button('🔊 Escuchar de nuevo').props.onClick());
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  expect(button('Siguiente reto').props.disabled).toBe(false);
  expect(readLearningActivities(user)).toEqual(before);
  await swipe();
  expect(tree.root.findByType('input').props.disabled).toBe(false);
  expect(text(tree.toJSON())).not.toContain('Acertaste');
  expect(readLearningActivities(user)).toEqual(before);
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
  expect(button('🔊 Escuchar de nuevo').props.disabled).toBe(false);
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
  await connectPairs();
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(text(tree.toJSON())).toContain('Conexiones listas');
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
  expect(readLearningActivities(user)).toHaveLength(5);
});
it('el error espera ayuda sin saltar al siguiente reto y conserva el primer intento', async () => {
  const rounds = microRounds(user, [previewUnit]);
  await mount(previewUnit, 1);
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  const target = rounds[1].word;
  const incorrect = previewUnit.words.find((word) => word.en !== target.en)!;
  await act(async () => button(incorrect.es).props.onClick());
  const before = readLearningActivities(user);
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(readLearningActivities(user)).toEqual(before);
  expect(readLearningActivities(user)[0].correct).toBe(false);
  expect(button('Seguir con ayuda')).toBeDefined();
  expect(button('🔊 Reproducir palabra inglesa')).toBeUndefined();
  await swipe();
  expect(tree.root.findByType('input').props.disabled).toBe(false);
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
  await mount(previewUnit, 0);
  await connectPairs();
  const before = readLearningActivities(user);
  await act(async () => button('Pausar').props.onClick());
  expect(button('Siguiente reto')).toBeUndefined();
  await swipe();
  expect(text(tree.toJSON())).toContain('Conexiones listas');
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
