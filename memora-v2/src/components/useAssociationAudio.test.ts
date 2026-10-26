import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewUnit } from '../preview/previewUnit';
import type { AssociationAudioState } from './useAssociationAudio';
import type { PlaybackResult } from '../services/audio';

const hooks = vi.hoisted(() => ({ effects: [] as (() => (() => void) | void)[], state: undefined as AssociationAudioState | undefined }));
const speech = vi.hoisted(() => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), prefetchSpanish: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/audio', () => speech);
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: AssociationAudioState) => { hooks.state = initial; return [initial, (value: AssociationAudioState) => { hooks.state = value; }]; },
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => (() => void) | void) => hooks.effects.push(fn),
}));
import { useAssociationAudio } from './useAssociationAudio';
const played: PlaybackResult = { status: 'played', source: 'kokoro' };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
beforeEach(() => {
  hooks.effects.length = 0; hooks.state = undefined;
  Object.values(speech).forEach((fn) => fn.mockReset());
  speech.playEnglish.mockResolvedValue(played); speech.playSpanish.mockResolvedValue(played);
});
describe('audio acompañante de la asociación', () => {
  it('una cancelación no se disfraza de audio bloqueado ni solicita voz alternativa después', async () => {
    speech.playEnglish.mockResolvedValueOnce({ status: 'cancelled', source: 'kokoro' });
    const hook = useAssociationAudio(previewUnit.words[0]); hooks.effects[0](); await flush();
    expect(hooks.state).toBeUndefined(); expect(speech.playSpanish).not.toHaveBeenCalled();
    hook.listen(); await flush();
    expect(speech.playEnglish).toHaveBeenLastCalledWith(previewUnit.words[0].en.toLowerCase(), previewUnit.words[0].audioUrl, true, expect.any(Function));
  });
  it('con puente rechazado conserva modelo inglés sin narrar ni precargar la historia', async () => {
    useAssociationAudio(previewUnit.words[0], true, false); hooks.effects[0](); await flush();
    expect(speech.playEnglish).toHaveBeenCalledOnce();
    expect(speech.playSpanish).not.toHaveBeenCalled();
    expect(speech.prefetchSpanish).not.toHaveBeenCalled();
  });
  it('restaurar directamente el montaje no inicia ni precarga la narración', async () => {
    useAssociationAudio(previewUnit.words[0], false); hooks.effects[0](); await flush();
    expect(speech.playEnglish).not.toHaveBeenCalled(); expect(speech.playSpanish).not.toHaveBeenCalled(); expect(speech.prefetchSpanish).not.toHaveBeenCalled();
  });
  it('mantiene palabra → historia → palabra y solo continúa tras reproducciones confirmadas', async () => {
    useAssociationAudio(previewUnit.words[0]); hooks.effects[0](); await flush();
    expect(speech.playEnglish).toHaveBeenCalledTimes(2);
    expect(speech.playSpanish).toHaveBeenCalledWith(previewUnit.words[0].scene, true, expect.any(Function));
    expect(speech.playEnglish.mock.invocationCallOrder[0]).toBeLessThan(speech.playSpanish.mock.invocationCallOrder[0]);
    expect(speech.playSpanish.mock.invocationCallOrder[0]).toBeLessThan(speech.playEnglish.mock.invocationCallOrder[1]);
    expect(hooks.state).toEqual({ status: 'ready', source: 'kokoro' });
  });
  it('un bloqueo muestra el reintento sin fingir escucha ni narrar encima', async () => {
    speech.playEnglish.mockResolvedValue({ status: 'blocked', source: 'kokoro' });
    const hook = useAssociationAudio(previewUnit.words[0]); hooks.effects[0](); await flush();
    expect(hooks.state?.status).toBe('blocked'); expect(speech.playSpanish).not.toHaveBeenCalled();
    speech.playEnglish.mockResolvedValue(played);
    hook.listen(); await flush();
    expect(speech.playEnglish).toHaveBeenLastCalledWith(previewUnit.words[0].en.toLowerCase(), previewUnit.words[0].audioUrl, true, expect.any(Function), true);
    expect(hooks.state?.status).toBe('ready'); expect(speech.playSpanish).not.toHaveBeenCalled();
  });
  it('un clic manual invalida la secuencia automática todavía pendiente', async () => {
    let resolveAuto!: (result: PlaybackResult) => void;
    speech.playEnglish.mockImplementationOnce(() => new Promise((resolve) => { resolveAuto = resolve; }));
    const hook = useAssociationAudio(previewUnit.words[0]); hooks.effects[0]();
    hook.listen(); await flush(); resolveAuto(played); await flush();
    expect(speech.playEnglish).toHaveBeenCalledTimes(2);
    expect(speech.playSpanish).not.toHaveBeenCalled();
    expect(hooks.state?.status).toBe('ready');
  });
  it('salir impide una narración tardía y cancela la reproducción', async () => {
    let resolveAuto!: (result: PlaybackResult) => void;
    speech.playEnglish.mockImplementationOnce(() => new Promise((resolve) => { resolveAuto = resolve; }));
    useAssociationAudio(previewUnit.words[0]); const cleanup = hooks.effects[0]();
    cleanup?.(); resolveAuto(played); await flush();
    expect(speech.stopSpeech).toHaveBeenCalledTimes(1);
    expect(speech.playSpanish).not.toHaveBeenCalled();
  });
  it('cambiar al montaje sin desmontar la asociación invalida la narración pendiente', async () => {
    let resolveAuto!: (result: PlaybackResult) => void;
    speech.playEnglish.mockImplementationOnce(() => new Promise((resolve) => { resolveAuto = resolve; }));
    const hook = useAssociationAudio(previewUnit.words[0]); hooks.effects[0]();
    hook.cancel(); resolveAuto(played); await flush();
    expect(speech.stopSpeech).toHaveBeenCalledOnce();
    expect(speech.playSpanish).not.toHaveBeenCalled();
    expect(speech.playEnglish).toHaveBeenCalledTimes(1);
    // Replay remains available if the association itself is still shown.
    hook.listen(); await flush();
    expect(hooks.state?.status).toBe('ready');
    expect(speech.playSpanish).not.toHaveBeenCalled();
  });
  it('en los cognados solo pronuncia la palabra, sin preparar o narrar una historia artificial', async () => {
    useAssociationAudio({ ...previewUnit.words[0], associationMode: 'cognate' }); hooks.effects[0](); await flush();
    expect(speech.playEnglish).toHaveBeenCalledTimes(1);
    expect(speech.prefetchSpanish).not.toHaveBeenCalled(); expect(speech.playSpanish).not.toHaveBeenCalled();
  });
  it('un rechazo del audio muestra indisponible, no encadena la historia y permite reintentar', async () => {
    speech.playEnglish.mockRejectedValueOnce(new Error('offline'));
    const hook = useAssociationAudio(previewUnit.words[0]); hooks.effects[0](); await flush();
    expect(hooks.state).toEqual({ status: 'unavailable', source: null });
    expect(speech.playSpanish).not.toHaveBeenCalled();
    hook.listen(); await flush();
    expect(hooks.state?.status).toBe('ready');
  });
});
