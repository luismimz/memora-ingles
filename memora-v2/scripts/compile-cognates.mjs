import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const phones = { AA:'ɑ', AE:'æ', AH:'ʌ', AO:'ɔ', AW:'aʊ', AY:'aɪ', B:'b', CH:'tʃ', D:'d', DH:'ð', EH:'ɛ', ER:'ɝ', EY:'eɪ', F:'f', G:'ɡ', HH:'h', IH:'ɪ', IY:'i', JH:'dʒ', K:'k', L:'l', M:'m', N:'n', NG:'ŋ', OW:'oʊ', OY:'ɔɪ', P:'p', R:'r', S:'s', SH:'ʃ', T:'t', TH:'θ', UH:'ʊ', UW:'u', V:'v', W:'w', Y:'j', Z:'z', ZH:'ʒ' };
const onsets = new Set(['P R','B R','T R','D R','K R','G R','F R','TH R','SH R','P L','B L','K L','G L','F L','S L','S M','S N','S P','S T','S K','S W','T W','K W','S P R','S T R','S K R','S P L','S K W']);
/** Broad CMU phonemes, not a synthesized Spanish spelling. Stress placement
 * uses conservative English onsets; output remains editorial pending review. */
export function arpaToIPA(tokens) {
  const vowels = tokens.map((token, index) => /[012]$/.test(token) ? index : -1).filter((index) => index >= 0);
  if (!vowels.length) throw new Error('Pronunciation has no vowel.');
  const marks = new Map();
  for (let v = 0; v < vowels.length; v++) {
    const index = vowels[v];
    const stress = tokens[index].slice(-1);
    if (vowels.length === 1 || stress === '0') continue;
    let start = index;
    if (v === 0) start = 0;
    else {
      const afterPrevious = vowels[v - 1] + 1;
      if (index > afterPrevious) start = index - 1;
      for (let candidate = Math.max(afterPrevious, index - 3); candidate < index - 1; candidate++) {
        if (onsets.has(tokens.slice(candidate, index).join(' '))) { start = candidate; break; }
      }
    }
    marks.set(start, stress === '1' ? 'ˈ' : 'ˌ');
  }
  return '/' + tokens.map((token, index) => {
    const name = token.replace(/[012]$/, '');
    const value = name === 'AH' && token.endsWith('0') ? 'ə' : name === 'ER' && token.endsWith('0') ? 'ɚ' : phones[name];
    if (!value) throw new Error(`Unknown CMU phone ${token}.`);
    return (marks.get(index) || '') + value;
  }).join('') + '/';
}

export function readCmu(source) {
  const result = new Map();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith(';;;')) continue;
    const [word, ...raw] = line.trim().split(/\s+/);
    const tokens = raw.slice(0, raw.findIndex((token) => token.startsWith('#')) >= 0 ? raw.findIndex((token) => token.startsWith('#')) : raw.length);
    result.set(word.toLowerCase(), tokens);
  }
  return result;
}

export function compileCognates(seeds, dictionary, existing = []) {
  const seen = new Set(existing.map((entry) => entry.en.toLowerCase()));
  const entries = [];
  const held = [];
  const variants = { finance: 'finance(3)' };
  for (const [en, es, exampleEn, exampleEs, domain, note] of seeds.entries) {
    if (/excluir|falso amigo|no cognado|no suficientemente|no contar|no incrementar|revisar antes de tratar|preparar contexto aparte/i.test(note)) { held.push({ en, reason: note }); continue; }
    if (seen.has(en)) { held.push({ en, reason: 'Lema ya conservado: ejemplo adicional, no nueva palabra.' }); continue; }
    const tokens = dictionary.get(variants[en] || en);
    if (!tokens) { held.push({ en, reason: 'Pronunciación no encontrada; revisión manual pendiente.' }); continue; }
    if (!new RegExp(`\\b${en}\\b`, 'i').test(exampleEn)) { held.push({ en, reason: 'El ejemplo no contiene el lema literal; revisar flexión.' }); continue; }
    seen.add(en);
    entries.push({ id: entries.length + 1, en: en.toUpperCase(), es, ipa: arpaToIPA(tokens), bridge: '', associationMode: 'cognate', scene: `${en.toUpperCase()} → ${es}`, cognateEvidence: { sameMeaning: true, note }, usageExample: { en: exampleEn, es: exampleEs }, emojis: [domain === 'tecnología' ? '💻' : domain === 'restauración' ? '🍽️' : domain === 'trabajo' ? '💼' : domain === 'educación' ? '📚' : domain === 'salud' ? '🩺' : domain === 'ocio' ? '🎭' : domain === 'calle' ? '🏙️' : '🏠'], domain, associationId: `cognate-${en}`, associationVersion: 1, status: 'needs_review', ipaProvenance: { source: 'CMU Pronouncing Dictionary', version: '74790861f652b15e4ac49015a90074ad62a27690', arpabet: tokens.join(' '), license: 'CMUDICT-LICENSE.txt', review: 'pending' } });
  }
  return { entries, held };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dictionaryPath = process.argv.find((argument) => argument.startsWith('--dictionary='))?.slice('--dictionary='.length);
  if (!dictionaryPath) throw new Error('Specify a reviewed public CMU dictionary with --dictionary=PATH.');
  const seeds = JSON.parse(readFileSync(resolve(root, 'content/production/cognate-seeds-002.json'), 'utf8'));
  const existing = JSON.parse(readFileSync(resolve(root, 'content/production/cognate-batch-001.json'), 'utf8')).entries;
  const result = compileCognates(seeds, readCmu(readFileSync(dictionaryPath, 'utf8')), existing);
  const data = { schemaVersion: 1, compiler: 'memora-cognates-v1', status: 'needs_review', note: 'Cognados redactados localmente. No publicados: texto, pronunciación, audio y uso necesitan revisión.', ...result };
  if (process.argv.includes('--write')) {
    const path = resolve(root, 'content/production/cognate-batch-002.json');
    if (existsSync(path) && JSON.parse(readFileSync(path, 'utf8')).compiler !== data.compiler) throw new Error('Refusing to overwrite non-generated content.');
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  }
  console.log(JSON.stringify({ draftedRows: seeds.entries.length, compiledCandidates: result.entries.length, heldForReview: result.held.length, writes: process.argv.includes('--write') }, null, 2));
}
