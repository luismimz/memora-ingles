import { naturalSpeechAsset, type SpeechAsset } from './api';

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

function audioElement() {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
  }
  return player;
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

export async function prefetchNaturalAudio(text: string, rate?: number) {
  return naturalSpeechAsset(text, { rate });
}

export async function playNaturalAudio(
  text: string,
  options: { rate?: number; onAsset?: (asset: SpeechAsset) => void } = {},
): Promise<AudioTiming> {
  stopNaturalAudio();
  const ownSequence = sequence;
  const requestedAt = performance.now();
  const asset = await naturalSpeechAsset(text, { rate: options.rate });
  if (!asset) throw new Error('La voz natural no está disponible.');
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
    const onError = () => fail(new Error('No se pudo reproducir el audio preparado.'));
    const onCancel = () => fail(new DOMException('Reproducción cancelada', 'AbortError'));
    cancelPending = onCancel;
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.play().catch((error) => fail(error instanceof Error ? error : new Error('El navegador bloqueó el audio.')));
  });
}
