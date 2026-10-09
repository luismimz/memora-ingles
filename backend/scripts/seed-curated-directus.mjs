// Catálogo pedagógico mínimo para el ciclo Discovery -> Challenge -> Sentence.
// Es idempotente: busca por `en`, actualiza si existe y crea si no existe.
// Uso: node scripts/seed-curated-directus.mjs
import { api } from './lib.mjs';

const curated = [
  {
    en: 'pull', es: 'tirar', pos: 'verb', kind: 'keyword', ipa: '/pʊl/',
    bridge_word: 'PULPO',
    scene_es: '🐙 TIRAS del freno de emergencia mientras un PULPO conduce el tren.',
    target_sentence_es: 'Tira del freno de emergencia antes de que choque el tren.',
    target_sentence_en: 'Pull the emergency brake before the train crashes!', distractor: 'push',
  },
  {
    en: 'push', es: 'empujar', pos: 'verb', kind: 'keyword', ipa: '/pʊʃ/',
    bridge_word: 'PUCHERO',
    scene_es: '🍲 EMPUJAS un botón verde y el PUCHERO despliega la aplicación en producción.',
    target_sentence_es: 'Pulsa el botón verde para desplegar en producción.',
    target_sentence_en: 'Push the green button to deploy to production.', distractor: 'pull',
  },
  {
    en: 'hold', es: 'sostener', pos: 'verb', kind: 'keyword', ipa: '/hoʊld/',
    bridge_word: 'JOLÍN',
    scene_es: '🖥️ Dices JOLÍN mientras SOSTIENES el servidor con una mano y el café con la otra.',
    target_sentence_es: 'Sostén mi café mientras arreglo este error crítico.',
    target_sentence_en: 'Hold my coffee while I fix this critical bug.', distractor: 'drop',
  },
  {
    en: 'hide', es: 'esconderse', pos: 'verb', kind: 'keyword', ipa: '/haɪd/',
    bridge_word: 'JAID',
    scene_es: '🦀👟 JAID, la jaiba ninja, se ESCONDE dentro de una zapatilla para desaparecer.',
    target_sentence_es: 'El cangrejo se esconde en mi zapato.',
    target_sentence_en: 'The crab hides in my shoe.', distractor: 'find',
  },
  {
    en: 'explain', es: 'explicar', pos: 'verb', kind: 'keyword', ipa: '/ɪkˈspleɪn/',
    bridge_word: 'EX-PLENO',
    scene_es: '🫏 Le EXPLICAS el presupuesto del PLENO a un BURRO muy sordo.',
    target_sentence_es: 'Explica el proyecto al cliente.',
    target_sentence_en: 'Explain the project to the client.', distractor: 'forget',
  },
  {
    en: 'cook', es: 'cocinar', pos: 'verb', kind: 'keyword', ipa: '/kʊk/',
    bridge_word: 'CUCO',
    scene_es: '🍝 Un CUCO cocina pasta a medianoche con gafas de sol de DJ.',
    target_sentence_es: 'Mi padre cocina pasta a medianoche.',
    target_sentence_en: 'My dad cooks pasta at midnight.', distractor: 'order',
  },
  {
    en: 'wash', es: 'lavar', pos: 'verb', kind: 'keyword', ipa: '/wɑːʃ/',
    bridge_word: '¡GUASH!',
    scene_es: '🐶 El perro hace «¡GUASH!» y LAVA mis calcetines con champú.',
    target_sentence_es: 'El perro lavó mis calcetines con champú.',
    target_sentence_en: 'The dog washed my socks with shampoo.', distractor: 'dry',
  },
  {
    en: 'write', es: 'escribir', pos: 'verb', kind: 'irregular', ipa: '/raɪt/', verb_family: 'i_a_u',
    irregular_forms: { v1: 'write', v2: 'wrote', v3: 'written' },
    irregular_examples: {
      v1: { en: 'I write bug reports after every release.', es: 'Escribo informes de errores después de cada lanzamiento.' },
      v2: { en: 'I wrote a bug report after the server crashed.', es: 'Escribí un informe de errores después de que el servidor fallara.' },
      v3: { en: 'I have written three bug reports today.', es: 'Hoy he escrito tres informes de errores.' },
    },
    bridge_word: 'RAIT',
    scene_es: '✍️ Escribes un informe y el RAIT de la oficina lo firma con tinta invisible.',
    target_sentence_es: 'Escribo informes de errores después de cada lanzamiento.',
    target_sentence_en: 'I write bug reports after every release.', distractor: 'erase',
  },
  {
    en: 'break', es: 'romper', pos: 'verb', kind: 'irregular', ipa: '/breɪk/', verb_family: 'e_oke_en',
    irregular_forms: { v1: 'break', v2: 'broke', v3: 'broken' },
    irregular_examples: {
      v1: { en: 'The robot can break the printer during karaoke.', es: 'El robot puede romper la impresora durante el karaoke.' },
      v2: { en: 'The robot broke the printer during karaoke.', es: 'El robot rompió la impresora durante el karaoke.' },
      v3: { en: 'The robot has broken the printer again.', es: 'El robot ha vuelto a romper la impresora.' },
    },
    bridge_word: 'BREAK-DANCE',
    scene_es: '🎤 Un robot hace BREAK-DANCE y rompe la impresora durante el karaoke.',
    target_sentence_es: 'El robot rompió la impresora durante el karaoke.',
    target_sentence_en: 'The robot broke the printer during karaoke.', distractor: 'fix',
  },
  {
    en: 'catch', es: 'atrapar', pos: 'verb', kind: 'irregular', ipa: '/kætʃ/', verb_family: 'a_aught_aught',
    irregular_forms: { v1: 'catch', v2: 'caught', v3: 'caught' },
    irregular_examples: {
      v1: { en: 'I catch the chicken before it steals my keys.', es: 'Atrapo a la gallina antes de que robe mis llaves.' },
      v2: { en: 'I caught the chicken stealing my keys.', es: 'Atrapé a la gallina robando mis llaves.' },
      v3: { en: 'I have caught the chicken at last.', es: 'Por fin he atrapado a la gallina.' },
    },
    bridge_word: 'CACHO',
    scene_es: '🐔 ATRAPAS un CACHO de gallina que corre con tus llaves en el pico.',
    target_sentence_es: 'Pillé a la gallina robando mis llaves.',
    target_sentence_en: 'I caught the chicken stealing my keys.', distractor: 'lose',
  },
  {
    en: 'buy', es: 'comprar', pos: 'verb', kind: 'irregular', ipa: '/baɪ/', verb_family: 'uy_ought_ought',
    irregular_forms: { v1: 'buy', v2: 'bought', v3: 'bought' },
    irregular_examples: {
      v1: { en: 'We buy fake servers with Monopoly money.', es: 'Compramos servidores falsos con dinero del Monopoly.' },
      v2: { en: 'She bought a server with fake money.', es: 'Ella compró un servidor con dinero falso.' },
      v3: { en: 'They have bought a ridiculous golden server.', es: 'Han comprado un servidor dorado ridículo.' },
    },
    bridge_word: 'BYE',
    scene_es: '💳 Dices «BYE» a tus billetes reales y COMPRAS un servidor con dinero de Monopoly.',
    target_sentence_es: 'Ella compró un servidor con dinero falso.',
    target_sentence_en: 'She bought a server with fake money.', distractor: 'sell',
  },
  {
    en: 'cut', es: 'cortar', pos: 'verb', kind: 'irregular', ipa: '/kʌt/', verb_family: 'ut_ut_ut',
    irregular_forms: { v1: 'cut', v2: 'cut', v3: 'cut' },
    irregular_examples: {
      v1: { en: 'Kat must cut the red wire before the bomb explodes.', es: 'Kat tiene que cortar el cable rojo antes de que explote la bomba.' },
      v2: { en: 'Kat cut the red wire before the alarm rang.', es: 'Kat cortó el cable rojo antes de que sonara la alarma.' },
      v3: { en: 'Kat has cut the red wire, so everyone is safe.', es: 'Kat ha cortado el cable rojo, así que todos están a salvo.' },
    },
    bridge_word: 'KAT',
    scene_es: '🐈💣 KAT, el gato, corta con sus garras el cable rojo justo antes del ¡BOOM!',
    target_sentence_es: 'Kat tiene que cortar el cable rojo antes de que explote la bomba.',
    target_sentence_en: 'Kat must cut the red wire before the bomb explodes.', distractor: 'connect',
  },
  {
    en: 'feel', es: 'sentir(se)', pos: 'verb', kind: 'irregular', ipa: '/fiːl/', verb_family: 'ee_to_e',
    irregular_forms: { v1: 'feel', v2: 'felt', v3: 'felt' },
    irregular_examples: {
      v1: { en: 'I feel tired after the long meeting.', es: 'Me siento cansado después de la reunión larga.', ipa: '/fiːl/', bridge_word: 'FIEL', scene_es: '🐕❤️ Tu perro FIEL SIENTE tu tristeza y te entrega un corazón gigante.' },
      v2: { en: 'I felt better after my faithful dog arrived.', es: 'Me sentí mejor después de que llegara mi perro fiel.', ipa: '/fɛlt/', bridge_word: 'FIELTRO', scene_es: '🐕❤️ Un corazón de FIELTRO se pegó a tu perro cuando sintió tu tristeza.' },
      v3: { en: 'I have felt happier since Kat joined us.', es: 'Me he sentido más feliz desde que Kat se unió.', ipa: '/fɛlt/', bridge_word: 'FIELTRO', scene_es: '🐕❤️ El corazón de FIELTRO ha sentido tu tristeza y sigue pegado.' },
    },
    bridge_word: 'FIEL',
    scene_es: '🐕❤️ Tu perro FIEL SIENTE tu tristeza y te entrega un corazón gigante.',
    target_sentence_es: 'Me siento cansado después de la reunión larga.',
    target_sentence_en: 'I feel tired after the long meeting.', distractor: 'forget',
  },
  {
    en: 'set', es: 'poner / ajustar', pos: 'verb', kind: 'irregular', ipa: '/set/', verb_family: 'et_et_et',
    irregular_forms: { v1: 'set', v2: 'set', v3: 'set' },
    irregular_examples: {
      v1: { en: 'Set the timer before the cookies burn.', es: 'Ajusta el temporizador antes de que se quemen las galletas.' },
      v2: { en: 'I set the timer before dinner.', es: 'Ajusté el temporizador antes de cenar.' },
      v3: { en: 'I have set the timer already.', es: 'Ya he ajustado el temporizador.' },
    },
    bridge_word: 'SET',
    scene_es: '⏱️ Ajustas el SET del temporizador antes de que las galletas se quemen.',
    target_sentence_es: 'Ajusta el temporizador antes de que se quemen las galletas.',
    target_sentence_en: 'Set the timer before the cookies burn.', distractor: 'cancel',
  },
];

function sceneEmoji(scene) {
  const firstToken = String(scene).trim().split(/\s+/, 1)[0] || '';
  if (/^\p{Extended_Pictographic}/u.test(firstToken)) return firstToken;
  return String(scene).match(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u)?.[0] ?? '🧠';
}

const rows = await api('GET', '/items/words?limit=-1&fields=id,en,rank');
const existing = new Map(rows.map((row) => [String(row.en).trim().toLowerCase(), row]));
let nextRank = Math.max(10000, ...rows.map((row) => Number(row.rank) || 0)) + 1;
let created = 0;
let updated = 0;

for (const entry of curated) {
  const payload = {
    ...entry,
    status: 'published',
    topic: entry.kind === 'irregular' ? 'Irregular verbs · Memora' : 'Daily actions · Memora',
    rank: existing.get(entry.en)?.rank ?? nextRank++,
    day: existing.get(entry.en)?.day ?? 1,
    example_en: entry.target_sentence_en,
    example_es: entry.target_sentence_es,
    hint_es: entry.bridge_word,
    examples: [{ en: entry.target_sentence_en, es: entry.target_sentence_es, source: 'directus-curated' }],
  };
  const found = existing.get(entry.en);
  if (found) {
    await api('PATCH', `/items/words/${found.id}`, payload);
    const mnemonics = await api('GET', `/items/mnemonics?filter[word][_eq]=${found.id}&filter[owner][_null]=true&filter[source][_eq]=seed&limit=1`);
    const mnemonic = { word: found.id, owner: null, source: 'seed', keyword: entry.bridge_word, scene_es: entry.scene_es, story_en: entry.target_sentence_en, emoji: sceneEmoji(entry.scene_es), ...(entry.en === 'hide' ? { image: null } : {}) };
    if (mnemonics[0]) await api('PATCH', `/items/mnemonics/${mnemonics[0].id}`, mnemonic);
    else await api('POST', '/items/mnemonics', mnemonic);
    updated += 1;
    console.log(`↻ ${entry.en} actualizado · publicado · frase ${entry.target_sentence_en}`);
  } else {
    const [createdRow] = await api('POST', '/items/words', [payload]);
    existing.set(entry.en, createdRow);
    await api('POST', '/items/mnemonics', [{ word: createdRow.id, owner: null, source: 'seed', keyword: entry.bridge_word, scene_es: entry.scene_es, story_en: entry.target_sentence_en, emoji: sceneEmoji(entry.scene_es), ...(entry.en === 'hide' ? { image: null } : {}) }]);
    created += 1;
    console.log(`+ ${entry.en} creado · publicado · frase ${entry.target_sentence_en}`);
  }
}

console.log(`✓ Catálogo curado listo: ${created} creadas, ${updated} actualizadas, ${curated.length} totales.`);
