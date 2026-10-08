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
for (const script of ['setup-schema.mjs', 'seed-content.mjs', 'enrich-words.mjs', 'prepare-h1-assets.mjs']) {
  const r = spawnSync(process.execPath, [join(here, script)], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.error(`[memora] ${script} falló`); break; }
}
console.log('[memora] esquema y contenido al día');

// Directus ya está disponible mientras esta tarea continúa en segundo plano.
// Deja el catálogo listo antes de que el alumno encuentre una palabra sin conexión mental.
if (process.env.OPENROUTER_API_KEY && process.env.PREPARE_ALL_ASSOCIATIONS !== 'false') {
  console.log('[memora] preparando asociaciones de los días 1-30…');
  const r = spawnSync(process.execPath, [join(here, 'generate-mnemonics.mjs'), '1', '30'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) console.error('[memora] la preparación de asociaciones continuará en el próximo despliegue');
  else console.log('[memora] catálogo de asociaciones preparado');
}
