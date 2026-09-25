// Carga /content/dayNN.json, /content/wordlist.txt e irregular_verbs.json en Directus (upsert, idempotente).
// Uso: node scripts/seed-content.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './lib.mjs';

const contentDir = process.env.CONTENT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const WORDS_PER_DAY_SLOT = 200; // rank = (day-1)*200 + posición: deja hueco para ampliar un día sin reordenar
const POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', phr: 'phrase' };

async function allRows(collection, fields, filter = '') {
  return api('GET', `/items/${collection}?limit=-1&fields=${fields}${filter}`);
}

async function seedWords() {
  const files = readdirSync(contentDir).filter((f) => /^day\d+\.json$/.test(f)).sort();
  const existing = new Map((await allRows('words', 'id,en')).map((w) => [w.en.toLowerCase(), w.id]));
  const seeds = new Map((await allRows('mnemonics', 'id,word', '&filter[owner][_null]=true&filter[source][_eq]=seed'))
    .map((m) => [m.word, m.id]));
  const curated = new Set();
  let created = 0, updated = 0;

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(contentDir, file), 'utf8'));
    const f = data.fields;
    const toCreate = [];
    const rows = data.words.map((arr, i) => {
      const o = Object.fromEntries(f.map((k, j) => [k, arr[j]]));
      return { o, word: {
        rank: (data.day - 1) * WORDS_PER_DAY_SLOT + i + 1, day: data.day, en: o.en, es: o.es, pos: o.pos,
        ipa: o.ipa, pron_es: o.pron_es, example_en: o.example_en, example_es: o.example_es, topic: data.topic,
      } };
    });
    for (const { o, word } of rows) {
      curated.add(o.en.toLowerCase());
      let id = existing.get(o.en.toLowerCase());
      if (id) { await api('PATCH', `/items/words/${id}`, word); updated++; }
      else { toCreate.push({ o, word }); }
    }
    if (toCreate.length) {
      const res = await api('POST', '/items/words', toCreate.map((r) => r.word));
      res.forEach((w, i) => existing.set(toCreate[i].o.en.toLowerCase(), w.id));
      created += res.length;
    }
    // Asociaciones "seed"
    const newMn = [];
    for (const { o } of rows) {
      const wordId = existing.get(o.en.toLowerCase());
      const m = { word: wordId, owner: null, source: 'seed', keyword: o.keyword, scene_es: o.scene_es, story_en: o.story_en, emoji: o.emoji };
      const mid = seeds.get(wordId);
      if (mid) await api('PATCH', `/items/mnemonics/${mid}`, m); else newMn.push(m);
    }
    if (newMn.length) await api('POST', '/items/mnemonics', newMn);
    console.log(`  ${file}: ${rows.length} palabras (día ${data.day})`);
  }

  // Lista base (sin mnemotecnia): días aún no curados. La IA completará las asociaciones al vuelo.
  const listPath = join(contentDir, 'wordlist.txt');
  if (existsSync(listPath)) {
    const batch = [];
    let day = 0, topic = '', pos = 0, dups = 0;
    for (const raw of readFileSync(listPath, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || (line.startsWith('#') && !line.startsWith('##'))) continue;
      const h = line.match(/^##\s*(\d+)\s*\|\s*(.+)$/);
      if (h) { day = Number(h[1]); topic = h[2]; pos = 0; continue; }
      const [en, es, p] = line.split('|').map((x) => x?.trim());
      if (!en || !es || !day) continue;
      const key = en.toLowerCase();
      if (existing.has(key)) { dups++; continue; } // ya curada o repetida en un día anterior
      existing.set(key, -1);
      pos++;
      batch.push({ rank: (day - 1) * WORDS_PER_DAY_SLOT + pos, day, en, es, pos: POS[p] ?? p, topic });
    }
    for (let i = 0; i < batch.length; i += 200) await api('POST', '/items/words', batch.slice(i, i + 200));
    created += batch.length;
    console.log(`  wordlist.txt: ${batch.length} palabras nuevas sin asociación (${dups} repetidas omitidas)`);
  }
  console.log(`✓ Palabras: ${created} creadas, ${updated} actualizadas`);
}

async function seedVerbs() {
  const data = JSON.parse(readFileSync(join(contentDir, 'irregular_verbs.json'), 'utf8'));
  const existing = new Map((await allRows('irregular_verbs', 'id,base')).map((v) => [v.base, v.id]));
  const toCreate = [];
  for (const [i, arr] of data.verbs.entries()) {
    const o = Object.fromEntries(data.fields.map((k, j) => [k, arr[j]]));
    const row = { ...o, sort: i + 1 };
    const id = existing.get(o.base);
    if (id) await api('PATCH', `/items/irregular_verbs/${id}`, row); else toCreate.push(row);
  }
  if (toCreate.length) await api('POST', '/items/irregular_verbs', toCreate);
  console.log(`✓ Verbos irregulares: ${data.verbs.length}`);
}

await seedWords();
await seedVerbs();
