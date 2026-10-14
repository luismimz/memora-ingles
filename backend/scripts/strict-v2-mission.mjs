import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './lib.mjs';
import { assertApprovedAssociation } from './association-policy.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const comparable = (value) => clean(value).toLocaleLowerCase('es').normalize('NFC').replace(/[.!?,;:]+/g, '').replace(/\s+/g, ' ').trim();
const wordCount = (value) => clean(value).split(/\s+/).filter(Boolean).length;
const MICRO_SCENE_MIN_WORDS = 5;
const MICRO_SCENE_MAX_WORDS = 12;
const FORBIDDEN_META_LANGUAGE = ['locus', 'usuario', 'asociación', 'asociacion', 'puente', 'mnemotecnia', 'tarjeta', 'palabra', 'significado', 'término', 'termino', 'escena', 'representa', 'sirve para recordar'];
const AMBIGUOUS_SCENE_REFERENCES = ['él', 'ella', 'ello', 'éste', 'ésta', 'este', 'esta'];
const NARRATIVE_STOP_WORDS = new Set(['a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'por', 'que', 'se', 'su', 'sus', 'un', 'una', 'y']);
const COMMUNICATION_LAYERS = new Set(['observe', 'act', 'converse']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function narrativeSimilarity(left, right) {
  const tokens = (value) => new Set(comparable(value).split(/\s+/).filter((token) => token.length > 2 && !NARRATIVE_STOP_WORDS.has(token)));
  const a = tokens(left);
  const b = tokens(right);
  const shared = [...a].filter((token) => b.has(token)).length;
  const total = new Set([...a, ...b]).size;
  return total ? shared / total : 1;
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('OpenRouter no devolvió un objeto JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : part?.text || part?.content || '').join('');
  return content && typeof content === 'object' ? JSON.stringify(content) : '';
}

function validateSpec(spec, worlds, associations, visualContracts) {
  assert(spec && typeof spec === 'object', 'La especificación no es un objeto.');
  assert(spec.editorialStatus !== 'needs_review', 'La misión sigue pendiente de revisión editorial; no puede compilarse como contenido listo.');
  assert(spec.grammar?.form?.spanish !== 'forma funcional', 'La misión contiene un marcador genérico en lugar de una transformación enseñable.');
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(clean(spec.id)), 'El id de misión no es válido.');
  const world = worlds[spec.world];
  assert(world, `El mundo ${spec.world} no existe.`);
  assert(Array.isArray(world.zones) && world.zones.includes(spec.zone?.id), `${spec.zone?.id || 'La zona'} no pertenece a ${spec.world}.`);
  assert(Array.isArray(world.actions) && world.actions.includes(spec.action), `La acción ${spec.action || '(vacía)'} no pertenece a ${spec.world}.`);
  assert(world.loci && Array.isArray(world.loci[spec.zone.id]), `${spec.world}/${spec.zone.id} no tiene loci registrados.`);
  const locusParts = clean(spec.zone.locus).split('.').filter(Boolean);
  const locusId = locusParts.at(-1);
  assert(locusParts.includes(spec.zone.id), `El locus ${spec.zone.locus || '(vacío)'} no está dentro de la zona ${spec.zone.id}.`);
  assert(world.loci[spec.zone.id].includes(locusId), `${locusId || 'El locus'} no está registrado en ${spec.zone.id}.`);
  assert(world.allowedGrammar.includes(spec.grammar?.id), `${spec.grammar?.id} no está permitido en ${spec.world}.`);
  const visualContract = visualContracts[spec.grammar?.visualContract];
  assert(visualContract, `${spec.grammar?.visualContract || 'La gramática'} no tiene contrato visual registrado.`);
  assert(visualContract.worlds.includes(spec.world), `${spec.grammar.visualContract} no está permitido en ${spec.world}.`);
  assert(!world.forbiddenGrammar.includes(spec.grammar?.id), `${spec.grammar?.id} está prohibido en ${spec.world}.`);
  assert(Array.isArray(spec.targetWords) && spec.targetWords.length === 3, 'La misión necesita exactamente tres palabras objetivo.');
  const newWords = spec.newWords || spec.targetWords;
  const reviewWords = spec.reviewWords || [];
  assert(Array.isArray(newWords) && newWords.length >= 1 && newWords.length <= 3, 'La misión necesita entre una y tres palabras nuevas.');
  assert(Array.isArray(reviewWords) && reviewWords.length <= 2, 'La misión puede recuperar como máximo dos palabras dentro del trío.');
  assert(new Set([...newWords, ...reviewWords]).size === 3 && sameArray([...newWords, ...reviewWords], spec.targetWords), 'newWords + reviewWords debe reconstruir targetWords en el mismo orden.');
  assert(COMMUNICATION_LAYERS.has(spec.communication?.layer), 'La capa comunicativa debe ser observe, act o converse.');
  assert(clean(spec.communication?.intent), 'Falta la intención comunicativa.');
  assert(clean(spec.communication?.interlocutor), 'Falta el interlocutor de la misión.');
  assert(clean(spec.communication?.userTurn), 'Falta el turno que produce el alumno.');
  assert(clean(spec.communication?.reply), 'Falta la respuesta natural que escucha el alumno.');
  assert(['target', 'receptive_chunk'].includes(spec.communication?.replyMode), 'replyMode debe ser target o receptive_chunk.');
  assert(new Set(spec.targetWords).size === 3, 'Las tres palabras objetivo deben ser distintas.');
  for (const word of spec.targetWords) {
    assert(word === clean(word).toUpperCase(), `La palabra ${word} debe estar en mayúsculas.`);
    assert(associations[word], `Falta la asociación permanente de ${word}.`);
    assertApprovedAssociation(word, associations[word]);
    assert(clean(associations[word].meaning), `${word} no tiene significado curado.`);
    assert(/^\/[^/\r\n]+\/$/u.test(clean(associations[word].ipa)), `${word} no tiene un IPA curado válido.`);
    assert(Array.isArray(associations[word].emojis) && associations[word].emojis.length >= 1 && associations[word].emojis.length <= 2, `${word} necesita uno o dos emojis curados.`);
    assert(['acoustic_bridge', 'direct_image', 'cognate', 'context_scene', 'action_scene'].includes(associations[word].associationMode), `${word} no declara un modo de asociación válido.`);
    if (associations[word].associationMode === 'acoustic_bridge') assert(clean(associations[word].bridge), `${word} no tiene puente fonético curado.`);
    if (associations[word].associationMode !== 'acoustic_bridge') {
      assert(!clean(associations[word].bridge), `${word}: una conexión directa no puede declarar un puente.`);
      if (associations[word].associationMode === 'direct_image') {
        assert(sameArray(associations[word].sceneTerms, associations[word].meaningTerms), `${word}: una conexión directa debe destacar únicamente su significado; no puede crear un falso disparador.`);
      }
    }
    assert(clean(associations[word].anchor), `${word} no tiene ancla curada.`);
    assert(Array.isArray(associations[word].sceneTerms) && associations[word].sceneTerms.length, `${word} no tiene términos visuales verificables.`);
    assert(Array.isArray(associations[word].meaningTerms) && associations[word].meaningTerms.length, `${word} no tiene términos de significado verificables.`);
  }
  assert(spec.limits?.newContentWords === newWords.length, `newContentWords debe ser ${newWords.length}.`);
  assert(Number(spec.limits?.maxContextWords) > 0 && Number(spec.limits.maxContextWords) <= 300, 'El contexto debe tener un máximo de 300 palabras.');
  assert(Number.isInteger(spec.limits?.maxRepairs) && spec.limits.maxRepairs >= 0 && spec.limits.maxRepairs <= 2, 'Se permiten como máximo dos reparaciones.');
  assert(clean(spec.scene?.seed), 'Falta la semilla visual de la misión.');
  assert(Array.isArray(spec.scene?.requiredTerms) && spec.scene.requiredTerms.length, 'Faltan términos obligatorios de escena.');
  assert(Array.isArray(spec.scene?.forbiddenObjects), 'Los objetos prohibidos deben ser una lista.');
  assert(spec.grammar?.form && typeof spec.grammar.form === 'object', 'Falta la forma gramatical cerrada.');
  assert(Array.isArray(spec.grammar.form.subjects) && spec.grammar.form.subjects.length === 8, 'La forma gramatical debe conservar las ocho personas.');
  assert(Array.isArray(spec.sentences) && spec.sentences.length >= 2, 'La misión necesita una frase base y al menos una ampliación.');
  assert(new Set(spec.sentences.map((sentence) => comparable(sentence.en))).size === spec.sentences.length, 'Las frases de práctica deben variar; no pueden duplicar la frase base.');
  for (const sentence of spec.sentences) {
    assert(clean(sentence.en) && clean(sentence.es), 'Hay una frase vacía.');
    assert(Array.isArray(sentence.chunks) && sentence.chunks.length >= 2, 'Cada frase necesita al menos dos chunks.');
    const rebuilt = sentence.chunks.map((chunk) => clean(chunk.en)).join(' ').replace(/\s+/g, ' ').trim();
    assert(comparable(rebuilt) === comparable(sentence.en), `Los chunks no reconstruyen: ${sentence.en}`);
    for (const chunk of sentence.chunks) {
      assert(clean(chunk.en) && clean(chunk.es), 'Hay un chunk incompleto.');
      assert(Array.isArray(chunk.choices) && chunk.choices.length === 2, `${chunk.en} necesita dos opciones.`);
      assert(chunk.choices[0] !== chunk.choices[1] && chunk.choices.includes(chunk.en), `${chunk.en} necesita una opción correcta y un distractor distinto.`);
    }
  }
  return world;
}

function buildContext(spec, associations) {
  const newWords = spec.newWords || spec.targetWords;
  const reviewWords = spec.reviewWords || [];
  const associationLines = newWords.map((word) => {
    const item = associations[word];
    return item.associationMode !== 'acoustic_bridge'
      ? `- ${word} = ${item.meaning}; ruta alternativa ${item.associationMode} obligatoria; debe verse: ${item.meaningTerms.join('/')}; ancla: ${item.anchor}`
      : `- ${word} = ${item.meaning}; puente obligatorio: ${item.bridge}; debe verse: ${item.meaningTerms.join('/')}; ancla: ${item.anchor}`;
  });
  const sentenceLines = spec.sentences.map((sentence, index) => `${index + 1}. ${sentence.en} | chunks: ${sentence.chunks.map((chunk) => `[${chunk.en}]`).join(' ')}`);
  const context = [
    `MISIÓN ${spec.id}: ${spec.zone.name}; punto visual ${spec.zone.locus}; acción ${spec.action}.`,
    `Comunicación cerrada: capa ${spec.communication.layer}; intención ${spec.communication.intent}; interlocutor ${spec.communication.interlocutor}. El alumno dice «${spec.communication.userTurn}» y escucha «${spec.communication.reply}». No alteres este intercambio.`,
    `Mundo: ${spec.world}. Transformación única: ${spec.grammar.transformations.join(' y ')}.`,
    'Palabras y asociaciones inmutables:',
    ...associationLines,
    ...(reviewWords.length ? [`Recuperación: ${reviewWords.join(', ')} ya se aprendieron; conserva sus anclas y no redactes otra microescena.`] : []),
    `Escena común: ${spec.scene.seed}`,
    `Términos literales obligatorios: ${spec.scene.requiredTerms.join(', ')}.`,
    `Objetos prohibidos: ${spec.scene.forbiddenObjects.join(', ') || 'ninguno'}.`,
    'Frases inmutables:',
    ...sentenceLines,
    'Genera tres primeros planos distintos: cada microescena contiene solo el término asignado a su palabra y ninguno de los otros dos. Cero resúmenes o metalenguaje. Añade 1-2 emojis por palabra y una ayuda fonética breve por frase.',
  ].join('\n');
  assert(wordCount(context) <= spec.limits.maxContextWords, `El contexto tiene ${wordCount(context)} palabras; máximo ${spec.limits.maxContextWords}.`);
  return context;
}

function creativeSchema(spec) {
  const newWords = spec.newWords || spec.targetWords;
  return {
    type: 'object',
    additionalProperties: false,
    required: ['missionId', 'words', 'pronunciationTips'],
    properties: {
      missionId: { type: 'string', enum: [spec.id] },
      words: {
        type: 'array', minItems: newWords.length, maxItems: newWords.length,
        items: {
          type: 'object', additionalProperties: false,
          required: ['en', 'scene'],
          properties: {
            en: { type: 'string', enum: newWords },
            scene: { type: 'string', minLength: 12, maxLength: 110 },
          },
        },
      },
      pronunciationTips: {
        type: 'array', minItems: spec.sentences.length, maxItems: spec.sentences.length,
        items: { type: 'string', minLength: 3, maxLength: 140 },
      },
    },
  };
}

function validateCreative(value, spec, associations) {
  const newWords = spec.newWords || spec.targetWords;
  assert(value?.missionId === spec.id, 'La respuesta pertenece a otra misión.');
  assert(Array.isArray(value.words) && value.words.length === newWords.length, `Se requieren ${newWords.length} microescenas nuevas.`);
  assert(sameArray(value.words.map((word) => word.en), newWords), `El orden debe ser ${newWords.join(', ')}.`);
  assert(Array.isArray(value.pronunciationTips) && value.pronunciationTips.length === spec.sentences.length, 'Falta una ayuda fonética por frase.');
  const allScenes = value.words.map((word) => clean(word.scene)).join(' ');
  for (const [index, word] of value.words.entries()) {
    assert(clean(word.scene), `${word.en}: falta la microescena.`);
    assert(wordCount(word.scene) >= MICRO_SCENE_MIN_WORDS && wordCount(word.scene) <= MICRO_SCENE_MAX_WORDS, `${word.en}: la microescena debe tener entre ${MICRO_SCENE_MIN_WORDS} y ${MICRO_SCENE_MAX_WORDS} palabras; tiene ${wordCount(word.scene)}.`);
    assert((word.scene.match(/[.!?]+/g) || []).length <= 1, `${word.en}: la microescena debe ser una sola frase.`);
    for (const term of associations[word.en].sceneTerms) {
      assert(word.scene.includes(term), `${word.en}: su microescena debe contener literalmente ${term} en mayúsculas.`);
    }
    for (const term of associations[word.en].meaningTerms) {
      assert(word.scene.includes(term), `${word.en}: su microescena debe hacer visible el significado con ${term} en mayúsculas.`);
    }
    const otherTerms = newWords
      .filter((target) => target !== word.en)
      .flatMap((target) => associations[target].sceneTerms);
    for (const term of otherTerms) {
      assert(!comparable(word.scene).includes(comparable(term)), `${word.en}: foco mezclado; su microescena menciona ${term}, reservado para otra tarjeta.`);
    }
    const normalizedScene = comparable(word.scene);
    for (const forbidden of FORBIDDEN_META_LANGUAGE) {
      assert(!normalizedScene.includes(comparable(forbidden)), `${word.en}: metalenguaje prohibido en la microescena: ${forbidden}.`);
    }
    for (const reference of AMBIGUOUS_SCENE_REFERENCES) {
      assert(!new RegExp(`(^|\\s)${comparable(reference)}(\\s|$)`, 'u').test(normalizedScene), `${word.en}: referente ambiguo prohibido: ${reference}.`);
    }
  }
  for (let left = 0; left < value.words.length; left += 1) {
    for (let right = left + 1; right < value.words.length; right += 1) {
      const similarity = narrativeSimilarity(value.words[left].scene, value.words[right].scene);
      assert(similarity < 0.55, `${value.words[left].en}/${value.words[right].en}: microescenas demasiado parecidas (${Math.round(similarity * 100)}%); no copies la misma narración.`);
    }
  }
  for (const term of spec.scene.requiredTerms) assert(comparable(allScenes).includes(comparable(term)), `La escena común no contiene ${term}.`);
  for (const forbidden of spec.scene.forbiddenObjects) assert(!comparable(allScenes).includes(comparable(forbidden)), `La escena introdujo el objeto prohibido: ${forbidden}.`);
  return value;
}

function compileUnit(creative, spec, associations, model) {
  const toSentence = (sentence, index) => ({
    en: sentence.en,
    es: sentence.es,
    slots: sentence.chunks.map((chunk) => ({ en: chunk.en, es: chunk.es, choices: chunk.choices })),
    pronunciationTip: clean(creative.pronunciationTips[index]),
  });
  const associationReview = spec.targetWords.filter((word) => associations[word].status !== 'approved');
  return {
    id: spec.id,
    title: spec.title,
    location: { world: spec.world, zone: spec.zone.id, locus: spec.zone.locus, label: spec.zone.label || spec.zone.name },
    words: spec.targetWords.map((target, index) => {
      const word = creative.words.find((item) => item.en === target);
      const scene = word?.scene || associations[target].anchor;
      return ({
      id: index + 1,
      en: target,
      es: associations[target].meaning,
      ipa: associations[target].ipa,
      bridge: associations[target].bridge,
      associationMode: associations[target].associationMode,
      status: associations[target].status,
      bridgeEvidence: associations[target].bridgeEvidence,
      cognateEvidence: associations[target].cognateEvidence,
      usageExample: associations[target].usageExample,
      editorialReview: associations[target].editorialReview,
      anchor: associations[target].anchor,
      meaningTerms: associations[target].meaningTerms,
      highlightTerms: [...new Set(associations[target].associationMode === 'acoustic_bridge'
        ? [...associations[target].sceneTerms, ...associations[target].meaningTerms]
        : associations[target].meaningTerms)],
      memoryChain: associations[target].associationMode === 'acoustic_bridge'
        ? [associations[target].bridge, target, associations[target].meaning.toUpperCase()]
        : [target, associations[target].meaning.toUpperCase()],
      scene: clean(scene),
      emojis: associations[target].emojis,
      imageUrl: null,
      audioUrl: null,
      learningRole: (spec.newWords || spec.targetWords).includes(target) ? 'new' : 'review',
    }); }),
    grammar: [{ id: spec.grammar.id, visualContract: spec.grammar.visualContract, ...spec.grammar.form }],
    sentence: toSentence(spec.sentences[0], 0),
    practiceSentences: spec.sentences.slice(1).map((sentence, index) => toSentence(sentence, index + 1)),
    communication: { ...spec.communication },
    methodCoverage: {
      listenBeforeRead: true,
      mnemonicAssociation: true,
      timedRecall: true,
      visualTransformation: true,
      chunkConstruction: true,
      gradualWriting: true,
      shadowing: true,
      conversationalReply: Boolean(spec.communication.reply),
      spacedReview: true,
      interleaving: true,
    },
    factory: {
      specId: spec.id,
      world: spec.world,
      zone: spec.zone.id,
      status: 'draft',
      model,
      generatedAt: new Date().toISOString(),
      reviewRequired: associationReview.length > 0,
      reviewReasons: associationReview.map((word) => `${word}: asociación ${associations[word].status}`),
    },
  };
}

function validateCompiled(unit, spec, associations, world) {
  assert(unit.id === spec.id && unit.title === spec.title, 'El compilador alteró la identidad de la misión.');
  assert(sameArray(unit.words.map((word) => word.en), spec.targetWords), 'El JSON final alteró las palabras o su orden.');
  for (const word of unit.words) {
    const fixed = associations[word.en];
    assert(word.es === fixed.meaning && word.bridge === fixed.bridge, `${word.en}: significado o asociación alterados.`);
    assert(word.associationMode === fixed.associationMode, `${word.en}: modo de asociación alterado.`);
    const expectedHighlights = [...new Set(fixed.associationMode === 'acoustic_bridge'
      ? [...fixed.sceneTerms, ...fixed.meaningTerms]
      : fixed.meaningTerms)];
    assert(JSON.stringify(word.highlightTerms) === JSON.stringify(expectedHighlights), `${word.en}: términos destacados alterados.`);
    const expectedChain = fixed.associationMode === 'acoustic_bridge'
      ? [fixed.bridge, word.en, fixed.meaning.toUpperCase()]
      : [word.en, fixed.meaning.toUpperCase()];
    assert(JSON.stringify(word.memoryChain) === JSON.stringify(expectedChain), `${word.en}: cadena mnemotécnica alterada.`);
  }
  assert(unit.grammar.length === 1 && unit.grammar[0].id === spec.grammar.id, 'El JSON final alteró la gramática.');
  assert(JSON.stringify(unit.communication) === JSON.stringify(spec.communication), 'El JSON final alteró la comunicación cerrada.');
  assert(JSON.stringify(unit.grammar[0]) === JSON.stringify({ id: spec.grammar.id, visualContract: spec.grammar.visualContract, ...spec.grammar.form }), 'La forma visual no coincide con el spec.');
  const sentences = [unit.sentence, ...unit.practiceSentences];
  assert(sentences.length === spec.sentences.length, 'El JSON final alteró el número de frases.');
  sentences.forEach((sentence, index) => {
    const expected = spec.sentences[index];
    assert(sentence.en === expected.en && sentence.es === expected.es, `La frase ${index + 1} fue alterada.`);
    assert(sentence.slots.length >= 2, `La frase ${index + 1} necesita al menos dos chunks.`);
    assert(sentence.slots.map((slot) => slot.en).join(' ').replace(/\s+/g, ' ').trim() === sentence.en, `Los chunks no reconstruyen exactamente la frase ${index + 1}.`);
    assert(sentence.en.split(/\s+/).length <= world.sentenceMaxWords, `La frase ${index + 1} supera el máximo de ${world.sentenceMaxWords} palabras.`);
    expected.chunks.forEach((chunk, chunkIndex) => assert(JSON.stringify(sentence.slots[chunkIndex]) === JSON.stringify({ en: chunk.en, es: chunk.es, choices: chunk.choices }), `El chunk ${index + 1}.${chunkIndex + 1} fue alterado.`));
  });
  return unit;
}

async function callOpenRouter({ spec, context, model, feedback }) {
  const systemPrompt = await readFile(resolve(ROOT, 'prompts/memora-strict-mission.md'), 'utf8');
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost',
      'X-Title': 'Memora Strict Mission Factory',
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      max_tokens: 4000,
      ...(model.includes('deepseek') ? { reasoning: { max_tokens: 512, exclude: true } } : {}),
      provider: { require_parameters: true },
      response_format: { type: 'json_schema', json_schema: { name: 'memora_mission_creative_layer', strict: true, schema: creativeSchema(spec) } },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${context}${feedback ? `\n\nREPARA SOLO ESTOS INCUMPLIMIENTOS:\n${feedback}` : ''}` },
      ],
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(body.errors || body.error || body)}`);
  const choice = body.choices?.[0];
  const content = messageText(choice?.message?.content);
  if (!content.trim()) throw new Error(`OpenRouter devolvió contenido vacío (finish_reason: ${choice?.finish_reason || 'desconocido'}).`);
  return parseJson(content);
}

async function saveDraft(unit) {
  const existing = await api('GET', `/items/learning_units?filter[id][_eq]=${encodeURIComponent(unit.id)}&fields=id,status&limit=1`);
  const payload = { title: unit.title, status: 'draft', content: unit };
  if (existing[0]) await api('PATCH', `/items/learning_units/${encodeURIComponent(unit.id)}`, payload);
  else await api('POST', '/items/learning_units', { id: unit.id, ...payload });
}

export async function runStrictMission({ specId, apply = false, checkExisting = false, inspectContext = false, editorial = false, model = 'openai/gpt-4.1-mini' }) {
  const specPath = resolve(ROOT, 'curriculum/mission-specs', `${specId}.json`);
  const [spec, associations, worlds, visualContracts] = await Promise.all([
    readFile(specPath, 'utf8').then(JSON.parse),
    readFile(resolve(ROOT, 'curriculum/associations.json'), 'utf8').then(JSON.parse),
    readFile(resolve(ROOT, 'curriculum/worlds.json'), 'utf8').then(JSON.parse),
    readFile(resolve(ROOT, 'curriculum/grammar-visual-contracts.json'), 'utf8').then(JSON.parse),
  ]);
  const world = validateSpec(spec, worlds, associations, visualContracts);
  const context = buildContext(spec, associations);
  const outputDir = resolve(ROOT, 'private/generated');
  await mkdir(outputDir, { recursive: true });
  const contextPath = resolve(outputDir, `${spec.id}.context.md`);
  await writeFile(contextPath, `${context}\n`, 'utf8');
  console.log(`Memora Factory estricta · ${spec.id} · ${wordCount(context)}/${spec.limits.maxContextWords} palabras de contexto · ${model}`);
  console.log(`✓ Spec, currículo y asociaciones validados · contexto: ${contextPath}`);
  if (inspectContext) return { contextPath, context };

  const outputPath = resolve(outputDir, `${spec.id}.json`);
  if (editorial) {
    const newWords = spec.newWords || spec.targetWords;
    const creative = {
      missionId: spec.id,
      words: newWords.map((word) => ({ en: word, scene: associations[word].anchor })),
      pronunciationTips: spec.pronunciationTips,
    };
    assert(Array.isArray(creative.pronunciationTips) && creative.pronunciationTips.length === spec.sentences.length, 'El modo editorial necesita una pronunciationTip curada por frase.');
    const unit = validateCompiled(compileUnit(validateCreative(creative, spec, associations), spec, associations, 'editorial'), spec, associations, world);
    await writeFile(outputPath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
    await writeFile(resolve(outputDir, `${unit.id}.validation.json`), `${JSON.stringify({ specId: spec.id, valid: true, editorial: true, checkedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
    console.log(`✓ JSON editorial válido · ${newWords.length} nuevas + ${(spec.reviewWords || []).length} recuperadas · ${spec.sentences.length} frases`);
    console.log(`✓ Guardado localmente: ${outputPath}`);
    return unit;
  }
  if (apply || checkExisting) {
    let stored;
    try {
      stored = JSON.parse(await readFile(outputPath, 'utf8'));
    } catch (error) {
      throw new Error(`No existe un JSON local válido para aplicar. Genera primero la misión sin --apply. Detalle: ${error instanceof Error ? error.message : String(error)}`);
    }
    const creative = {
      missionId: spec.id,
      words: stored.words?.filter((word) => word.learningRole !== 'review').map((word) => ({ en: word.en, scene: word.scene })),
      pronunciationTips: [stored.sentence, ...(stored.practiceSentences || [])].map((sentence) => sentence.pronunciationTip),
    };
    validateCreative(creative, spec, associations);
    const rebuilt = compileUnit(creative, spec, associations, stored.factory?.model || model);
    rebuilt.words = rebuilt.words.map((word, index) => ({
      ...word,
      imageUrl: stored.words?.[index]?.imageUrl ?? word.imageUrl,
      audioUrl: stored.words?.[index]?.audioUrl ?? word.audioUrl,
      audioProvenance: stored.words?.[index]?.audioProvenance,
      imageProvenance: stored.words?.[index]?.imageProvenance,
    }));
    const validated = validateCompiled(rebuilt, spec, associations, world);
    console.log(`✓ JSON local revalidado sin llamar a OpenRouter: ${outputPath}`);
    if (apply) {
      await saveDraft(validated);
      console.log('✓ Borrador guardado en Directus sin regenerar el contenido.');
    }
    return validated;
  }
  assert(process.env.OPENROUTER_API_KEY, 'Falta OPENROUTER_API_KEY en backend/.env.');

  let unit;
  let lastError = '';
  const totalAttempts = 1 + spec.limits.maxRepairs;
  for (let attempt = 1; attempt <= totalAttempts && !unit; attempt += 1) {
    try {
      const creative = validateCreative(await callOpenRouter({ spec, context, model, feedback: lastError }), spec, associations);
      unit = validateCompiled(compileUnit(creative, spec, associations, model), spec, associations, world);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < totalAttempts) console.warn(`↻ Reparación ${attempt}/${spec.limits.maxRepairs}: ${lastError}`);
    }
  }
  if (!unit) {
    const reportPath = resolve(outputDir, `${spec.id}.validation.json`);
    await writeFile(reportPath, `${JSON.stringify({ specId: spec.id, valid: false, error: lastError, checkedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
    throw new Error(`La misión no superó la validación estricta: ${lastError}. Informe: ${reportPath}`);
  }

  await writeFile(outputPath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, `${unit.id}.validation.json`), `${JSON.stringify({ specId: spec.id, valid: true, reviewRequired: unit.factory.reviewRequired, reviewReasons: unit.factory.reviewReasons, checkedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
  console.log(`✓ JSON válido · 3 palabras · ${1 + unit.practiceSentences.length} frases · ${unit.factory.reviewRequired ? 'requiere revisión editorial' : 'asociaciones aprobadas'}`);
  console.log(`✓ Guardado localmente: ${outputPath}`);
  return unit;
}
