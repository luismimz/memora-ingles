// Se ejecuta en segundo plano al arrancar el contenedor: espera a Directus y aplica esquema + contenido.
// Ambos scripts son idempotentes, así que es seguro correrlos en cada despliegue.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.DIRECTUS_URL || 'http://localhost:8055';

for (let i = 0; i < 120; i++) {
  try { if ((await fetch(`${url}/server/health`)).ok) break; } catch { /* aún arrancando */ }
  await new Promise((r) => setTimeout(r, 2000));
}
for (const script of ['setup-schema.mjs', 'seed-content.mjs', 'enrich-words.mjs']) {
  const r = spawnSync(process.execPath, [join(here, script)], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.error(`[memora] ${script} falló`); break; }
}
console.log('[memora] esquema y contenido al día');
