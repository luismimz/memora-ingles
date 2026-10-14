import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { api, URL_BASE } from '../../backend/scripts/lib.mjs';

// Explicit local import only. Never migrate schema, overwrite existing content,
// publish drafts, or infer editorial approval from a structural check.
if (URL_BASE !== 'http://localhost:8056') throw new Error('Esta operación exige nuestro Directus local en el puerto 8056.');
const apply = process.argv.includes('--apply');
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { vocabularyPreviewPacks } = await server.ssrLoadModule('/src/preview/vocabularyPacks.ts');
  const { reviewUnits } = await server.ssrLoadModule('/src/preview/previewUnit.ts');
  const { validateUnit } = await server.ssrLoadModule('/src/domain/unit.ts');
  const candidates = [...reviewUnits, ...vocabularyPreviewPacks].map(validateUnit);
  if (new Set(candidates.map((unit) => unit.id)).size !== candidates.length) throw new Error('Identificadores duplicados.');
  const existing = await api('GET', '/items/learning_units?fields=id,status,content&limit=-1');
  const ids = new Set(existing.map((item) => item.id));
  const additions = candidates.filter((unit) => !ids.has(unit.id));
  const invalidPublished = existing.filter((item) => {
    if (item.status !== 'published') return false;
    try { validateUnit(item.content); return false; } catch { return true; }
  });
  console.log(JSON.stringify({ apply, existing: existing.length, draftsToCreate: additions.length, wordsInPacks: vocabularyPreviewPacks.reduce((total, pack) => total + pack.words.length, 0), invalidPublished: invalidPublished.map((item) => item.id) }));
  if (apply) {
    for (const unit of additions) await api('POST', '/items/learning_units', { id: unit.id, status: 'draft', title: unit.title, content: unit });
    for (const item of invalidPublished) await api('PATCH', `/items/learning_units/${encodeURIComponent(item.id)}`, { status: 'draft' });
    const after = await api('GET', '/items/learning_units?fields=id,status&limit=-1');
    if (additions.some((unit) => !after.some((item) => item.id === unit.id && item.status === 'draft'))) throw new Error('No se pudo verificar toda la importación.');
    console.log(JSON.stringify({ created: additions.length, withdrawn: invalidPublished.length, total: after.length, published: after.filter((item) => item.status === 'published').length }));
  }
} finally { await server.close(); }
