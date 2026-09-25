// Clasifica todas las palabras (cognado, fácil, palabra clave, bloque, phrasal, irregular), guarda su
// pronunciación real (CMU vía Datamuse) y aplica la prueba piloto (content/pilot.json).
// Idempotente: solo pide a Datamuse lo que falta. Uso: node scripts/enrich-words.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './lib.mjs';
import { classifyWord } from '../../shared/classify.mjs';
import { arpabetPhones, pronunciationEs, scoreKeyword } from '../../shared/phonetics.mjs';

const contentDir = process.env.CONTENT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');

async function datamusePron(en) {
  try {
    const res = await (await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(en)}&md=r&max=1`)).json();
    const hit = res.find((r) => r.word.toLowerCase() === en.toLowerCase());
    return hit?.tags?.find((t) => t.startsWith('pron:'))?.slice(5).trim() ?? null;
  } catch { return null; }
}

const words = await api('GET', '/items/words?limit=-1&fields=id,en,es,kind,hint_es,arpabet,pron_es,pilot');
const verbs = JSON.parse(readFileSync(join(contentDir, 'irregular_verbs.json'), 'utf8'));
const familyName = new Map(verbs.families.map((f) => [f.key, f.name]));
const irregular = new Map(verbs.verbs.map(([base, past, participle, , family]) => [base, { past, participle, family: familyName.get(family) }]));
const known = new Map(words.filter((w) => !w.en.includes(' ')).map((w) => [w.en.toLowerCase(), w.es.split('/')[0].trim()]));

// 1) Pronunciación real (solo palabras sueltas sin arpabet), 6 peticiones en paralelo.
const missing = words.filter((w) => w.arpabet == null && !w.en.includes(' ')); // '' = Datamuse no la conoce
for (let i = 0; i < missing.length; i += 6) {
  await Promise.all(missing.slice(i, i + 6).map(async (w) => { w.arpabet = (await datamusePron(w.en)) ?? ''; w._dirty = true; }));
  if (i % 300 === 0 && missing.length > 50) console.log(`  pronunciación ${i}/${missing.length}`);
}

// 2) Clasificación + pronunciación figurada calculada (sin pisar las escritas a mano).
const pilot = existsSync(join(contentDir, 'pilot.json')) ? JSON.parse(readFileSync(join(contentDir, 'pilot.json'), 'utf8')).words : [];
const pilotByEn = new Map(pilot.map((p, i) => [p.en.toLowerCase(), { ...p, order: i + 1 }]));
for (const w of words) {
  const p = pilotByEn.get(w.en.toLowerCase());
  const c = classifyWord(w, { known, irregular });
  const kind = p?.kind ?? c.kind;
  const hint = p?.hint_es ?? c.hint_es;
  const pron = !w.pron_es && w.arpabet ? pronunciationEs(arpabetPhones(w.arpabet)) : w.pron_es;
  const order = p ? p.order : null;
  if (w._dirty || w.kind !== kind || w.hint_es !== hint || w.pron_es !== pron || (w.pilot ?? null) !== order) {
    Object.assign(w, { kind, hint_es: hint, pron_es: pron, pilot: order, _save: true });
  }
}
const toSave = words.filter((w) => w._save);
for (let i = 0; i < toSave.length; i += 100) {
  await api('PATCH', '/items/words', toSave.slice(i, i + 100).map(({ id, kind, hint_es, arpabet, pron_es, pilot }) => ({ id, kind, hint_es, arpabet, pron_es, pilot })));
}

// 3) Asociaciones de la prueba piloto (sustituyen a la "seed" anterior de esas palabras).
const byEn = new Map(words.map((w) => [w.en.toLowerCase(), w]));
let pilotMn = 0;
for (const p of pilot.filter((x) => x.keyword)) {
  const w = byEn.get(p.en.toLowerCase());
  if (!w) { console.warn(`  ⚠️ la palabra piloto "${p.en}" no existe`); continue; }
  const sc = scoreKeyword(arpabetPhones(w.arpabet), p.keyword);
  const data = { word: w.id, owner: null, source: 'seed', keyword: p.keyword, scene_es: p.scene_es, story_en: p.story_en, emoji: p.emoji, phon_score: sc.score, focus: sc.focusText };
  const [existing] = await api('GET', `/items/mnemonics?filter[word][_eq]=${w.id}&filter[owner][_null]=true&filter[source][_eq]=seed&limit=1`);
  if (existing) await api('PATCH', `/items/mnemonics/${existing.id}`, data); else await api('POST', '/items/mnemonics', data);
  pilotMn++;
  if (sc.verdict !== 'good') console.warn(`  ⚠️ ${p.en} → ${p.keyword}: sonido ${sc.verdict} (${sc.score})`);
}
// Las palabras piloto sin mnemotecnia no deben arrastrar la asociación antigua.
for (const p of pilot.filter((x) => !x.keyword)) {
  const w = byEn.get(p.en.toLowerCase());
  if (!w) continue;
  const old = await api('GET', `/items/mnemonics?filter[word][_eq]=${w.id}&filter[owner][_null]=true&fields=id&limit=-1`);
  if (old.length) await api('DELETE', '/items/mnemonics', old.map((m) => m.id));
}

// 4) Puntuación fonética de las asociaciones que aún no la tienen (para comparar retención según calidad del sonido).
const unscored = await api('GET', '/items/mnemonics?limit=-1&fields=id,word,keyword&filter[phon_score][_null]=true');
const byId = new Map(words.map((w) => [w.id, w]));
const verdicts = { good: 0, weak: 0, bad: 0 };
const scored = [];
for (const m of unscored) {
  const w = byId.get(m.word);
  if (!w?.arpabet || !m.keyword) continue;
  const sc = scoreKeyword(arpabetPhones(w.arpabet), m.keyword.replace(/\(.*?\)|\+|¡|!/g, ' '));
  verdicts[sc.verdict]++;
  scored.push({ id: m.id, phon_score: sc.score, focus: sc.focusText });
  if (sc.verdict === 'bad') console.log(`  sonido malo: ${w.en} → ${m.keyword} (${sc.score}, sílaba fuerte «${sc.focusText}»)`);
}
for (let i = 0; i < scored.length; i += 100) await api('PATCH', '/items/mnemonics', scored.slice(i, i + 100));
if (scored.length) console.log(`  asociaciones puntuadas: ${scored.length} → ${JSON.stringify(verdicts)}`);

const counts = words.reduce((m, w) => ({ ...m, [w.kind]: (m[w.kind] ?? 0) + 1 }), {});
console.log(`✓ Palabras enriquecidas: ${toSave.length} actualizadas · ${JSON.stringify(counts)} · piloto: ${pilot.length} (${pilotMn} con asociación)`);
