// Tatoeba: frases reales traducidas por personas (licencia CC BY 2.0 FR), gratis y sin clave.
import { fetchJson } from './http.js';

export function tatoebaSentences(env) {
  const base = env.TATOEBA_URL || 'https://api.tatoeba.org/unstable/sentences';
  return {
    name: 'tatoeba',
    async examples(en, limit = 5) {
      const q = en.includes(' ') ? `"${en}"` : `=${en}`;
      const url = `${base}?lang=eng&q=${encodeURIComponent(q)}&trans:lang=spa&sort=relevance&limit=${limit * 3}`;
      const res = await fetchJson(url);
      const out = [];
      for (const s of res.data ?? []) {
        const es = (s.translations ?? []).flat().find((t) => t.lang === 'spa')?.text;
        const words = s.text.split(/\s+/).length;
        if (es && words >= 3 && words <= 12) out.push({ en: s.text, es, source: `tatoeba#${s.id}` });
        if (out.length >= limit) break;
      }
      return out;
    },
  };
}
