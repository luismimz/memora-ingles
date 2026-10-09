import { assetUrl, cachedNaturalSpeechAsset, naturalSpeechAsset, type SpeechAsset } from './api';

export interface AudioTiming {
  cached: boolean;
  requestMs: number;
  startMs: number;
  totalMs: number;
  rate: number;
  file: string;
}

const SILENT_WAV = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';
let player: HTMLAudioElement | null = null;
let sequence = 0;
let unlocked = false;
let cancelPending: (() => void) | null = null;

/**
 * Salida de audio de latencia mínima. Se ejecuta en la misma llamada del
 * gesto/clic: no espera Kokoro, voces del sistema ni ninguna petición HTTP.
 */
function speakImmediateEnglish(text: string, rate = 1) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
  utterance.lang = 'en-US';
  utterance.rate = rate;
  synthesis.speak(utterance);
}

function audioElement() {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
  }
  return player;
}

function staticAudioAsset(audioUrl: string | null | undefined, rate: number) {
  const raw = String(audioUrl || '').trim();
  if (!raw) return null;
  let url = raw;
  if (!/^(?:https?:|data:|blob:)/i.test(raw) && !raw.startsWith('/')) {
    // A UUID is a Directus file id; ordinary filenames remain relative URLs.
    url = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(raw) || !/\.(?:mp3|wav|ogg|m4a)(?:\?|$)/i.test(raw)
      ? assetUrl(raw, 'download=0')
      : new URL(raw, window.location.origin).toString();
  }
  return { file: raw, url, cached: true, requestMs: 0, voice: null, rate } satisfies SpeechAsset;
}

/**
 * Safari y algunos móviles bloquean un audio creado después de esperar una API.
 * Desbloqueamos el mismo reproductor persistente con el primer toque/tecla y lo
 * reutilizamos después para todos los archivos de Kokoro.
 */
export function installNaturalAudioUnlock() {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    if (unlocked) return;
    const audio = audioElement();
    audio.src = SILENT_WAV;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    }).catch(() => { /* se vuelve a intentar en la siguiente interacción */ });
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

export function stopNaturalAudio() {
  sequence += 1;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  cancelPending?.();
  cancelPending = null;
  if (!player) return;
  player.pause();
  try { player.currentTime = 0; } catch { /* aún sin metadatos */ }
}

export async function prefetchNaturalAudio(text: string, rate?: number, audioUrl?: string | null) {
  return staticAudioAsset(audioUrl, rate ?? 0.88) ?? naturalSpeechAsset(text, { rate });
}

export async function playNaturalAudio(
  text: string,
  options: { rate?: number; audioUrl?: string | null; onAsset?: (asset: SpeechAsset) => void } = {},
): Promise<AudioTiming> {
  stopNaturalAudio();
  const ownSequence = sequence;
  const requestedAt = performance.now();
  const fallbackToBrowser = () => {
    if (ownSequence !== sequence) throw new DOMException('Reproducción cancelada', 'AbortError');
    const fallbackRate = options.rate ?? 1;
    speakImmediateEnglish(text, fallbackRate);
    const totalMs = Math.round(performance.now() - requestedAt);
    return { cached: false, requestMs: totalMs, startMs: totalMs, totalMs, rate: fallbackRate, file: 'browser-speech' };
  };
  let asset: SpeechAsset | null = staticAudioAsset(options.audioUrl, options.rate ?? 0.88)
    ?? cachedNaturalSpeechAsset(text, { rate: options.rate });
  if (!asset) {
    // Kokoro es la voz preferente. Le damos una ventana corta para responder;
    // si ya estaba precargado, esta promesa se resuelve prácticamente al
    // instante. Si el servidor tarda más, el navegador evita que el clic se
    // quede en silencio y la petición de Kokoro sigue calentando la caché.
    let deadlineTimer: number | null = null;
    try {
      const natural = naturalSpeechAsset(text, { rate: options.rate });
      const deadline = new Promise<never>((_, reject) => {
        deadlineTimer = window.setTimeout(() => reject(new Error('Kokoro está tardando demasiado.')), 300);
      });
      asset = await Promise.race([natural, deadline]);
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError' || ownSequence !== sequence) throw error;
      return fallbackToBrowser();
    } finally {
      if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
    }
  }
  // Kokoro es preferente, pero nunca debe dejar una interacción sin sonido.
  // La Web Speech API funciona como red de seguridad local y no requiere red.
  if (!asset) return fallbackToBrowser();
  if (ownSequence !== sequence) throw new DOMException('Reproducción cancelada', 'AbortError');
  options.onAsset?.(asset);

  const audio = audioElement();
  audio.src = asset.url;
  audio.load();

  return new Promise<AudioTiming>((resolve, reject) => {
    let settled = false;
    const clean = () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      if (cancelPending === onCancel) cancelPending = null;
    };
    const fail = (error: Error | DOMException) => {
      if (settled) return;
      settled = true;
      clean();
      reject(error);
    };
    const onPlaying = () => {
      if (settled) return;
      settled = true;
      unlocked = true;
      clean();
      const totalMs = Math.round(performance.now() - requestedAt);
      resolve({
        cached: asset.cached,
        requestMs: asset.requestMs,
        startMs: Math.max(0, totalMs - asset.requestMs),
        totalMs,
        rate: asset.rate,
        file: asset.file,
      });
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      clean();
      try { resolve(fallbackToBrowser()); }
      catch (error) { reject(error instanceof Error ? error : new Error('No se pudo reproducir el audio preparado.')); }
    };
    const onCancel = () => fail(new DOMException('Reproducción cancelada', 'AbortError'));
    cancelPending = onCancel;
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.play().catch(() => {
      if (ownSequence !== sequence) { fail(new DOMException('Reproducción cancelada', 'AbortError')); return; }
      onError();
    });
  });
}
