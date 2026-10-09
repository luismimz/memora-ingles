// Clasifica cada palabra para decidir CÓMO se aprende. No todas necesitan mnemotecnia:
//  cognate   -> se parece al español (con regla de transformación): basta con verlo.
//  easy      -> compuesta de piezas que ya conoces (bed + room).
//  keyword   -> método de la palabra clave (palabra puente + imagen).
//  chunk     -> expresión: se aprende entera, como un bloque, en su situación.
//  phrasal   -> verbo + partícula: la partícula tiene significado propio.
//  irregular -> verbo irregular: forma base con mnemotecnia + familia de sus formas.

export const KINDS = ['cognate', 'easy', 'keyword', 'chunk', 'phrasal', 'phrasal_verb', 'compound', 'irregular', 'feynman_model'];

export const KIND_LABEL = {
  cognate: 'Cognado', easy: 'Fácil', keyword: 'Palabra clave', chunk: 'Bloque', phrasal: 'Phrasal verb', phrasal_verb: 'Phrasal verb', compound: 'Palabra compuesta', irregular: 'Irregular', feynman_model: 'Modelo Feynman',
};

export const PARTICLES = {
  up: 'hacia arriba · o hasta el final (completar)', down: 'hacia abajo · reducir', out: 'hacia fuera · hasta agotarlo',
  off: 'separarse · desconectar · irse', on: 'encima · continuar · conectar', in: 'hacia dentro', away: 'lejos',
  back: 'de vuelta', over: 'por encima · de principio a fin', around: 'alrededor · sin rumbo', after: 'detrás de (cuidar)',
  for: 'en busca de', into: 'hacia dentro · convertirse', through: 'de lado a lado · hasta el final', along: 'avanzando junto a',
  by: 'pasando al lado', across: 'de un lado a otro', about: 'por ahí · sobre',
};

const COGNATE_RULES = [
  [/tion$/, 'ción', '-tion → -ción'], [/sion$/, 'sión', '-sion → -sión'], [/ty$/, 'dad', '-ty → -dad'],
  [/ly$/, 'mente', '-ly → -mente'], [/ous$/, 'oso', '-ous → -oso'], [/ical$/, 'ico', '-ical → -ico'], [/ic$/, 'ico', '-ic → -ico'],
  [/ive$/, 'ivo', '-ive → -ivo'], [/ist$/, 'ista', '-ist → -ista'], [/ism$/, 'ismo', '-ism → -ismo'],
  [/(ize|ise)$/, 'izar', '-ize → -izar'], [/ary$/, 'ario', '-ary → -ario'], [/ory$/, 'orio', '-ory → -orio'],
  [/ure$/, 'ura', '-ure → -ura'], [/ent$/, 'ente', '-ent → -ente'], [/ant$/, 'ante', '-ant → -ante'],
  [/ence$/, 'encia', '-ence → -encia'], [/ance$/, 'ancia', '-ance → -ancia'], [/ate$/, 'ar', '-ate → -ar'],
  [/fy$/, 'ficar', '-fy → -ficar'], [/y$/, 'ía', '-y → -ía'], [/er$/, 'ir', '-er → -ir (verbos)'], [/e$/, 'ar', '-e → -ar (verbos)'],
];

const PHRASAL_VERBS = new Set(('get go come take put give look turn make set break pick find run bring call check fill hang hold keep let point ' +
  'show sort throw try wake work write cut catch cheer calm drop eat end fall grow hand join knock log move pass pay speak stand think ' +
  'watch sit switch sign tidy warm wash carry hurry slow figure lie apply deal clear back blow build clean close count cross dress drive ' +
  'fit fix fly hurry lock lay line mix pull push shut shut slip start stay step stick take tear top wait walk wear wind wipe').split(' '));
const LINKERS = new Set(['with', 'to', 'of']);
const isSpanishVerb = (t) => /(ar|er|ir|ír|arse|erse|irse)(\b|$)/.test(t.split(' ')[0]);

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim();

function lev(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = t;
    }
  }
  return prev[b.length];
}
const ratio = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

/** Traducciones alternativas: "irse / dejar (algo)" -> ["irse", "dejar"]. */
export const translations = (es) => String(es).replace(/\([^)]*\)/g, '').split(/[/,;]/).map(norm).filter(Boolean);

/** ¿Se parece al español? Compara con su PROPIA traducción, así los falsos amigos nunca pasan. */
export function cognateRule(en, es) {
  const e = norm(en);
  if (e.length < 4 || e.includes(' ')) return null;
  for (const t of translations(es).slice(0, 1)) { // solo el significado principal
    for (const cand of t.split(' ')) {
      if (cand.length < 4) continue;
      // Primero la regla de transformación: enseña a reconocer cientos de palabras más.
      for (const [re, rep, label] of COGNATE_RULES) {
        if (re.test(e) && ratio(e.replace(re, rep), cand) >= 0.8) return label;
      }
      if (ratio(e, cand) >= 0.75) return 'Se escribe casi igual que en español';
    }
  }
  return null;
}

/**
 * @param {{en:string, es:string}} word
 * @param {{ known?: Map<string,string>, irregular?: Map<string,{past:string,participle:string,family?:string}> }} ctx
 *   known = inglés -> español del resto del vocabulario (para detectar compuestas).
 */
export function classifyWord(word, ctx = {}) {
  const en = norm(word.en);
  const parts = en.split(' ');
  const irr = ctx.irregular?.get(en);
  if (irr && isSpanishVerb(translations(word.es)[0] ?? '')) return { kind: 'irregular', hint_es: `${en} → ${irr.past} → ${irr.participle}${irr.family ? ` (familia: ${irr.family})` : ''}` };

  if (parts.length >= 2) {
    const rest = parts.slice(1);
    const particle = rest.find((p) => PARTICLES[p]);
    if (particle && PHRASAL_VERBS.has(parts[0]) && rest.every((p) => PARTICLES[p] || LINKERS.has(p))) {
      return { kind: 'phrasal', hint_es: `${parts[0]} + ${particle}: «${particle}» = ${PARTICLES[particle]}` };
    }
    return { kind: 'chunk', hint_es: 'Bloque: apréndelo entero, como si fuera una sola palabra, en la situación en que se usa.' };
  }

  const rule = cognateRule(en, word.es);
  if (rule) return { kind: 'cognate', hint_es: `Cognado: ${rule}.` };

  if (ctx.known && en.length >= 6) {
    for (let i = 3; i <= en.length - 3; i++) {
      const a = en.slice(0, i), b = en.slice(i);
      // Solo si la traducción comparte significado con alguna pieza (bed+room sí; car+pet ≠ alfombra).
      const stem = (x) => translations(x ?? '').map((t) => t.slice(0, 5)).filter((t) => t.length >= 4);
      const meaning = translations(word.es).join(' ');
      if (ctx.known.has(a) && ctx.known.has(b) && [...stem(ctx.known.get(a)), ...stem(ctx.known.get(b))].some((t) => meaning.includes(t))) {
        return { kind: 'easy', hint_es: `${a} (${ctx.known.get(a)}) + ${b} (${ctx.known.get(b)})` };
      }
    }
  }
  return { kind: 'keyword', hint_es: null };
}
