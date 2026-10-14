// V2 startup only checks readiness. Schema/content changes are explicit reviewed jobs.
import { api } from './lib.mjs';
const url = process.env.DIRECTUS_URL || 'http://localhost:8055';
let healthy = false;
for (let index = 0; index < 120; index++) {
  try { if ((await fetch(`${url}/server/health`)).ok) { healthy = true; break; } } catch { /* Waiting for Directus. */ }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!healthy) throw new Error('Directus no está listo. No se ejecutó ninguna migración ni preparación de contenido.');
for (const collection of ['learning_units', 'learning_events']) {
  const result = await api('GET', `/collections/${collection}`, undefined, { allowFail: true });
  if (result.error) console.error(`[memora] Falta ${collection}. Revisa el esquema antes de habilitar alumnos; el arranque no lo modifica.`);
}
console.log('[memora] V2 lista. Arranque sin semillas, migraciones ni generación automática.');
