import { apiRequest, loadAsset } from './directus';

type SpeechResponse = { available: boolean; file?: string };

let currentAudio: HTMLAudioElement | null = null;
let playSerial = 0;
const speechFiles = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const unavailableUntil = new Map<string, number>();

type SpeechLanguage = 'en' | 'es';
const speechKey = (text: string, language: SpeechLanguage) => `${language}:${text}`;

function speakBrowser(text: string, language: SpeechLanguage, waitForEnd = false): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'es' ? 'es-ES' : 'en-US';
  utterance.rate = 0.9;
  const finished = waitForEnd ? new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.setTimeout(resolve, Math.min(8000, Math.max(2500, text.length * 85)));
  }) : Promise.resolve();
  window.speechSynthesis.speak(utterance);
  return finished;
}

async function requestSpeech(text: string, language: SpeechLanguage = 'en'): Promise<string | null> {
  const key = speechKey(text, language);
  const existing = speechFiles.get(key);
  if (existing) return existing;
  if (Date.now() < (unavailableUntil.get(language) ?? 0)) return null;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = apiRequest<SpeechResponse>('/memora/speech', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, rate: language === 'es' ? 0.94 : 0.9, voice: language === 'es' ? 'ef_dora' : undefined }),
  }).then((response) => {
    const file = response.available ? response.file ?? null : null;
    if (file) speechFiles.set(key, file);
    else unavailableUntil.set(language, Date.now() + 30_000);
    return file;
  }).catch(() => { unavailableUntil.set(language, Date.now() + 30_000); return null; }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

/** Solo precarga el audio de la pantalla próxima; nunca el catálogo completo. */
export function prefetchSpeech(text: string) {
  void requestSpeech(text).then((file) => file ? loadAsset(file).then(() => undefined) : undefined).catch(() => undefined);
}

export function prefetchSpanish(text: string) {
  void requestSpeech(text, 'es').then((file) => file ? loadAsset(file).then(() => undefined) : undefined).catch(() => undefined);
}

export function stopSpeech() {
  playSerial += 1;
  currentAudio?.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

async function playSpeech(text: string, language: SpeechLanguage, staticAudioId?: string, waitForEnd = false): Promise<void> {
  const serial = ++playSerial;
  currentAudio?.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  let expired = false;
  let timeout: number | null = null;
  let audioFinished: Promise<void> = Promise.resolve();
  const naturalVoice = (async () => {
    const file = staticAudioId || speechFiles.get(speechKey(text, language)) || await requestSpeech(text, language);
    if (!file) return false;
    const url = await loadAsset(file);
    if (serial !== playSerial || expired) return false;
    const audio = currentAudio ?? new Audio();
    currentAudio = audio;
    audio.src = url;
    if (waitForEnd) audioFinished = new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });
      window.setTimeout(resolve, Math.min(8000, Math.max(2500, text.length * 85)));
    });
    await audio.play();
    return true;
  })().catch(() => false);
  const result = await Promise.race([
    naturalVoice,
    new Promise<false>((resolve) => { timeout = window.setTimeout(() => resolve(false), 300); }),
  ]);
  if (timeout !== null) window.clearTimeout(timeout);
  if (!result && serial === playSerial) {
    expired = true;
    currentAudio?.pause();
    await speakBrowser(text, language, waitForEnd);
  } else if (waitForEnd) {
    await audioFinished;
  }
}

export function playEnglish(text: string, staticAudioId?: string, waitForEnd = false): Promise<void> {
  return playSpeech(text, 'en', staticAudioId, waitForEnd);
}

/** Lee la escena mnemotécnica en español y vuelve al sintetizador del navegador si Kokoro no está disponible. */
export function playSpanish(text: string, waitForEnd = false): Promise<void> {
  return playSpeech(text, 'es', undefined, waitForEnd);
}

let context: AudioContext | null = null;
function tone(start: number, end: number, duration: number, volume: number) {
  try {
    context ??= new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch { /* El silencio del efecto no bloquea el aprendizaje. */ }
}
export function playSnap() { tone(120, 30, 0.05, 0.22); navigator.vibrate?.(15); }
export function playMiss() { tone(80, 60, 0.12, 0.1); navigator.vibrate?.(20); }
