// Pregenera con IA las asociaciones de los días aún no curados (usa el endpoint /memora/fill).
// Uso: node scripts/generate-mnemonics.mjs 4 10     -> días 4 a 10
// Requiere OPENROUTER_API_KEY en el servidor. Las asociaciones quedan compartidas (owner = null)
// y puedes revisarlas/editarlas en el panel de Directus (colección "mnemonics").
import { api } from './lib.mjs';
import { isConciseMnemonic } from '../../shared/mnemonicQuality.mjs';

const from = Number(process.argv[2] || 4);
const to = Number(process.argv[3] || from);
const words = await api('GET', `/items/words?limit=-1&fields=id,en,day,kind&filter[day][_between]=${from},${to}&sort=rank`);
const have = new Set((await api('GET', '/items/mnemonics?limit=-1&fields=word,source,scene_es,story_en&filter[owner][_null]=true'))
  .filter((m) => isConciseMnemonic(m)).map((m) => m.word));
// Cognados, compuestas, chunks y phrasal verbs ya tienen una conexión determinista en hint_es.
// La escena absurda se prepara para todas las palabras que sí necesitan palabra puente.
const todo = words.filter((w) => (!w.kind || w.kind === 'keyword' || w.kind === 'irregular') && !have.has(w.id));
console.log(`Días ${from}-${to}: ${words.length} palabras · ${todo.length} escenas absurdas pendientes`);

for (let i = 0; i < todo.length; i += 10) {
  const chunk = todo.slice(i, i + 10);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { filled } = await api('POST', '/memora/fill', { words: chunk.map((w) => w.id) });
      console.log(`  ${i + chunk.length}/${todo.length} (+${filled}) ${chunk.map((w) => w.en).join(', ')}`);
      break;
    } catch (e) {
      console.warn(`  reintento ${attempt}: ${e.message}`);
      if (attempt === 3) console.warn('  saltando este lote');
    }
  }
}
console.log('✓ Hecho');
