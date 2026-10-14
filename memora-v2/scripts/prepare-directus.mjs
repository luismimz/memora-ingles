import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const base = (process.env.DIRECTUS_URL || 'http://localhost:8056').replace(/\/$/, '');
const apply = process.argv.includes('--apply');
const publish = process.argv.includes('--publish');
const contentDir = join(here, '../content');
const fileFlag = process.argv.indexOf('--file');
if (process.argv.includes('--all') && fileFlag !== -1) throw new Error('Usa --all o --file, no ambos.');
if (fileFlag !== -1 && (!process.argv[fileFlag + 1] || process.argv[fileFlag + 1].startsWith('--'))) throw new Error('--file necesita un nombre JSON.');
const filenames = process.argv.includes('--all')
  ? (await readdir(contentDir)).filter((name) => name.endsWith('.json')).sort()
  : [fileFlag !== -1 ? process.argv[fileFlag + 1] : 'stage0-play-dog-beach.json'];
if (filenames.some((name) => basename(name) !== name || !name.endsWith('.json'))) throw new Error('Solo se admiten archivos JSON de content/.');
if (!filenames.length) throw new Error('No hay escenas JSON en content/.');
const contents = await Promise.all(filenames.map(async (name) => JSON.parse(await readFile(join(contentDir, name), 'utf8'))));

function inspectUnit(unit) {
  if (!unit.id || !unit.title || unit.words?.length !== 3 || !Array.isArray(unit.grammar) || unit.grammar.length < 1 || unit.sentence?.slots?.length < 3) {
    throw new Error('La unidad no cumple el contrato atómico de 3 palabras, al menos una forma y 3 segmentos.');
  }
  for (const word of unit.words) {
    if (!word.en || !word.es || !word.ipa || typeof word.bridge !== 'string' || !word.scene || ![1, 2].includes(word.emojis?.length)) {
      throw new Error(`Contenido incompleto en ${word.en || 'una palabra'}.`);
    }
    if (publish && !word.imageUrl) throw new Error(`${word.en}: falta ilustración aprobada; no se puede publicar.`);
  }
  for (const sentence of [unit.sentence, ...(unit.practiceSentences || [])]) {
    if (!sentence?.en || sentence.slots?.length < 3 || sentence.slots.map((slot) => slot.en).join(' ') !== sentence.en || sentence.slots.some((slot) => slot.choices?.length !== 2 || !slot.choices.includes(slot.en))) {
      throw new Error('Los segmentos no reconstruyen una de las frases con dos opciones válidas.');
    }
  }
}

contents.forEach(inspectUnit);
if (new Set(contents.map((unit) => unit.id)).size !== contents.length) throw new Error('Hay dos archivos con el mismo identificador de escena.');
const anchors = new Map();
for (const unit of contents) {
  if (new Set(unit.words.map((word) => word.en.toLocaleLowerCase('en-US'))).size !== unit.words.length) {
    throw new Error(`${unit.id}: la misma palabra aparece dos veces en una escena.`);
  }
  for (const word of unit.words) {
    const key = word.en.toLocaleLowerCase('en-US');
    const anchor = JSON.stringify([word.es, word.ipa, word.bridge, word.scene, word.emojis, word.imageUrl ?? null]);
    if (anchors.has(key) && anchors.get(key) !== anchor) {
      throw new Error(`${word.en}: su ancla cambia entre escenas. Reutiliza la misma palabra, escena e imagen.`);
    }
    anchors.set(key, anchor);
  }
}
if (publish && !apply) throw new Error('--publish requiere --apply.');
if (!apply) {
  console.log(`Simulación: ${contents.length} escena(s) válida(s): ${contents.map((unit) => unit.id).join(', ')}. Directus no se modificó.`);
  console.log('Usa --apply para guardarlas como borradores. --publish exige ilustraciones aprobadas en todas las palabras.');
  process.exit(0);
}

let token = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_TOKEN;
if (!token) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Falta token de administración o credenciales de Directus.');
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
  if (!response.ok) throw new Error(`Autenticación Directus: HTTP ${response.status}`);
  token = (await response.json()).data.access_token;
}

async function request(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : (await response.json()).data;
}

// Directus may return 403 for a missing collection even to an administrator.
// Check the accessible collection index instead of treating that status as a role failure.
const collections = await request('GET', '/collections');
const exists = collections.some(({ collection }) => collection === 'learning_units');
if (!exists) {
  await request('POST', '/collections', {
    collection: 'learning_units',
    meta: { icon: 'auto_stories', note: 'Unidades atómicas revisadas. Publicar solo con arte, frase y audio comprobados.' },
    schema: {},
    fields: [
      { field: 'id', type: 'string', meta: { interface: 'input', readonly: true }, schema: { is_primary_key: true } },
      { field: 'status', type: 'string', meta: { interface: 'select-dropdown' }, schema: { default_value: 'draft' } },
      { field: 'title', type: 'string', meta: { interface: 'input' }, schema: {} },
      { field: 'content', type: 'json', meta: { interface: 'input-code', options: { language: 'json' } }, schema: {} },
    ],
  });
  console.log('Colección learning_units creada.');
}

const existingById = new Map();
const existingItems = await request('GET', '/items/learning_units?fields=id,status&limit=-1');
const itemsById = new Map(existingItems.map((item) => [item.id, item]));
for (const content of contents) {
  const existing = itemsById.get(content.id) || null;
  existingById.set(content.id, existing);
  if (existing?.status === 'published' && !publish) throw new Error(`${content.id} ya está publicada. No se sobrescribe con --apply.`);
}
for (const content of contents) {
  const existing = existingById.get(content.id);
  const status = publish ? 'published' : 'draft';
  const payload = { status, title: content.title, content };
  if (existing) await request('PATCH', `/items/learning_units/${encodeURIComponent(content.id)}`, payload);
  else await request('POST', '/items/learning_units', { id: content.id, ...payload });
  console.log(`${content.id}: ${existing ? 'actualizada' : 'creada'} (${status}).`);
}
console.log('No se tocaron perfiles ni colecciones anteriores.');
