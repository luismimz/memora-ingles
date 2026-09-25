// Voz como proveedor intercambiable. Por defecto, la Web Speech API del navegador (gratis, sin servidor).
// Para usar otro motor (p. ej. audios pregrabados o un TTS en la nube) basta con registrar otro TtsProvider.

export interface TtsProvider {
  name: string;
  speak(text: string, opts: { rate: number; lang: string; voice: string | null }): void;
  voices(): { name: string; lang: string }[];
}

export const webSpeechTts: TtsProvider = {
  name: 'webspeech',
  voices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')).map((v) => ({ name: v.name, lang: v.lang }));
  },
  speak(text, { rate, lang, voice }) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    u.lang = lang;
    u.rate = rate;
    if (lang.startsWith('en')) {
      const all = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      const v = all.find((x) => x.name === voice)
        ?? all.find((x) => /en-US/i.test(x.lang) && /Samantha|Google|Natural|Aria|Jenny/i.test(x.name))
        ?? all.find((x) => /en-US/i.test(x.lang)) ?? all[0];
      if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
  },
};

let provider: TtsProvider = webSpeechTts;
let settings = { voice: null as string | null, rate: 0.95 };
export const setTtsProvider = (p: TtsProvider) => { provider = p; };
export const configureSpeech = (voice: string | null, rate: number) => { settings = { voice, rate: rate || 0.95 }; };
export const englishVoices = () => provider.voices();
export function speak(text: string, opts: { rate?: number; lang?: string } = {}) {
  provider.speak(text, { rate: opts.rate ?? settings.rate, lang: opts.lang ?? 'en-US', voice: settings.voice });
}

type Rec = { start(): void; stop(): void; lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

export const canListen = () => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

/** Escucha una frase en inglés y devuelve las alternativas reconocidas. */
export function listen(lang = 'en-US'): { promise: Promise<string[]>; stop: () => void } {
  const w = window as unknown as Record<string, new () => Rec>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return { promise: Promise.reject(new Error('Tu navegador no permite reconocimiento de voz (prueba con Chrome).')), stop: () => {} };
  const rec = new Ctor();
  rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 5;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => { done = true; resolve(Array.from(e.results[0]).map((a) => a.transcript)); };
    rec.onerror = (e) => { done = true; reject(new Error(e.error === 'not-allowed' ? 'Permite el micrófono para practicar la pronunciación.' : `Error de micrófono: ${e.error}`)); };
    rec.onend = () => { if (!done) resolve([]); };
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}
