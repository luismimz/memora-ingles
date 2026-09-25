// Comprobación tolerante de respuestas escritas.

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/[¿?¡!.,;:"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EN_PREFIX = /^(to|the|a|an) /;
const ES_PREFIX = /^(el|la|los|las|un|una|unos|unas) /;

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Separa "irse / dejar (algo)" en ["irse", "dejar"]. */
export function alternatives(expected: string): string[] {
  return expected
    .replace(/\([^)]*\)/g, '')
    .split(/[/,;]| or /)
    .map((s) => normalize(s))
    .filter(Boolean);
}

const tolerance = (len: number) => (len <= 4 ? 0 : len <= 8 ? 1 : 2);

export type Check = { correct: boolean; typo: boolean };

/** Compara la respuesta con una o varias alternativas; admite erratas pequeñas. */
export function checkAnswer(given: string, expected: string, lang: 'en' | 'es' = 'en'): Check {
  const strip = (s: string) => s.replace(lang === 'en' ? EN_PREFIX : ES_PREFIX, '');
  const g = strip(normalize(given));
  if (!g) return { correct: false, typo: false };
  for (const alt of alternatives(expected).map(strip)) {
    if (g === alt) return { correct: true, typo: false };
    if (levenshtein(g, alt) <= tolerance(alt.length)) return { correct: true, typo: true };
  }
  return { correct: false, typo: false };
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'cannot'], [/\bshan't\b/g, 'shall not'], [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'],
  [/\b(it|there|here|that|what|he|she|who|where|how)'s\b/g, '$1 is'], [/\blet's\b/g, 'let us'],
];
/** Palabras normalizadas de una frase, con las contracciones desplegadas (There's = There is). */
export function sentenceTokens(s: string): string[] {
  let t = normalize(s);
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t.replace(/'/g, '').split(' ').filter(Boolean);
}

export type DiffStatus = 'ok' | 'typo' | 'wrong' | 'missing' | 'extra';
export interface DiffToken { word: string; status: DiffStatus; given?: string }

/**
 * Compara palabra a palabra lo escrito con la frase correcta:
 *  ok = igual · typo = errata pequeña (cuenta como bien) · wrong = otra palabra · missing = falta · extra = sobra.
 * En palabras de 4 letras o menos no se admiten erratas: «bog» no es «dog».
 */
export function diffWords(given: string, expected: string): DiffToken[] {
  const a = sentenceTokens(given), b = sentenceTokens(expected);
  // Mostrar las palabras como se escribieron (mayúsculas), si no hubo que desplegar contracciones.
  const raw = (s: string) => s.split(/\s+/).map((w) => w.replace(/^[¿¡"'(]+|[.,!?;:"')]+$/g, '')).filter(Boolean);
  const aShow = raw(given).length === a.length ? raw(given) : a;
  const bShow = raw(expected).length === b.length ? raw(expected) : b;
  // Cambiar una palabra por otra sin relación cuesta algo más que añadir/quitar una:
  // así «I want learn the English» se lee como «falta to» + «sobra the», no como dos palabras cambiadas.
  const cost = (x: string, y: string) => (x === y ? 0 : levenshtein(x, y) <= tolerance(y.length) ? 0.4 : 1.2);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j - 1] + cost(a[i - 1], b[j - 1]), dp[i - 1][j] + 1, dp[i][j - 1] + 1);
  const out: DiffToken[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost(a[i - 1], b[j - 1])) {
      const c = cost(a[i - 1], b[j - 1]);
      out.push({ word: bShow[j - 1], status: c === 0 ? 'ok' : c < 1 ? 'typo' : 'wrong', given: aShow[i - 1] });
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) { out.push({ word: bShow[j - 1], status: 'missing' }); j--; }
    else { out.push({ word: aShow[i - 1], status: 'extra' }); i--; }
  }
  return out.reverse();
}

/** Para frases completas: proporción de palabras correctas (las erratas cuentan como bien). */
export function sentenceScore(given: string, expected: string): number {
  const d = diffWords(given, expected);
  const good = d.filter((t) => t.status === 'ok' || t.status === 'typo').length;
  return d.length ? good / d.length : 0;
}

/** Pone un hueco donde aparece la palabra en el ejemplo (acepta -s, -ed, -ing...). */
export function makeCloze(sentence: string | null, word: string): string | null {
  if (!sentence) return null;
  const base = word.split(' ')[0].replace(/[^a-zA-Z']/g, '');
  if (!base) return null;
  const re = new RegExp(`\\b${base}[a-z]{0,3}\\b`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}
