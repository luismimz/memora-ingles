import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { previewUnit } from '../preview/previewUnit';
import { playEnglish, stopSpeech, type PlaybackResult } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playMiss: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const next = vi.fn(); const attempt = vi.fn(); const pick = vi.fn();
const sentence = previewUnit.sentence;
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.children ? text(value.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => (node.props['aria-label'] ?? text(node).trim()) === label)!;
const card = (filledSlots = sentence.slots.length) => <SentenceBuilderCard vertical sentence={sentence} filledSlots={filledSlots} sceneWord={previewUnit.words[0]} processForm={previewUnit.grammar[0]} index={0} total={1} choiceSeed={0} onPick={pick} onAttempt={attempt} onNext={next} />;
async function mount(filledSlots = sentence.slots.length) { await act(async () => { tree = create(card(filledSlots)); }); }
async function swipe() {
  const region = tree.root.findByProps({ role: 'region' });
  const event = { target: { closest: () => null }, currentTarget: { scrollTop: 0, scrollHeight: 600, clientHeight: 600 } };
  await act(async () => {
    region.props.onTouchStart({ ...event, touches: [{ clientY: 400 }] });
    region.props.onTouchMove({ ...event, touches: [{ clientY: 200 }] });
    region.props.onTouchEnd(); vi.advanceTimersByTime(230);
  });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'blocked', source: null });
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('el montaje se confirma aunque falle el audio y ofrece repetición y avance juntos sin otro intento', async () => {
  await mount();
  expect(text(tree.toJSON())).toContain('✓ FRASE ARMADA');
  expect(text(tree.toJSON())).toContain('Frase armada. Ya puedes usarla.');
  expect(text(tree.toJSON())).toContain('No se completó el audio. Puedes continuar.');
  expect(tree.root.findAllByProps({ className: 'slot-picker' })).toHaveLength(0);
  expect(button('🔊 Escuchar la frase').props.disabled).toBe(false);
  expect(button('Usar mi frase').parent!.props.className).toBe('card-vertical-next');
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'played', source: 'kokoro' });
  await act(async () => button('🔊 Escuchar la frase').props.onClick());
  expect(text(tree.toJSON())).not.toContain('No se completó');
  await swipe();
  expect(next).toHaveBeenCalledOnce();
  expect(attempt).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
});
it('el audio pendiente no retiene la salida ni puede cambiar el resultado después de seguir', async () => {
  let resolve!: (value: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await mount();
  expect(text(tree.toJSON())).toContain('Preparando audio');
  expect(button('Usar mi frase')).toBeDefined();
  await swipe();
  expect(next).toHaveBeenCalledOnce(); expect(stopSpeech).toHaveBeenCalled();
  await act(async () => resolve({ status: 'unavailable', source: null }));
  expect(text(tree.toJSON())).not.toContain('No se completó');
  expect(attempt).not.toHaveBeenCalled();
});
it('rechazo de reproducción tiene salida recuperable, no promesa rechazada sin manejar', async () => {
  vi.mocked(playEnglish).mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(text(tree.toJSON())).toContain('No se completó el audio');
  expect(button('🔊 Escuchar la frase').props.disabled).toBe(false);
  await swipe(); expect(next).toHaveBeenCalledOnce();
});
it('arrancar el sonido no lo da por terminado y nunca resuelve el montaje por escuchar o deslizar', async () => {
  await mount(0);
  await swipe();
  expect(next).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled(); expect(playEnglish).not.toHaveBeenCalled();
  let resolve!: (value: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce((_text, _file, wait, started) => {
    expect(wait).toBe(true); started?.('kokoro'); return new Promise((done) => { resolve = done; });
  });
  await act(async () => tree.update(card()));
  expect(text(tree.toJSON())).toContain('Reproduciendo…');
  expect(button('🔊 Escuchar la frase').props.disabled).toBe(true);
  await act(async () => resolve({ status: 'played', source: 'kokoro' }));
  expect(button('🔊 Escuchar la frase').props.disabled).toBe(false);
  expect(next).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled();
});
