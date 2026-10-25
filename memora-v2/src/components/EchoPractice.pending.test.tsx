import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { EchoPractice } from './EchoPractice';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
const resolved = vi.fn();
const getMedia = vi.fn();
const stopTrack = vi.fn();
const media = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
const recorders: any[] = [];
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = () => tree.root.findAllByType('button').find((node) => node.props.className?.startsWith('echo-record'))!;
beforeEach(() => {
  vi.clearAllMocks(); getMedia.mockReset(); recorders.length = 0;
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: getMedia } });
  vi.stubGlobal('MediaRecorder', class {
    state = 'inactive'; ondataavailable: unknown; onstop?: () => void;
    constructor() { recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop?.(); }
  });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(<EchoPractice phrase="Hello." onResolved={resolved} />); }); }

it('abrir no solicita permiso y dos pulsaciones pendientes solo abren una grabación', async () => {
  let permit!: (stream: MediaStream) => void;
  getMedia.mockReturnValue(new Promise((done) => { permit = done; }));
  await mount(); expect(getMedia).not.toHaveBeenCalled();
  const start = button().props.onClick;
  act(() => { start(); start(); });
  expect(getMedia).toHaveBeenCalledOnce();
  expect(button().props.disabled).toBe(true);
  expect(text(button())).toContain('Preparando');
  await act(async () => permit(media));
  expect(recorders).toHaveLength(1);
  expect(text(button())).toContain('Terminar eco');
  expect(button().props.disabled).toBe(false);
  act(() => button().props.onClick());
  expect(stopTrack).toHaveBeenCalled();
  expect(resolved).not.toHaveBeenCalled();
});
it('salir durante el permiso cierra el dispositivo que llega tarde sin crear grabador', async () => {
  let permit!: (stream: MediaStream) => void;
  getMedia.mockReturnValueOnce(new Promise((done) => { permit = done; }));
  await mount(); act(() => button().props.onClick());
  act(() => tree.unmount());
  await act(async () => permit(media));
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(recorders).toHaveLength(0);
  expect(resolved).not.toHaveBeenCalled();
});
it('permiso rechazado deja reintentar sin marcar práctica resuelta por abrir', async () => {
  getMedia.mockRejectedValueOnce(new Error('not allowed')).mockResolvedValueOnce(media);
  await mount(); expect(resolved).not.toHaveBeenCalled();
  await act(async () => button().props.onClick());
  expect(button().props.disabled).not.toBe(true);
  expect(text(tree.toJSON())).toContain('No se pudo usar el micrófono');
  await act(async () => button().props.onClick());
  expect(recorders).toHaveLength(1);
  expect(getMedia).toHaveBeenCalledTimes(2);
});
it('si falla crear el grabador libera el dispositivo y vuelve a habilitar el control', async () => {
  getMedia.mockResolvedValueOnce(media);
  vi.stubGlobal('MediaRecorder', class { constructor() { throw new Error('unsupported codec'); } });
  await mount(); await act(async () => button().props.onClick());
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(button().props.disabled).toBe(false);
  expect(text(tree.toJSON())).toContain('No se pudo usar el micrófono');
});
