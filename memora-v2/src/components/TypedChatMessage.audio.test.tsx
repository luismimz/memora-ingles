import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TypedChatMessage } from './TypedChatMessage';
import { playEnglish, type PlaybackResult } from '../services/audio';
import { previewUnit } from '../preview/previewUnit';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn() }));
let tree: ReactTestRenderer;
const ready = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const speaker = () => tree.root.findAllByType('button')[0];
async function mount(autoSpeak = false) {
  await act(async () => { tree = create(<TypedChatMessage message={{ id: 'reply-0', who: 'partner', text: 'Hello.' }} partner="Emma" form={previewUnit.grammar[0]} autoSpeak={autoSpeak} onReady={ready} />); });
}
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(playEnglish).mockReset().mockResolvedValue({ status: 'blocked', source: null });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('muestra preparación y fallo breve; permite reintentar sin repetir recepción', async () => {
  await mount();
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  act(() => speaker().props.onClick());
  expect(speaker().props['aria-busy']).toBe(true);
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(ready).toHaveBeenCalledOnce();
  await act(async () => resolve({ status: 'blocked', source: null }));
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  expect(speaker().props['aria-busy']).toBe(false);
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'played', source: 'kokoro' });
  await act(async () => speaker().props.onClick());
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(ready).toHaveBeenCalledOnce();
});
it('no espera el sonido para recibir el mensaje y descarta un fallo de reproducción sustituida', async () => {
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await mount(true);
  expect(ready).toHaveBeenCalledOnce();
  expect(text(tree.toJSON())).toContain('Hello.');
  vi.mocked(playEnglish).mockResolvedValueOnce({ status: 'played', source: 'kokoro' });
  await act(async () => speaker().props.onClick());
  await act(async () => resolve({ status: 'unavailable', source: null }));
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(ready).toHaveBeenCalledOnce();
});
it('rechazo del audio se convierte en fallo recuperable, no en promesa sin manejar', async () => {
  await mount(); vi.mocked(playEnglish).mockRejectedValueOnce(new Error('offline'));
  await act(async () => speaker().props.onClick());
  expect(text(tree.toJSON())).toContain('Audio no disponible');
  expect(ready).toHaveBeenCalledOnce();
});
it('distingue sonido iniciado de terminado y no anuncia error por una cancelación deliberada', async () => {
  await mount();
  let resolve!: (result: PlaybackResult) => void;
  vi.mocked(playEnglish).mockImplementationOnce((_text, _file, wait, started) => {
    expect(wait).toBe(true); started?.('kokoro');
    return new Promise((done) => { resolve = done; });
  });
  act(() => speaker().props.onClick());
  expect(text(speaker())).toContain('Reproduciendo');
  expect(speaker().props['aria-busy']).toBe(false);
  await act(async () => resolve({ status: 'cancelled', source: 'kokoro' }));
  expect(text(speaker())).toContain('Escuchar');
  expect(text(tree.toJSON())).not.toContain('Audio no disponible');
  expect(ready).toHaveBeenCalledOnce();
});
