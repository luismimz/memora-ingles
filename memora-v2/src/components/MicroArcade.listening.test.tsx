import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MicroArcade } from './MicroArcade';
import { previewUnit } from '../preview/previewUnit';
import { microRounds } from '../domain/microArcade';
import { readWordMemories, recordWordRecall } from '../domain/memory';
import { readLearningActivities } from '../domain/learningActivity';
import { readAttempts } from '../domain/learningProfile';
import { playEnglish, type PlaybackResult } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'browser' })), playSpanish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
const user = 'listening-isolated';
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).trim() === label)!;
async function mount(unit = previewUnit) { await act(async () => { tree = create(<MicroArcade userId={user} units={[unit]} inspection={false} initialRound={1} onExit={() => {}} automatic />); }); }
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
  expect(playEnglish).toHaveBeenCalledWith(target.en, target.audioUrl);
  expect(button(target.es).props.disabled).toBe(false);
  await act(async () => button(target.es).props.onClick());
  expect(readLearningActivities(user)).toMatchObject([{ correct: true, helped: true, modality: 'choice', response: target.es, expected: target.es }]);
  const memory = readWordMemories(user).find((item) => item.key === target.en.toLowerCase())!;
  expect(memory.capabilities?.auditory).toMatchObject({ attempts: 1, correct: 1, independentCorrect: 0 });
  expect(memory.capabilities?.recall).toBeUndefined();
  expect(readAttempts(user).at(-1)?.direction).toBe('auditory');
  expect(text(tree.toJSON())).toContain('Has reconocido el significado del audio');
});

it('audio bloqueado permite texto sin fallo ni acierto auditivo ficticio', async () => {
  vi.mocked(playEnglish).mockResolvedValue({ status: 'blocked', source: null });
  const target = microRounds(user, [previewUnit])[1].word;
  await mount();
  await act(async () => button('🔊 Reproducir palabra inglesa').props.onClick());
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  expect(button(target.es).props.disabled).toBe(true);
  expect(readLearningActivities(user)).toHaveLength(0);
  await act(async () => button('Practicar con texto').props.onClick());
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
  await act(async () => button('Practicar con texto').props.onClick());
  await act(async () => resolve({ status: 'played', source: 'browser' }));
  expect(text(tree.toJSON())).not.toContain('ESCUCHA Y CONECTA');
  expect(readLearningActivities(user)).toHaveLength(0);
});

it('no monta escucha sin dos significados y sonidos preparados distintos', async () => {
  const unit = { ...previewUnit, words: previewUnit.words.map((word) => ({ ...word, ipa: '/same/' })) };
  for (const word of unit.words) recordWordRecall(user, word, 'hesitant', new Date(), 'recognition', undefined, true);
  await mount(unit);
  expect(text(tree.toJSON())).not.toContain('ESCUCHA Y CONECTA');
  expect(button('🔊 Reproducir palabra inglesa')).toBeUndefined();
  expect(readLearningActivities(user)).toHaveLength(0);
});
