#!/usr/bin/env node
// Enriquece vocabulario profesional de DAM/DAW y 3D con OpenRouter y lo
// guarda de forma idempotente en Directus. Uso: npm run ingest-tech
import { api } from './lib.mjs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1';
const allowedDomains = ['dam_web', '3d_games'];

const TERMS = [
  ['Native App', 'dam_web'],
  ['Cross-Platform App', 'dam_web'],
  ['Agile Development', 'dam_web'],
  ['Scrum', 'dam_web'],
  ['Waterfall Model', 'dam_web'],
  ['Kanban', 'dam_web'],
  ['Prototyping', 'dam_web'],
  ['User Interface (UI)', 'dam_web'],
  ['User Experience (UX)', 'dam_web'],
  ['REST API', 'dam_web'],
  ['Responsive Design', 'dam_web'],
  ['Continuous Integration', 'dam_web'],
  ['Object-Oriented Programming', 'dam_web'],
  ['Mesh', '3d_games'],
  ['Displacement Mapping', '3d_games'],
  ['Rigging', '3d_games'],
  ['Keyframe', '3d_games'],
  ['Texture Mapping', '3d_games'],
  ['Lighting', '3d_games'],
  ['Animation Loop', '3d_games'],
];

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('Falta OPENROUTER_API_KEY. Añádela en backend/.env antes de ejecutar la ingesta.');
}

function parseJson(content) {
  const cleaned = String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('OpenRouter no devolvió JSON válido.');
  }
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normaliseResult(raw, term, domain) {
  const domains = Array.isArray(raw.domains)
    ? raw.domains.filter((item) => allowedDomains.includes(item))
    : [];
  return {
    term,
    translation_es: text(raw.translation_es, term),
    definition_en: text(raw.definition_en, `A professional concept used in ${domain === '3d_games' ? '3D production' : 'software development'}.`),
    mnemonic_keyword: text(raw.mnemonic_keyword, term.split(/\s+/)[0]),
    mnemonic_scene_es: text(raw.mnemonic_scene_es, `Un equipo de desarrollo usa ${term} y todo acaba sorprendentemente bien.`),
    example_en: text(raw.example_en, `The team used ${term} to ship the project on time.`),
    example_es: text(raw.example_es, `El equipo usó ${term} para entregar el proyecto a tiempo.`),
    cefr_level: raw.cefr_level === 'C1' ? 'C1' : 'B2',
    domains: domains.length ? domains : [domain],
  };
}

async function enrichTerm(term, domain) {
  const prompt = [
    'Eres un profesor técnico bilingüe especializado en DAM/DAW y producción 3D.',
    'Devuelve SOLO un objeto JSON válido, sin Markdown ni comentarios, con estas claves exactas:',
    'translation_es, definition_en, mnemonic_keyword, mnemonic_scene_es, example_en, example_es, cefr_level, domains.',
    `Término: ${term}. Dominio permitido: ${domain}.`,
    'La traducción debe ser precisa para un alumno hispanohablante.',
    'mnemonic_keyword debe ser un puente sonoro breve (máximo 4 palabras) y mnemonic_scene_es una escena absurda, graciosa y corta relacionada con programadores, servidores, videojuegos o artistas 3D.',
    'example_en debe ser una frase natural y útil en un equipo real de desarrollo o producción; example_es debe traducirla exactamente.',
    'cefr_level solo puede ser B2 o C1 y domains debe contener únicamente el dominio indicado.',
  ].join('\n');
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'http-referer': process.env.APP_URL || 'http://localhost:5173',
      'x-title': 'Memora technical vocabulary ingest',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.65,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Responde únicamente JSON estricto.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(body?.error || body)}`);
  const content = body?.choices?.[0]?.message?.content;
  return normaliseResult(parseJson(content), term, domain);
}

async function upsertTerm(result, rank) {
  const filter = encodeURIComponent(result.term);
  const found = await api('GET', `/items/words?filter[en][_eq]=${filter}&limit=1&fields=id,en`);
  const word = {
    en: result.term,
    es: result.translation_es,
    pos: 'technical term',
    topic: result.domains.includes('3d_games') ? '3D y videojuegos' : 'DAM/DAW · desarrollo web',
    kind: 'keyword',
    rank,
    day: 31,
    definition_en: result.definition_en,
    cefr_level: result.cefr_level,
    domains: result.domains,
    status: 'published',
    hint_es: result.mnemonic_keyword,
    example_en: result.example_en,
    example_es: result.example_es,
    examples: [{ en: result.example_en, es: result.example_es, source: 'openrouter-tech' }],
  };
  let wordId;
  if (found[0]) {
    wordId = found[0].id;
    await api('PATCH', `/items/words/${wordId}`, word);
  } else {
    const made = await api('POST', '/items/words', [word]);
    wordId = made[0]?.id ?? made.id;
  }

  // La mnemotecnia entra también en la colección que consume /descubrir.
  const mnemonics = await api('GET', `/items/mnemonics?filter[word][_eq]=${wordId}&filter[owner][_null]=true&filter[source][_eq]=ai&limit=1`);
  const mnemonic = { word: wordId, owner: null, source: 'ai', keyword: result.mnemonic_keyword, scene_es: result.mnemonic_scene_es, story_en: result.example_en, emoji: result.domains.includes('3d_games') ? '🎮' : '💻' };
  if (mnemonics[0]) await api('PATCH', `/items/mnemonics/${mnemonics[0].id}`, mnemonic);
  else await api('POST', '/items/mnemonics', mnemonic);
  return wordId;
}

for (const [index, [term, domain]] of TERMS.entries()) {
  try {
    console.log(`\n[${index + 1}/${TERMS.length}] ${term} · ${domain} · enriqueciendo con ${MODEL}`);
    const result = await enrichTerm(term, domain);
    const wordId = await upsertTerm(result, 50000 + index);
    console.log(`  ✓ ${result.translation_es} · ${result.cefr_level} · Directus words#${wordId} · publicada`);
  } catch (error) {
    console.error(`  ✗ ${term}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('\n✓ Ingesta técnica terminada. Las palabras y sus asociaciones están listas para el mazo de Memora.');
