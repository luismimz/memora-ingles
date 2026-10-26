import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EchoPractice } from './EchoPractice';
import { playEnglish, type PlaybackResult, type SpeechSource } from '../services/audio';
import { sentenceSpeechParts } from '../domain/sentenceAnswer';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const phrase = 'I am looking for my keys.';
const parts = ['I am', 'looking for', 'my keys.'];
const requests: { text: string; start?: (source: SpeechSource) => void; finish: (result: PlaybackResult) => void }[] = [];
const resolved = vi.fn(), getMedia = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => (node.props['aria-label'] ?? text(node)) === label)!;
beforeEach(() => {
  vi.clearAllMocks(); requests.length = 0;
  vi.mocked(playEnglish).mockImplementation((value, _id, _wait, start) => new Promise((finish) => requests.push({ text: value, start, finish })));
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: getMedia } });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(<EchoPractice phrase={phrase} parts={parts} onResolved={resolved} />); }); }
it('ilumina solo la pieza realmente reproducida y después une el mensaje, sin micrófono ni acreditación', async () => {
  await mount();
  expect(requests).toHaveLength(0);
  await act(async () => button('Escuchar piezas y frase completa').props.onClick());
  expect(requests.map((request) => request.text)).toEqual([parts[0]]);
  expect(button(`🔊 ${parts[0]}`).props['aria-busy']).toBe(true);
  for (let index = 0; index < parts.length + 1; index++) {
    await act(async () => requests[index].start?.('kokoro'));
    expect(button(index < parts.length ? `🔊 ${parts[index]}` : '🔊 Frase completa').props.className).toContain('is-speaking');
    await act(async () => requests[index].finish({ status: 'played', source: 'kokoro' }));
  }
  expect(requests.map((request) => request.text)).toEqual([...parts, phrase]);
  expect(button('Escuchar piezas y frase completa').props['aria-pressed']).toBe(false);
  expect(resolved).not.toHaveBeenCalled(); expect(getMedia).not.toHaveBeenCalled();
});
it('un fallo detiene la cadena, deja reintentar la frase y no se presenta como práctica completada', async () => {
  await mount(); await act(async () => button('Escuchar piezas y frase completa').props.onClick());
  await act(async () => requests[0].finish({ status: 'unavailable', source: null }));
  expect(requests).toHaveLength(1);
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  await act(async () => button('🔊 Frase completa').props.onClick());
  expect(requests.map((request) => request.text)).toEqual([parts[0], phrase]);
  expect(resolved).not.toHaveBeenCalled(); expect(getMedia).not.toHaveBeenCalled();
});
it('cambiar de pieza, detener o salir invalida el final antiguo sin seguir una secuencia fantasma', async () => {
  await mount(); await act(async () => button('Escuchar piezas y frase completa').props.onClick());
  await act(async () => button(`🔊 ${parts[2]}`).props.onClick());
  await act(async () => requests[0].finish({ status: 'played', source: 'browser' }));
  expect(requests.map((request) => request.text)).toEqual([parts[0], parts[2]]);
  await act(async () => button('Escuchar piezas y frase completa').props.onClick());
  await act(async () => button('Detener escucha por piezas').props.onClick());
  await act(async () => requests[2].finish({ status: 'played', source: 'browser' }));
  expect(requests).toHaveLength(3);
  await act(async () => button('Escuchar piezas y frase completa').props.onClick());
  act(() => tree.unmount());
  await act(async () => requests[3].finish({ status: 'played', source: 'browser' }));
  expect(requests).toHaveLength(4); expect(resolved).not.toHaveBeenCalled();
});
it('no ofrece piezas ajenas ni pronuncia sufijos visuales aislados como palabras', () => {
  expect(sentenceSpeechParts(phrase, parts)).toEqual(parts);
  expect(sentenceSpeechParts("I'm looking for my keys.", parts)).toEqual(parts);
  expect(sentenceSpeechParts('I am cooking meat.', parts)).toEqual([]);
  expect(sentenceSpeechParts('I am playing', ['I am', 'play', 'ing'])).toEqual([]);
  expect(sentenceSpeechParts("I'm playing", ['I', "'m", 'playing'])).toEqual([]);
});

it('una respuesta programada después de grabar no interrumpe el modelo que el alumno eligió después', async () => {
  vi.useFakeTimers();
  const stopTrack = vi.fn();
  getMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: stopTrack }] });
  let recorder: any;
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:sequence-isolated', revokeObjectURL: vi.fn() });
  vi.stubGlobal('MediaRecorder', class {
    state = 'inactive'; onstop?: () => void; ondataavailable?: (event: { data: Blob }) => void;
    constructor() { recorder = this; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop?.(); }
  });
  await act(async () => { tree = create(<EchoPractice phrase={phrase} parts={parts} reply="Okay." onResolved={resolved} />); });
  await act(async () => button('🎙️ Di la frase').props.onClick());
  act(() => recorder.ondataavailable({ data: new Blob(['voice']) }));
  act(() => button('■ Terminar eco').props.onClick());
  expect(resolved).toHaveBeenCalledOnce();
  await act(async () => button('🔊 Frase completa').props.onClick());
  await act(async () => { vi.advanceTimersByTime(500); });
  expect(requests.map((request) => request.text)).toEqual([phrase]);
  expect(stopTrack).toHaveBeenCalled();
});
