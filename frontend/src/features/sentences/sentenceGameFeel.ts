/**
 * Efectos de juego pequeños y locales para el Constructor.
 * No añade dependencias y falla silenciosamente si el navegador bloquea audio
 * o vibración (por ejemplo, antes de la primera interacción del usuario).
 */
type SentenceSound = 'lift' | 'snap' | 'wrong' | 'fanfare';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(frequency: number, duration: number, startAt: number, type: OscillatorType, gainValue: number) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export function playSentenceSound(sound: SentenceSound) {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  if (sound === 'lift') tone(420, 0.08, now, 'sine', 0.045);
  if (sound === 'snap') tone(740, 0.11, now, 'sine', 0.06);
  if (sound === 'wrong') tone(145, 0.16, now, 'triangle', 0.045);
  if (sound === 'fanfare') {
    tone(523.25, 0.16, now, 'sine', 0.055);
    tone(659.25, 0.18, now + 0.09, 'sine', 0.06);
    tone(783.99, 0.28, now + 0.19, 'sine', 0.07);
  }
}

export function haptic(pattern: number | number[] = 15) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
