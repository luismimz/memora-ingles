import { naturalSpeechAsset, type SpeechAsset } from './api';

export interface AudioTiming {
  cached: boolean;
  requestMs: number;
  startMs: number;
  totalMs: number;
  rate: number;
  file: string;
}
let active: HTMLAudioElement | null = null;
let sequence = 0;

export function stopNaturalAudio() {
  sequence += 1;
  // Kokoro y la voz del navegador nunca deben sonar a la vez.
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  if (!active) return;
  active.pause();
  active.removeAttribute('src');
  active.load();
  active = null;
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

  const audio = new Audio();
  active = audio;
  audio.preload = 'auto';
  audio.src = asset.url;

  return new Promise<AudioTiming>((resolve, reject) => {
    let settled = false;
    const clean = () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
    };
    const onPlaying = () => {
      if (settled) return;
      settled = true;
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
      reject(new Error('No se pudo reproducir el audio preparado.'));
    };
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.play().catch(onError);
  });
}
