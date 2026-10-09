#!/usr/bin/env node
// Enriquece palabras sin contenido de Misión usando OpenRouter y las publica
// solo cuando pasan las reglas pedagógicas de Memora. Se ejecuta por lotes
// para poder revisar el catálogo y controlar el coste:
//   OPENROUTER_API_KEY=... node scripts/enrich-discovery-directus.mjs --limit=10
import { api, login, URL_BASE } from './lib.mjs';
import { englishPhones, scoreKeyword, WEAK } from '../../shared/phonetics.mjs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/flux/schnell';
const FAL_QUEUE_URL = `https://queue.fal.run/${FAL_MODEL}`;
const IMAGE_DELAY_MS = 1_500;

function numericFlag(name, fallback) {
  const value = Number(process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] || fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const LIMIT = numericFlag('limit', 10);
const BATCH = numericFlag('batch', LIMIT);
const modeFlag = (name, envName, fallback) => {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] || process.env[envName] || fallback;
  return String(raw).toLowerCase() === 'manual' ? 'manual' : 'auto';
};
const TEXT_MODE = modeFlag('text-mode', 'DISCOVERY_TEXT_MODE', 'auto');
const IMAGE_MODE = modeFlag('image-mode', 'DISCOVERY_IMAGE_MODE', 'auto');

if (TEXT_MODE === 'auto' && !process.env.OPENROUTER_API_KEY) {
  throw new Error('Falta OPENROUTER_API_KEY. Añádela en backend/.env antes de enriquecer el catálogo.');
}

const words = await api('GET', '/items/words?limit=-1&fields=id,rank,en,es,pos,kind,ipa,arpabet,irregular_forms,example_en,example_es,status,bridge_word,scene_es,target_sentence_en,target_sentence_es,distractor');
const allMnemonics = await api('GET', '/items/mnemonics?limit=-1&fields=id,word,owner,source,image,keyword,scene_es,story_en,emoji');
const pendingStatus = (status) => ['', 'draft', 'pending', 'review'].includes(String(status ?? '').trim().toLowerCase());
// Nunca se sobrescribe una palabra publicada y completa. Las publicadas solo
// entran si les falta algún campo obligatorio de la misión o una imagen.
const needsContent = (word) => pendingStatus(word.status)
  || !word.bridge_word || !word.scene_es || !word.target_sentence_en || !word.target_sentence_es || !word.distractor;
const fileId = (image) => typeof image === 'string' ? image : image?.id || null;
const mnemonicForWord = new Map();
for (const mnemonic of allMnemonics) {
  const current = mnemonicForWord.get(mnemonic.word) || [];
  current.push(mnemonic);
  mnemonicForWord.set(mnemonic.word, current);
}
const imageForWord = new Map();
for (const [wordId, mnemonics] of mnemonicForWord) {
  const withImage = mnemonics.find((mnemonic) => fileId(mnemonic.image));
  if (withImage) imageForWord.set(wordId, fileId(withImage.image));
}
const needsImage = (word) => !imageForWord.has(word.id);
const pending = words
  .filter((word) => (TEXT_MODE === 'auto' && needsContent(word))
    || (IMAGE_MODE === 'auto' && needsImage(word) && !needsContent(word)))
  .sort((a, b) => (Number(a.rank) || a.id) - (Number(b.rank) || b.id))
  .slice(0, LIMIT);

if (pending.length && IMAGE_MODE === 'auto' && !process.env.FAL_KEY) {
  throw new Error('Falta FAL_KEY. Añádela en backend/.env para generar las imágenes con fal.ai.');
}

const tokenise = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]+(?:'[a-z]+)?/g) || [];
const count = (value) => tokenise(value).length;
const normalise = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const elapsed = (startedAt) => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
const slug = (value) => normalise(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'word';
const IMAGE_STYLE = '3D claymation Pixar-style character, vibrant saturated colors, soft cinematic studio lighting, minimalist clean solid background, high detail, funny expression';

function isRetryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function requestJsonWithRetry(url, options, label) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
      if (!response.ok) {
        const error = new Error(`${label} ${response.status}: ${JSON.stringify(body?.error || body)}`);
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      lastError = error;
      const retryable = isRetryableStatus(error?.status) || error?.name === 'TypeError' || error?.code === 'UND_ERR_CONNECT_TIMEOUT';
      if (!retryable || attempt === 2) throw error;
      const wait = 1_000 * (2 ** attempt);
      console.warn(`  ↻ ${label}: reintento ${attempt + 1}/3 en ${wait} ms`);
      await sleep(wait);
    }
  }
  throw lastError;
}

function sourceVariants(value) {
  const base = tokenise(value).join(' ');
  if (!base || base.includes(' ') || base.length < 3) return [base].filter(Boolean);
  const variants = [base, `${base}s`, `${base}es`, `${base}ed`, `${base}ing`, `${base}'s`];
  if (base.endsWith('y')) variants.push(`${base.slice(0, -1)}ies`, `${base.slice(0, -1)}ied`, `${base.slice(0, -1)}ying`);
  if (base.endsWith('e')) variants.push(`${base}d`, `${base.slice(0, -1)}ing`);
  const last = base.at(-1) ?? '';
  const previous = base.at(-2) ?? '';
  const beforePrevious = base.at(-3) ?? '';
  if (last && previous && beforePrevious && /[^aeiou]/.test(last) && /[aeiou]/.test(previous) && /[^aeiou]/.test(beforePrevious) && !/[wxy]/.test(last)) {
    variants.push(`${base}${last}ed`, `${base}${last}ing`);
  }
  const irregular = { tooth: 'teeth', foot: 'feet', mouse: 'mice', child: 'children', person: 'people', man: 'men', woman: 'women', goose: 'geese' };
  if (irregular[base]) variants.push(irregular[base]);
  return variants;
}

function sentenceUsesSource(sentence, word) {
  const sentenceTokens = tokenise(sentence);
  return [word.en, ...Object.values(word.irregular_forms || {})]
    .flatMap(sourceVariants)
    .some((form) => {
      const formTokens = form.split(/\s+/).filter(Boolean);
      return formTokens.length > 0 && sentenceTokens.some((_, index) => formTokens.every((token, offset) => sentenceTokens[index + offset] === token));
    });
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

function validate(raw, word) {
  const bridge = normalise(raw.bridge_word).toUpperCase();
  const scene = normalise(raw.scene_es);
  const sentenceEn = normalise(raw.target_sentence_en);
  const sentenceEs = normalise(raw.target_sentence_es);
  const distractor = normalise(raw.distractor);
  const imagePrompt = normalise(raw.image_prompt);
  const sentenceTokens = tokenise(sentenceEn);
  const sourceInSentence = sentenceUsesSource(sentenceEn, word);
  const forbidden = /^(?:you|i)\s+[a-z]+[.!?]?$/i.test(sentenceEn)
    || /\b(i remember the word|i do not know this word)\b/i.test(sentenceEn);
  const sceneHasPhysicalAction = /\b(derram\w*|tropez\w*|explot\w*|romp\w*|quem\w*|salt\w*|corr\w*|cae\w*|lanz\w*|arroj\w*|persigu\w*|atrap\w*|pate\w*|golpe\w*|escap\w*|bail\w*|grit\w*|chispe\w*|volc\w*|derrit\w*|aplast\w*|muerd\w*|dispar\w*|sacud\w*|escond\w*|arrastr\w*|cort\w*|cocin\w*|lav\w*|empuj\w*|tir\w*|sost\w*|abr\w*|cierr\w*|llen\w*|vaci\w*|trep\w*|hu\w*|cav\w*|met\w*|sac\w*|colg\w*|enciend\w*|apag\w*)\b/i.test(scene);
  const blandScene = /\b(siente\w*\s+(?:amor|tristeza|miedo)|est[aá]\s+triste|perro\s+(?:fiel|leal)|solo\s+sonr[ií]e|es\s+un\s+perro\s+fiel)\b/i.test(scene);
  const emojiCount = [...String(raw.emoji || '').matchAll(/\p{Extended_Pictographic}/gu)].length;
  const issues = [];
  if (!bridge || count(bridge) > 4) issues.push('puente vacío o largo');
  if (!scene || count(scene) < 5 || count(scene) > 18) issues.push('escena fuera de 5-18 palabras');
  if (bridge && !scene.toUpperCase().includes(bridge)) issues.push('la escena no contiene el puente');
  if (!sentenceEs || count(sentenceEs) < 5 || count(sentenceEs) > 22) issues.push('traducción incompleta');
  if (!sentenceEn || count(sentenceEn) < 6 || count(sentenceEn) > 14) issues.push('frase inglesa fuera de 6-14 palabras');
  if (!sourceInSentence) issues.push('la frase no usa la palabra ni una forma verbal');
  if (forbidden) issues.push('plantilla dummy');
  if (!sceneHasPhysicalAction) issues.push('la escena no contiene una acción física');
  if (blandScene) issues.push('escena pasiva o sentimental');
  if (!distractor || !/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(distractor) || distractor.toLowerCase() === word.en.toLowerCase() || sentenceTokens.includes(distractor.toLowerCase())) issues.push('distractor inválido o no es una ficha única');
  if (emojiCount < 1 || emojiCount > 2) issues.push('emoji: se requieren 1-2 emojis temáticos');
  if (!imagePrompt || !/^3d claymation pixar-style character/i.test(imagePrompt) || !/vibrant saturated colors/i.test(imagePrompt) || !/soft cinematic studio lighting/i.test(imagePrompt) || !/minimalist clean solid background/i.test(imagePrompt) || !/funny expression/i.test(imagePrompt) || !/depicting\s+/i.test(imagePrompt)) issues.push('image_prompt no cumple el estilo FLUX requerido');
  const phones = englishPhones(word);
  if (!phones.length) issues.push('la palabra no tiene IPA/ARPAbet para validar el puente');
  else if (scoreKeyword(phones, bridge).score < WEAK) issues.push('puente con relación fonética débil según IPA');
  if (issues.length) throw new Error(issues.join(', '));
  return {
    bridge_word: bridge,
    scene_es: scene,
    target_sentence_es: sentenceEs,
    target_sentence_en: sentenceEn,
    distractor,
    emoji: String(raw.emoji).trim(),
    image_prompt: imagePrompt,
  };
}

async function generate(word, attempt = 0) {
  const grammaticalCategory = /verb|^v$|phrasal|irregular/i.test(String(word.pos || word.kind || ''))
    ? 'verbo'
    : /noun|^n$/i.test(String(word.pos || '')) ? 'sustantivo'
      : /adj/i.test(String(word.pos || '')) ? 'adjetivo' : 'la misma categoría gramatical que la palabra';
  const prompt = [
    'Eres el diseñador pedagógico principal de Memora. Crea una sola asociación para un hispanohablante y cumple todas las reglas sin excepciones.',
    'REGLA 1 · HUMOR Y ACCIÓN FÍSICA: scene_es debe ser corta, concreta, absurda y visual. Debe mostrar una acción física exagerada o surrealista (derramar, tropezar, explotar, romper, quemar, saltar, perseguir, cortar, esconderse, etc.). Quedan prohibidas escenas pasivas, sentimentales o sosas como «siente amor», «está triste» o «un perro fiel».',
    'REGLA 2 · PUENTE FONÉTICO: bridge_word debe sonar a la pronunciación real indicada por IPA/ARPAbet, no a la ortografía inglesa. Usa una palabra o nombre español reconocible; no inventes una traducción ni una explicación. Escribe el puente en MAYÚSCULAS.',
    'REGLA 3 · FRASE BILINGÜE: target_sentence_en debe tener 6-14 palabras, sujeto, verbo y contexto real; debe usar la palabra o una flexión válida. Prohibidas plantillas como «You WORD.» o «I remember the word WORD». target_sentence_es debe traducirla completa, con naturalidad y precisión.',
    `REGLA 4 · DISTRACTOR: distractor debe ser una sola palabra inglesa real, distinta de la respuesta, que no aparezca en la frase y pertenezca a la categoría ${grammaticalCategory}. Debe ser creíble en el constructor, no una partícula aleatoria.`,
    'REGLA 5 · EMOJIS: emoji debe contener exactamente uno o dos emojis que representen directamente los objetos físicos clave de scene_es; no uses emojis decorativos.',
    `REGLA 6 · IMAGEN: image_prompt debe ser un prompt visual en inglés que empiece por exactamente «${IMAGE_STYLE}» y termine describiendo la acción física de scene_es. No incluyas texto, letras, logos ni marcas dentro de la imagen.`,
    'Devuelve SOLO un objeto JSON estricto, sin Markdown ni comentarios, con exactamente estas claves: bridge_word, scene_es, target_sentence_es, target_sentence_en, distractor, emoji, image_prompt.',
    `Palabra: ${word.en}. Significado: ${word.es}. Categoría: ${word.pos || word.kind || 'general'}. IPA: ${word.ipa || 'desconocida'}. ARPAbet: ${word.arpabet || 'desconocido'}.`,
    'scene_es: 5-18 palabras, incluye literalmente bridge_word en MAYÚSCULAS y conecta puente, acción física y significado en una sola imagen.',
    attempt ? 'Corrige los errores del intento anterior y entrega una asociación más corta y visual.' : '',
  ].filter(Boolean).join('\n');
  const body = await requestJsonWithRetry(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'http-referer': process.env.APP_URL || 'http://localhost:5173',
      'x-title': 'Memora discovery content enrichment',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.55,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Responde únicamente un objeto JSON válido con exactamente las claves bridge_word, scene_es, target_sentence_es, target_sentence_en, distractor, emoji e image_prompt. Cumple las seis reglas pedagógicas del mensaje del usuario. No añadas Markdown, explicaciones, claves adicionales ni texto fuera del JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  }, 'OpenRouter');
  const result = validate(parseJson(body?.choices?.[0]?.message?.content), word);
  return result;
}

async function falImage(prompt) {
  const submitted = await requestJsonWithRetry(FAL_QUEUE_URL, {
    method: 'POST',
    headers: { authorization: `Key ${process.env.FAL_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: 'square_hd',
      num_inference_steps: 4,
      enable_safety_checker: true,
    }),
  }, 'fal.ai submit');

  // fal.ai devuelve una respuesta inmediata en algunos despliegues y una
  // referencia de cola en otros. Soportamos ambas formas para que el job sea
  // estable en local y en Coolify.
  const immediate = extractImageUrl(submitted);
  if (immediate) return immediate;
  const statusUrl = submitted.status_url;
  const responseUrl = submitted.response_url;
  if (!statusUrl || !responseUrl) throw new Error(`fal.ai no devolvió URLs de cola: ${JSON.stringify(submitted)}`);

  for (let poll = 0; poll < 60; poll++) {
    const status = await requestJsonWithRetry(statusUrl, {
      headers: { authorization: `Key ${process.env.FAL_KEY}` },
    }, 'fal.ai status');
    const state = String(status.status || '').toUpperCase();
    if (state === 'COMPLETED') {
      const output = await requestJsonWithRetry(responseUrl, {
        headers: { authorization: `Key ${process.env.FAL_KEY}` },
      }, 'fal.ai result');
      const image = extractImageUrl(output);
      if (!image) throw new Error(`fal.ai terminó sin imagen: ${JSON.stringify(output)}`);
      return image;
    }
    if (state === 'FAILED' || state === 'ERROR') throw new Error(`fal.ai ${state}: ${JSON.stringify(status)}`);
    await sleep(1_000);
  }
  throw new Error('fal.ai agotó el tiempo de espera de 60 segundos.');
}

function existingContentResult(word) {
  const mnemonic = (mnemonicForWord.get(word.id) || []).find((item) => item.source === 'ai' && !item.owner)
    || (mnemonicForWord.get(word.id) || []).find((item) => !item.owner);
  return {
    bridge_word: word.bridge_word || mnemonic?.keyword || 'MEMORA',
    scene_es: word.scene_es || mnemonic?.scene_es || `Una escena física y divertida representa ${word.en}.`,
    target_sentence_es: word.target_sentence_es || word.example_es || `Usamos ${word.en} en una situación real.`,
    target_sentence_en: word.target_sentence_en || word.example_en || `We use ${word.en} in a real situation today.`,
    distractor: word.distractor || 'notice',
    emoji: mnemonic?.emoji || '🎬',
    image_prompt: `${IMAGE_STYLE}, depicting ${word.scene_es || mnemonic?.scene_es || `a funny physical action representing ${word.en}`}`,
  };
}

function extractImageUrl(payload) {
  return payload?.images?.[0]?.url
    || payload?.data?.images?.[0]?.url
    || payload?.output?.images?.[0]?.url
    || payload?.image?.url
    || payload?.data?.image?.url
    || null;
}

async function downloadImage(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`Descarga de imagen ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return { buffer: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') || 'image/png' };
    } catch (error) {
      if (!isRetryableStatus(error?.status) && error?.name !== 'TypeError' || attempt === 2) throw error;
      const wait = 1_000 * (2 ** attempt);
      console.warn(`  ↻ descarga de imagen: reintento ${attempt + 1}/3 en ${wait} ms`);
      await sleep(wait);
    }
  }
}

async function uploadDirectusImage(buffer, contentType, word) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await login();
      const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
      const filename = `memora-${slug(word.en)}-${word.id}.${extension}`;
      const existing = await api('GET', `/files?filter[filename_download][_eq]=${encodeURIComponent(filename)}&limit=1`);
      if (existing?.[0]?.id) return existing[0];
      const form = new FormData();
      form.append('title', `Memora · ${word.en}`);
      form.append('filename_download', filename);
      form.append('file', new Blob([buffer], { type: contentType }), filename);
      const response = await fetch(`${URL_BASE}/files`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const text = await response.text();
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
      if (!response.ok) {
        const error = new Error(`Directus /files ${response.status}: ${JSON.stringify(body?.errors || body)}`);
        error.status = response.status;
        throw error;
      }
      const file = body.data || body;
      if (!file?.id) throw new Error(`Directus no devolvió el id del archivo: ${JSON.stringify(body)}`);
      return file;
    } catch (error) {
      if (!isRetryableStatus(error?.status) && error?.name !== 'TypeError' || attempt === 2) throw error;
      const wait = 1_000 * (2 ** attempt);
      console.warn(`  ↻ Directus /files: reintento ${attempt + 1}/3 en ${wait} ms`);
      await sleep(wait);
    }
  }
}

async function generateAndStoreImage(word, result) {
  if (IMAGE_MODE !== 'auto') return { id: imageForWord.get(word.id) || null, status: 'manual' };
  const existingImage = imageForWord.get(word.id);
  if (existingImage) return { id: existingImage, status: 'reutilizada' };
  const imageUrl = await falImage(result.image_prompt);
  const downloaded = await downloadImage(imageUrl);
  const file = await uploadDirectusImage(downloaded.buffer, downloaded.contentType, word);
  imageForWord.set(word.id, file.id);
  return { id: file.id, status: 'generada' };
}

async function save(word, result, { writeContent }) {
  if (writeContent) {
    await api('PATCH', `/items/words/${word.id}`, {
      bridge_word: result.bridge_word,
      scene_es: result.scene_es,
      target_sentence_es: result.target_sentence_es,
      target_sentence_en: result.target_sentence_en,
      distractor: result.distractor,
      example_en: result.target_sentence_en,
      example_es: result.target_sentence_es,
      hint_es: result.bridge_word,
      status: 'published',
      examples: [{ en: result.target_sentence_en, es: result.target_sentence_es, source: 'openrouter-discovery' }],
    });
  }
  const list = mnemonicForWord.get(word.id) || [];
  // Las asociaciones seed son contenido curado y no se sobrescriben. Si ya
  // existe una AI se actualiza; si no, se crea una fila AI independiente.
  const found = list.find((mnemonic) => mnemonic.source === 'ai' && !mnemonic.owner);
  const imageId = imageForWord.get(word.id) || null;
  const mnemonicPayload = {
    word: word.id,
    owner: null,
    source: 'ai',
    keyword: writeContent ? result.bridge_word : (found?.keyword || word.bridge_word),
    scene_es: writeContent ? result.scene_es : (found?.scene_es || word.scene_es),
    story_en: writeContent ? result.target_sentence_en : (found?.story_en || word.target_sentence_en),
    emoji: writeContent ? result.emoji : (found?.emoji || '🧠'),
    ...(imageId ? { image: imageId } : {}),
  };
  let mnemonic;
  if (found) {
    mnemonic = await api('PATCH', `/items/mnemonics/${found.id}`, mnemonicPayload);
  } else {
    mnemonic = await api('POST', '/items/mnemonics', mnemonicPayload);
  }
  return { mnemonicId: mnemonic.id, imageId };
}

console.log(`Catálogo pendiente: ${pending.length} palabras · texto ${TEXT_MODE} · imágenes ${IMAGE_MODE} · modelo ${MODEL} · ${FAL_MODEL} · lote ${BATCH}`);
let saved = 0;
const generated = [];
const runStartedAt = Date.now();
for (let offset = 0; offset < pending.length; offset += BATCH) {
  const batch = pending.slice(offset, offset + BATCH);
  console.log(`\nLote ${Math.floor(offset / BATCH) + 1}/${Math.ceil(pending.length / BATCH)} · ${batch.length} palabras`);
  for (const [batchIndex, word] of batch.entries()) {
    const index = offset + batchIndex;
    if (index > 0) await sleep(IMAGE_DELAY_MS);
    const startedAt = Date.now();
    const writeContent = TEXT_MODE === 'auto' && needsContent(word);
    let result = null;
    let lastError = null;
    let textStatus = writeContent ? 'pendiente' : 'reutilizado';
    let imageStatus = needsImage(word) ? 'pendiente' : 'reutilizada';
    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      try { result = writeContent ? await generate(word, attempt) : existingContentResult(word); }
      catch (error) { lastError = error; }
    }
    if (!result) {
      console.error(`✗ [${index + 1}/${pending.length}] ${word.en} · texto:error · imagen:omitida · ${lastError instanceof Error ? lastError.message : String(lastError)} · ${elapsed(startedAt)}`);
      continue;
    }
    let stored = false;
    let lastStorageError = null;
    for (let attempt = 0; attempt < 3 && !stored; attempt++) {
      try {
        const image = await generateAndStoreImage(word, result);
        imageStatus = image.status;
        await save(word, result, { writeContent });
        textStatus = writeContent ? 'publicado' : 'reutilizado';
        saved++;
        generated.push({ word, result, imageId: image.id });
        stored = true;
        console.log(`✓ [${index + 1}/${pending.length}] ${word.en} · texto:${textStatus} · imagen:${imageStatus} · ${elapsed(startedAt)}`);
      } catch (error) {
        lastStorageError = error;
        const retryable = isRetryableStatus(error?.status) || error?.name === 'TypeError';
        if (!retryable || attempt === 2) break;
        const wait = 1_000 * (2 ** attempt);
        console.warn(`  ↻ ${word.en}: reintento de almacenamiento ${attempt + 1}/3 en ${wait} ms`);
        await sleep(wait);
      }
    }
    if (!stored) console.error(`✗ [${index + 1}/${pending.length}] ${word.en} · texto:${textStatus} · imagen:error · ${lastStorageError instanceof Error ? lastStorageError.message : String(lastStorageError)} · ${elapsed(startedAt)}`);
  }
}
if (generated.length) {
  console.log('\nRevisión humana · contenido e imágenes generadas');
  console.table(generated.map(({ word, result, imageId }) => ({
    Palabra: word.en,
    Traducción: word.es,
    Puente: result.bridge_word,
    Escena: result.scene_es,
    'Frase EN': result.target_sentence_en,
    'Frase ES': result.target_sentence_es,
    Distractor: result.distractor,
    'Prompt imagen': result.image_prompt,
    Imagen: imageId,
  })));
}
console.log(`✓ Enriquecimiento terminado: ${saved}/${pending.length} palabras · ${elapsed(runStartedAt)} total.`);
