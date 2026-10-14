import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Produces an explicit, inspectable import. Never runs on application startup.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { vocabularyPreviewPacks } = await server.ssrLoadModule('/src/preview/vocabularyPacks.ts');
  const { reviewUnits } = await server.ssrLoadModule('/src/preview/previewUnit.ts');
  const { phrasalPreviewPacks } = await server.ssrLoadModule('/src/preview/phrasalPacks.ts');
  const { validateUnit } = await server.ssrLoadModule('/src/domain/unit.ts');
  const units = [...reviewUnits, ...vocabularyPreviewPacks, ...phrasalPreviewPacks].map(validateUnit);
  if (new Set(units.map(unit => unit.id)).size !== units.length) throw new Error('Duplicate unit IDs');
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;
  // Publication is explicitly requested by the owner; it is not editorial approval.
  // Existing records, users, permissions and progress are never overwritten.
  const rows = units.map(unit => `(${quote(unit.id)}, 'published', ${quote(unit.title)}, ${quote(JSON.stringify(unit))}::json)`);
  const sql = `BEGIN;\nINSERT INTO learning_units (id,status,title,content) VALUES\n${rows.join(',\n')}\nON CONFLICT (id) DO NOTHING;\nCOMMIT;\nSELECT status, count(*) FROM learning_units GROUP BY status;\n`;
  writeFileSync(fileURLToPath(new URL('../../content/memora-v2-production.sql', import.meta.url)), sql);
  console.log(JSON.stringify({ units: units.length, lexicalWords: vocabularyPreviewPacks.reduce((sum, unit) => sum + unit.words.length, 0), phrasalPacks: phrasalPreviewPacks.length, status: 'published', overwrites: false }));
} finally { await server.close(); }
