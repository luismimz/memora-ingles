import { apiRequest, loadAsset } from './directus';

type SpeechResponse = { available: boolean; file?: string };

let currentAudio: HTMLAudioElement | null = null;
let playSerial = 0;
let cancelPlayback: (() => void) | null = null;
const speechFiles = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const unavailableUntil = new Map<string, number>();

type SpeechLanguage = 'en' | 'es';
export type SpeechSource = 'kokoro' | 'recording' | 'browser';
export type PlaybackResult = { status: 'played' | 'blocked' | 'unavailable' | 'cancelled'; source: SpeechSource | null };
const speechKey = (text: string, language: SpeechLanguage) => `${language}:${text}`;

async function requestSpeech(text: string, language: SpeechLanguage = 'en'): Promise<string | null> {
  const key = speechKey(text, language);
  const existing = speechFiles.get(key);
  if (existing) return existing;
  if (Date.now() < (unavailableUntil.get(language) ?? 0)) return null;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const controller = new AbortController();
  const deadline = window.setTimeout(() => controller.abort(), 25_000);
  const request = apiRequest<SpeechResponse>('/memora/speech', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({ text, rate: language === 'es' ? 0.94 : 0.9, voice: language === 'es' ? 'ef_dora' : undefined }),
  }).then((response) => {
    const file = response.available ? response.file ?? null : null;
    if (file) speechFiles.set(key, file);
    else unavailableUntil.set(language, Date.now() + 30_000);
    return file;
  }).catch(() => { unavailableUntil.set(language, Date.now() + 30_000); return null; }).finally(() => { window.clearTimeout(deadline); pending.delete(key); });
  pending.set(key, request);
  return request;
}

/** Solo precarga el audio de la pantalla próxima; nunca el catálogo completo. */
export function prefetchSpeech(text: string, staticAudioId?: string) {
  void (staticAudioId ? Promise.resolve(staticAudioId) : requestSpeech(text)).then((file) => file ? loadAsset(file).then(() => undefined) : undefined).catch(() => undefined);
}

export function prefetchSpanish(text: string) {
  void requestSpeech(text, 'es').then((file) => file ? loadAsset(file).then(() => undefined) : undefined).catch(() => undefined);
}

export function stopSpeech() {
  playSerial += 1;
  cancelPlayback?.();
  currentAudio?.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function playSpeech(text: string, language: SpeechLanguage, staticAudioId?: string, waitForEnd = false, onStarted?: (source: SpeechSource) => void): Promise<PlaybackResult> {
  stopSpeech();
  const serial = playSerial;
  return new Promise((resolve) => {
    let settled = false;
    let usingBrowser = false;
    let source: SpeechSource | null = null;
    let audio: HTMLAudioElement | null = null;
    const cleanups: (() => void)[] = [];
    const durationLimit = Math.min(180_000, Math.max(15_000, text.length * 180 + 5000));
    const finish = (status: PlaybackResult['status']) => {
      if (settled) return;
      settled = true;
      cleanups.forEach((cleanup) => cleanup());
      if (cancelPlayback === cancel) cancelPlayback = null;
      if (status !== 'played') { audio?.pause(); if (usingBrowser) window.speechSynthesis?.cancel(); }
      resolve({ status, source });
    };
    const cancel = () => finish('cancelled');
    cancelPlayback = cancel;
    const schedule = (callback: () => void, ms: number) => {
      const timer = window.setTimeout(callback, ms);
      const clear = () => window.clearTimeout(timer);
      cleanups.push(clear);
      return clear;
    };
    const browserFallback = () => {
      if (settled || usingBrowser || serial !== playSerial) return;
      usingBrowser = true;
      audio?.pause();
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { finish('unavailable'); return; }
      source = 'browser';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = .9;
      const clearStart = schedule(() => finish('unavailable'), 5000);
      utterance.onstart = () => {
        if (settled) return;
        clearStart(); onStarted?.('browser');
        if (!waitForEnd) finish('played');
        else schedule(() => finish('unavailable'), durationLimit);
      };
      utterance.onend = () => finish('played');
      utterance.onerror = (event) => finish(event.error === 'not-allowed' ? 'blocked' : 'unavailable');
      cleanups.push(() => { utterance.onstart = null; utterance.onend = null; utterance.onerror = null; });
      try { window.speechSynthesis.speak(utterance); } catch { finish('unavailable'); }
    };
    // Kokoro can take seconds to generate a new clip. Keep the page usable while
    // waiting, rather than replacing a healthy voice after just 300 milliseconds.
    const clearPreparation = schedule(browserFallback, 25_000);
    void (async () => {
      try {
        const file = staticAudioId || speechFiles.get(speechKey(text, language)) || await requestSpeech(text, language);
        if (settled || usingBrowser || serial !== playSerial) return;
        if (!file) { clearPreparation(); browserFallback(); return; }
        const url = await loadAsset(file);
        if (settled || usingBrowser || serial !== playSerial) return;
        clearPreparation();
        source = staticAudioId ? 'recording' : 'kokoro';
        audio = new Audio(url);
        currentAudio = audio;
        const element = audio;
        const ended = () => { if (!usingBrowser) finish('played'); };
        const error = () => { if (!usingBrowser) browserFallback(); };
        element.addEventListener('ended', ended);
        element.addEventListener('error', error);
        cleanups.push(() => { element.removeEventListener('ended', ended); element.removeEventListener('error', error); });
        const clearStart = schedule(() => { if (!usingBrowser) finish('unavailable'); }, 10_000);
        await element.play();
        clearStart();
        if (settled || usingBrowser || serial !== playSerial) { element.pause(); return; }
        onStarted?.(source);
        if (!waitForEnd) finish('played');
        else schedule(() => { if (!usingBrowser) finish('unavailable'); }, durationLimit);
      } catch (error) {
        if (settled || usingBrowser || serial !== playSerial) return;
        clearPreparation();
        if (error instanceof Error && error.name === 'NotAllowedError') finish('blocked');
        else browserFallback();
      }
    })();
  });
}

export function playEnglish(text: string, staticAudioId?: string, waitForEnd = false, onStarted?: (source: SpeechSource) => void): Promise<PlaybackResult> {
  return playSpeech(text, 'en', staticAudioId, waitForEnd, onStarted);
}

/** Lee la escena mnemotécnica en español y vuelve al sintetizador del navegador si Kokoro no está disponible. */
export function playSpanish(text: string, waitForEnd = false, onStarted?: (source: SpeechSource) => void): Promise<PlaybackResult> {
  return playSpeech(text, 'es', undefined, waitForEnd, onStarted);
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
