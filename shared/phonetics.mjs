// Similitud FONÉTICA (no ortográfica) entre la pronunciación inglesa real y una palabra puente española.
// Se comparte entre el servidor (extensión de Directus) y el navegador.
//
// Fuentes de pronunciación inglesa: ARPAbet del diccionario CMU (vía Datamuse, con acento marcado)
// o IPA como respaldo. La palabra española se convierte a fonemas con las reglas del castellano (España).
// Todo se reduce a un inventario común aproximado: vocales a e i o u ə + consonantes.

/** @typedef {{ p: string, s: number, g?: boolean }} Phone  p = fonema, s = acento (1 primario), g = semivocal */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ə']);
export const isVowel = (p) => VOWELS.has(p);

const ARPA = {
  AA: ['a'], AE: ['a'], AH: ['a'], AO: ['o'], AW: ['a', 'u'], AY: ['a', 'i'], EH: ['e'], ER: ['e', 'ɾ'],
  EY: ['e', 'i'], IH: ['i'], IY: ['i'], OW: ['o', 'u'], OY: ['o', 'i'], UH: ['u'], UW: ['u'],
  B: ['b'], CH: ['tʃ'], D: ['d'], DH: ['d'], F: ['f'], G: ['g'], HH: ['x'], JH: ['ʝ'], K: ['k'], L: ['l'],
  M: ['m'], N: ['n'], NG: ['n'], P: ['p'], R: ['ɾ'], S: ['s'], SH: ['ʃ'], T: ['t'], TH: ['θ'], V: ['b'],
  W: ['w'], Y: ['j'], Z: ['s'], ZH: ['ʃ'],
};

/** "F ER0 G EH1 T" -> fonemas con acento. */
export function arpabetPhones(arpabet) {
  const out = [];
  for (const tok of String(arpabet || '').trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^([A-Z]+)([012])?$/);
    if (!m) continue;
    const [, sym, st] = m;
    const stress = st === '1' ? 1 : st === '2' ? 2 : 0;
    if (sym === 'AH' && st === '0') { out.push({ p: 'ə', s: 0 }); continue; }
    if (sym === 'ER' && st === '0') { out.push({ p: 'ə', s: 0 }, { p: 'ɾ', s: 0 }); continue; }
    const ph = ARPA[sym];
    if (!ph) continue;
    ph.forEach((p, i) => out.push({ p, s: i === 0 ? stress : 0, g: i > 0 && isVowel(p) ? true : undefined }));
  }
  return out;
}

/** Respaldo: IPA ("/ˈbɑːroʊ/") -> fonemas. */
export function ipaPhones(ipa) {
  const s = String(ipa || '').replace(/[/[\]ː.]/g, '');
  const out = [];
  let stressNext = 0;
  const V = { ɑ: 'a', ɒ: 'a', æ: 'a', ʌ: 'a', a: 'a', ə: 'ə', ɚ: 'ə', ɝ: 'e', ɛ: 'e', e: 'e', ɪ: 'i', i: 'i', ɔ: 'o', o: 'o', ʊ: 'u', u: 'u' };
  const C = { θ: 'θ', ð: 'd', ʃ: 'ʃ', ʒ: 'ʃ', ŋ: 'n', j: 'j', w: 'w', h: 'x', ɹ: 'ɾ', r: 'ɾ', ɾ: 'ɾ', ɡ: 'g', g: 'g', v: 'b', z: 's', b: 'b', d: 'd', f: 'f', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', s: 's', t: 't', x: 'x' };
  for (let i = 0; i < s.length; i++) {
    const c = s[i], two = s.slice(i, i + 2);
    if (c === 'ˈ') { stressNext = 1; continue; }
    if (c === 'ˌ') { stressNext = 2; continue; }
    if (two === 'tʃ') { out.push({ p: 'tʃ', s: 0 }); i++; continue; }
    if (two === 'dʒ') { out.push({ p: 'ʝ', s: 0 }); i++; continue; }
    if (V[c]) {
      const prev = out[out.length - 1];
      const glide = prev && isVowel(prev.p) && !prev.g && (c === 'ɪ' || c === 'ʊ');
      out.push({ p: V[c], s: glide ? 0 : stressNext, g: glide || undefined });
      if (!glide) stressNext = 0;
      if (c === 'ɝ' || c === 'ɚ') out.push({ p: 'ɾ', s: 0 });
      continue;
    }
    if (C[c]) out.push({ p: C[c], s: 0 });
  }
  if (!out.some((x) => x.s === 1)) { const v = out.find((x) => isVowel(x.p)); if (v) v.s = 1; }
  return out;
}

/** Palabra o expresión española -> fonemas (castellano de España: c/z = θ). */
export function spanishPhones(text) {
  const w = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u0302\u0304-\u0307\u0309-\u036f]/g, '').normalize('NFC')
    .replace(/[^a-zñü]/g, '');
  const out = [];
  const push = (p) => out.push({ p, s: 0 });
  const front = (ch) => ch === 'e' || ch === 'i';
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1], prev = w[i - 1];
    if (c === 'c' && n === 'h') { push('tʃ'); i++; continue; }
    if (c === 'l' && n === 'l') { push('ʝ'); i++; continue; }
    if (c === 'r' && n === 'r') { push('r'); i++; continue; }
    if (c === 'q' && n === 'u') { push('k'); i++; continue; }
    if (c === 'g' && n === 'u' && front(w[i + 2])) { push('g'); i++; continue; }
    if (c === 'g' && n === 'ü') { push('g'); push('w'); i++; continue; }
    if (c === 'c') { push(front(n) ? 'θ' : 'k'); continue; }
    if (c === 'g') { push(front(n) ? 'x' : 'g'); continue; }
    if (c === 'j') { push('x'); continue; }
    if (c === 'h') continue;
    if (c === 'v') { push('b'); continue; }
    if (c === 'z') { push('θ'); continue; }
    if (c === 'ñ') { push('ɲ'); continue; }
    if (c === 'x') { push('k'); push('s'); continue; }
    if (c === 'y') { push(!n || !isVowel(n) ? 'i' : 'ʝ'); continue; }
    if (c === 'r') { push(i === 0 || 'nls'.includes(prev) ? 'r' : 'ɾ'); continue; }
    if (c === 'u' && n && isVowel(n) && !(prev === 'q' || prev === 'g')) { out.push({ p: 'w', s: 0 }); continue; }
    if (c === 'ü') { out.push({ p: 'w', s: 0 }); continue; }
    if ('aeiou'.includes(c)) { push(c); continue; }
    if ('bdfklmnpstw'.includes(c)) { push(c); continue; }
  }
  return out;
}

// ---------- Coste de sustitución entre fonemas ----------
const PAIRS = {
  'b|p': 0.4, 'd|t': 0.4, 'g|k': 0.4, 's|θ': 0.25, 's|ʃ': 0.4, 'tʃ|ʃ': 0.3, 'j|ʝ': 0.2, 'i|j': 0.15, 'u|w': 0.15,
  'g|w': 0.35, 'b|w': 0.5, 'r|ɾ': 0.1, 'd|ɾ': 0.6, 'l|ɾ': 0.6, 'm|n': 0.5, 'n|ɲ': 0.3, 'f|θ': 0.5, 'k|x': 0.6,
  'tʃ|ʝ': 0.4, 'ʃ|ʝ': 0.5, 't|θ': 0.5, 'd|θ': 0.5, 'k|kw': 0.3,
  'a|e': 0.35, 'e|i': 0.35, 'o|u': 0.3, 'a|o': 0.4,
};
function sub(a, b) {
  if (a === b) return 0;
  if (a === 'ə' && isVowel(b)) return 0.15;
  if (b === 'ə' && isVowel(a)) return 0.15;
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  if (PAIRS[k] !== undefined) return PAIRS[k];
  if (isVowel(a) && isVowel(b)) return 0.6;
  if (isVowel(a) !== isVowel(b)) return 1.2;
  return 1;
}
/** Coste de que un fonema INGLÉS no aparezca en la palabra puente. */
function delEn(ph) {
  if (ph.p === 'ə' || ph.g) return 0.25;
  if (ph.p === 'x') return 0.4; // la h inglesa es débil
  return isVowel(ph.p) ? 0.6 : 0.8;
}
/** Coste de que la palabra puente tenga un fonema extra. */
function insEs(ph) { return isVowel(ph.p) ? 0.4 : 0.7; }

/** Distancia de alineamiento. semiglobal = los extremos de la palabra puente son gratis (buscar un trozo dentro). */
function align(en, es, semiglobal) {
  const n = en.length, m = es.length;
  // En la búsqueda de la sílaba fuerte, meter sonidos en medio rompe el parecido: se penaliza más.
  const ins = semiglobal ? (ph) => (isVowel(ph.p) ? 0.9 : 1) : insEs;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + delEn(en[i - 1]);
  for (let j = 1; j <= m; j++) dp[0][j] = semiglobal ? 0 : dp[0][j - 1] + ins(es[j - 1]);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + sub(en[i - 1].p, es[j - 1].p),
        dp[i - 1][j] + delEn(en[i - 1]),
        dp[i][j - 1] + ins(es[j - 1]),
      );
    }
  }
  return semiglobal ? Math.min(...dp[n]) : dp[n][m];
}

/** La parte más reconocible: consonantes de ataque + vocal acentuada (+ semivocal) + una consonante de cierre. */
export function stressedFocus(phones) {
  if (!phones.length) return [];
  let v = phones.findIndex((x) => x.s === 1 && isVowel(x.p));
  if (v < 0) v = phones.findIndex((x) => isVowel(x.p));
  if (v < 0) return phones;
  // Ataque: 1 consonante, o 2 si forman grupo válido (br, pl, st, tw…).
  let start = v;
  if (v > 0 && !isVowel(phones[v - 1].p)) {
    start = v - 1;
    const a = phones[v - 2], b = phones[v - 1];
    if (a && !isVowel(a.p) && (['l', 'ɾ', 'w', 'j'].includes(b.p) || a.p === 's')) start = v - 2;
  }
  let end = v + 1;
  if (phones[end]?.g) end++;
  if (phones[end] && !isVowel(phones[end].p)) end++;
  return phones.slice(start, end);
}

export const render = (phones) => phones.map((x) => x.p).join('');

/**
 * Puntúa una palabra puente frente a la pronunciación inglesa.
 * @returns {{score:number, whole:number, focus:number, focusText:string, verdict:'good'|'weak'|'bad'}}
 */
export function scoreKeyword(enPhones, keyword) {
  const es = spanishPhones(keyword);
  if (!enPhones.length || !es.length) return { score: 0, whole: 0, focus: 0, focusText: '', verdict: 'bad' };
  const whole = Math.max(0, 1 - align(enPhones, es, false) / enPhones.length);
  const f = stressedFocus(enPhones);
  const focus = Math.max(0, 1 - align(f, es, true) / f.length);
  // Lo decisivo es que la sílaba fuerte se reconozca; el resto de la palabra ayuda.
  const score = Math.round((0.35 * whole + 0.65 * focus) * 100) / 100;
  return { score, whole: round(whole), focus: round(focus), focusText: render(f), verdict: verdictFor(score) };
}
const round = (x) => Math.round(x * 100) / 100;
export const GOOD = 0.65;
export const WEAK = 0.52;
export const verdictFor = (score) => (score >= GOOD ? 'good' : score >= WEAK ? 'weak' : 'bad');

/** Pronunciación inglesa de una palabra desde lo que haya disponible. */
export function englishPhones(word) {
  if (word?.arpabet) return arpabetPhones(word.arpabet);
  if (word?.ipa) return ipaPhones(word.ipa);
  return [];
}

/** Reescritura "a la española" de un trozo inglés, para buscar palabras que suenen igual (Datamuse, v=es). */
export function spanishRespelling(phones) {
  let out = '';
  phones.forEach((x, i) => {
    const next = phones[i + 1]?.p;
    const frontNext = next === 'e' || next === 'i';
    switch (x.p) {
      case 'ə': out += 'a'; break;
      case 'k': out += frontNext ? 'qu' : 'c'; break;
      case 'g': out += frontNext ? 'gu' : 'g'; break;
      case 'θ': out += 'z'; break;
      case 'ʃ': case 'tʃ': out += 'ch'; break;
      case 'ʝ': out += 'y'; break;
      case 'x': out += 'j'; break;
      case 'w': out += next && isVowel(next) ? 'gu' : 'u'; break;
      case 'j': out += 'y'; break;
      case 'ɾ': out += 'r'; break;
      case 'r': out += 'rr'; break;
      case 'ɲ': out += 'ñ'; break;
      default: out += x.p;
    }
  });
  return out;
}

/**
 * Pronunciación figurada "a la española" calculada desde la pronunciación REAL (no es la palabra puente):
 * sílabas separadas por guiones y la acentuada en MAYÚSCULAS. Ej.: forget -> "far-GUET".
 */
export function pronunciationEs(phones) {
  if (!phones.length) return '';
  const nuclei = [];
  phones.forEach((x, i) => { if (isVowel(x.p) && !x.g) nuclei.push(i); });
  if (!nuclei.length) return spanishRespelling(phones);
  const starts = nuclei.map((v, k) => {
    if (k === 0) return 0;
    let s = v;
    if (v > 0 && !isVowel(phones[v - 1].p)) {
      s = v - 1;
      const a = phones[v - 2], b = phones[v - 1];
      if (a && !isVowel(a.p) && ['l', 'ɾ', 'w', 'j'].includes(b.p) && !['l', 'ɾ'].includes(a.p)) s = v - 2;
    }
    return s;
  });
  return starts.map((s, k) => {
    const syl = phones.slice(s, starts[k + 1] ?? phones.length);
    const txt = spanishRespelling(syl).replace(/^gu(?=[ao])/, 'u');
    return syl.some((x) => x.s === 1) ? txt.toUpperCase() : txt;
  }).join('-');
}
