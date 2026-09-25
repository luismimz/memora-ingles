// Datamuse (gratis, sin clave): pronunciación CMU con acento y palabras españolas que suenan parecido.
import { fetchJson } from './http.js';

const BASE = 'https://api.datamuse.com/words';

export function datamusePronunciation() {
  return {
    name: 'datamuse',
    async lookup(en) {
      const res = await fetchJson(`${BASE}?sp=${encodeURIComponent(en)}&md=r&max=1&ipa=0`);
      const hit = res.find((r) => r.word.toLowerCase() === en.toLowerCase()) ?? null;
      const pron = hit?.tags?.find((t) => t.startsWith('pron:'));
      return { arpabet: pron ? pron.slice(5).trim() : null };
    },
  };
}

export function datamuseCandidates() {
  return {
    name: 'datamuse',
    /** respellings = reescrituras "a la española" de la palabra entera y de su sílaba fuerte. */
    async candidates(respellings) {
      const seen = new Map();
      for (const q of respellings.filter(Boolean)) {
        const res = await fetchJson(`${BASE}?sl=${encodeURIComponent(q)}&v=es&max=40&md=fp`).catch(() => []);
        for (const r of res) {
          const freq = Number(r.tags?.find((t) => t.startsWith('f:'))?.slice(2) ?? 0);
          const noun = Boolean(r.tags?.includes('n'));
          if (!seen.has(r.word)) seen.set(r.word, { word: r.word, freq, noun });
        }
      }
      return [...seen.values()];
    },
  };
}
