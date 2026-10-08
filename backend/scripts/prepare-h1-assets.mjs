// Prepara el audio oficial de H1 durante el despliegue. La ruta /speech es
// idempotente: si el archivo ya está en speech_cache_v2 no vuelve a sintetizarlo.
import { api } from './lib.mjs';

const assets = [
  { id: 'word-normal', text: 'borrow', rate: 0.88 },
  { id: 'word-slow', text: 'borrow', rate: 0.70 },
  { id: 'scene', text: 'A donkey borrows your phone to call its mother.', rate: 0.88 },
  { id: 'example', text: 'Can I borrow your charger for a minute?', rate: 0.88 },
  { id: 'chunks', text: 'Can I... borrow... your charger... for a minute?', rate: 0.70 },
];

for (const asset of assets) {
  const out = await api('POST', '/memora/speech', asset);
  if (!out?.available || !out?.file) throw new Error(`No se pudo preparar H1/${asset.id}`);
  console.log(`  H1/${asset.id}: ${out.cached ? 'cache' : 'generado'} · ${out.generation_ms ?? 0} ms`);
}
console.log('✓ H1: cinco audios preparados');
