import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({ apiRequest: vi.fn(), loadAsset: vi.fn() }));
vi.mock('./directus', () => deps);
let audio: typeof import('./audio');
let instances: FakeAudio[];
let rejection: Error | null;
let utterances: { onstart?: () => void; onend?: () => void; onerror?: (event: { error: string }) => void }[];
let synthesis: { cancel: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn> };
class FakeAudio extends EventTarget {
  pause = vi.fn();
  constructor(public src: string) { super(); instances.push(this); }
  play = vi.fn(async () => { if (rejection) throw rejection; });
}
beforeEach(async () => {
  vi.useFakeTimers(); vi.resetModules();
  instances = []; utterances = []; rejection = null;
  deps.apiRequest.mockReset().mockResolvedValue({ available: true, file: 'generated-file' });
  deps.loadAsset.mockReset().mockResolvedValue('blob:word');
  synthesis = { cancel: vi.fn(), speak: vi.fn((utterance) => utterances.push(utterance)) };
  vi.stubGlobal('window', { setTimeout, clearTimeout, speechSynthesis: synthesis });
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
  vi.stubGlobal('Audio', FakeAudio);
  audio = await import('./audio');
});
afterEach(() => { audio.stopSpeech(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Kokoro y reproducción sin falsos éxitos', () => {
  it('un reto que espera el final no confunde play resuelto con audio terminado', async () => {
    const finished = vi.fn();
    const promise = audio.playEnglish('habit', undefined, true).then((result) => { finished(result); return result; });
    await vi.advanceTimersByTimeAsync(0);
    expect(instances[0].play).toHaveBeenCalledOnce();
    expect(finished).not.toHaveBeenCalled();
    audio.stopSpeech();
    expect(await promise).toEqual({ status: 'cancelled', source: 'kokoro' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('espera a Kokoro más de 300 ms y no lo sustituye por la voz del navegador', async () => {
    deps.apiRequest.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ available: true, file: 'slow-file' }), 700)));
    const started = vi.fn();
    const promise = audio.playEnglish('hotel', undefined, true, started);
    await vi.advanceTimersByTimeAsync(500);
    expect(instances).toHaveLength(0); expect(synthesis.speak).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(started).toHaveBeenCalledWith('kokoro');
    instances[0].dispatchEvent(new Event('ended'));
    expect(await promise).toEqual({ status: 'played', source: 'kokoro' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('comparte la precarga de la palabra siguiente sin reproducirla ni regenerarla', async () => {
    audio.prefetchSpeech('information'); audio.prefetchSpeech('information');
    await vi.advanceTimersByTimeAsync(0);
    expect(instances).toHaveLength(0);
    expect(deps.apiRequest).toHaveBeenCalledTimes(1);
    expect(await audio.playEnglish('information')).toEqual({ status: 'played', source: 'kokoro' });
    expect(deps.apiRequest).toHaveBeenCalledTimes(1);
  });
  it('precarga un archivo editorial sin generar otro audio', async () => {
    audio.prefetchSpeech('cat', 'authored-file');
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.apiRequest).not.toHaveBeenCalled();
    expect(deps.loadAsset).toHaveBeenCalledWith('authored-file');
  });
  it('un bloqueo automático devuelve blocked y permite reintentar con el altavoz', async () => {
    rejection = Object.assign(new Error('autoplay blocked'), { name: 'NotAllowedError' });
    expect(await audio.playEnglish('hotel')).toEqual({ status: 'blocked', source: 'kokoro' });
    expect(synthesis.speak).not.toHaveBeenCalled();
    rejection = null;
    expect(await audio.playEnglish('hotel')).toEqual({ status: 'played', source: 'kokoro' });
    expect(deps.apiRequest).toHaveBeenCalledTimes(1);
  });
  it('al salir cancela inmediatamente y una respuesta tardía nunca empieza a sonar', async () => {
    deps.apiRequest.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ available: true, file: 'late-file' }), 700)));
    const promise = audio.playEnglish('play', undefined, true);
    audio.stopSpeech();
    expect((await promise).status).toBe('cancelled');
    await vi.advanceTimersByTimeAsync(1000);
    expect(instances).toHaveLength(0); expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it('cancelar una reproducción no cuenta como haber terminado de escuchar', async () => {
    const promise = audio.playEnglish('play', undefined, true);
    await vi.advanceTimersByTimeAsync(0);
    audio.stopSpeech(); instances[0].dispatchEvent(new Event('ended'));
    expect((await promise).status).toBe('cancelled');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('espera el final real de una historia larga y no corta a los ocho segundos', async () => {
    const finished = vi.fn();
    const promise = audio.playSpanish('Una historia que todavía sigue sonando.', true).then((result) => { finished(); return result; });
    await vi.advanceTimersByTimeAsync(9000);
    expect(finished).not.toHaveBeenCalled();
    instances[0].dispatchEvent(new Event('ended'));
    expect((await promise).status).toBe('played');
  });
  it('identifica la voz alternativa y espera eventos reales, no solo llamar a speak', async () => {
    deps.apiRequest.mockResolvedValue({ available: false });
    const started = vi.fn();
    const promise = audio.playEnglish('hotel', undefined, true, started);
    await vi.advanceTimersByTimeAsync(0);
    expect(started).not.toHaveBeenCalled();
    utterances[0].onstart?.();
    expect(started).toHaveBeenCalledWith('browser');
    utterances[0].onend?.();
    expect(await promise).toEqual({ status: 'played', source: 'browser' });
  });
  it('no presenta silencio o falta de voz alternativa como audio reproducido', async () => {
    deps.apiRequest.mockResolvedValue({ available: false });
    const promise = audio.playEnglish('hotel', undefined, true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await promise).toEqual({ status: 'unavailable', source: 'browser' });
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    expect(await audio.playEnglish('play')).toEqual({ status: 'unavailable', source: null });
  });
  it('acota la preparación fallida sin generar audio tardío ni bloquear la interfaz', async () => {
    deps.apiRequest.mockImplementation((_path, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout')))));
    const promise = audio.playEnglish('hotel', undefined, true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect((await promise).status).toBe('unavailable');
    expect(instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
