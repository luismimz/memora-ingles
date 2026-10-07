// Endpoints de Memora (montados en /memora). Toda llamada externa pasa por los proveedores (./providers),
// así se pueden cambiar Datamuse, OpenRouter, Pollinations o Tatoeba sin tocar este archivo ni el núcleo.
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createProviders } from './providers/index.js';
import { generateKeywordMnemonics, phoneticsFor, scoredCandidates } from './core/keywords.js';
import { pronunciationEs } from '../../../../shared/phonetics.mjs';
import { BUCKETS, retentionBy } from '../../../../shared/retention.mjs';

export default {
  id: 'memora',
  handler: (router, { services, getSchema, env, logger }) => {
    const { ItemsService, FilesService, UsersService } = services;
    const providers = createProviders(env);
    const llm = providers.llm;
    const tts = providers.tts;
    const allowedEmails = String(env.AI_ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    const svc = async (collection) => new ItemsService(collection, { schema: await getSchema() });

    const auth = (req, res, next) => (req.accountability?.user ? next() : res.status(401).json({ error: 'Inicia sesión' }));
    async function paid(req, res, next) {
      if (!req.accountability?.user) return res.status(401).json({ error: 'Inicia sesión para usar la IA' });
      if (!llm.enabled) return res.status(503).json({ error: 'Falta OPENROUTER_API_KEY en el servidor' });
      if (allowedEmails.length) {
        const u = await new UsersService({ schema: await getSchema() }).readOne(req.accountability.user, { fields: ['email'] });
        if (!allowedEmails.includes(String(u.email).toLowerCase())) return res.status(403).json({ error: 'IA no habilitada para esta cuenta' });
      }
      next();
    }
    const wrap = (fn) => async (req, res) => {
      try { res.json(await fn(req)); } catch (e) {
        logger.error(e, 'memora');
        res.status(e.status && e.status < 500 ? e.status : 500).json({ error: e.message });
      }
    };
    const model = (req) => req.body?.model || undefined;
    const saveWord = async (id, patch) => (await svc('words')).updateOne(id, patch);

    router.get('/models', (_req, res) => res.json({
      models: llm.models ?? [], default: llm.defaultModel ?? '', enabled: Boolean(llm.enabled),
      providers: Object.fromEntries(Object.entries(providers).map(([k, p]) => [k, p.name])), tts: { enabled: Boolean(tts?.enabled), provider: tts?.name || 'none' },
    }));
    router.get('/voices', auth, wrap(async () => ({ provider: tts?.name || 'none', voices: tts?.enabled && tts.voices ? await tts.voices() : [] })));

    // ---------- Método de la palabra clave ----------

    // Candidatas puntuadas por sonido (gratis, sin IA): sirve para «crear la mía».
    router.post('/candidates', auth, wrap(async (req) => {
      const word = await (await svc('words')).readOne(req.body.word);
      const ph = await phoneticsFor(word, providers, (patch) => saveWord(word.id, patch));
      const cands = await scoredCandidates(ph, providers, { avoid: req.body.avoid ?? [] });
      return { arpabet: ph.arpabet, focus: ph.focusText, pron_es: pronunciationEs(ph.phones), candidates: cands };
    }));

    // «Otra asociación»: nueva palabra clave validada fonéticamente, propiedad del alumno.
    const newKeyword = wrap(async (req) => {
      const word = await (await svc('words')).readOne(req.body.word);
      const avoid = Array.isArray(req.body.avoid) ? req.body.avoid.filter(Boolean).slice(0, 8) : [];
      const [m] = await generateKeywordMnemonics([word], providers, { model: model(req), avoid: { [word.id]: avoid }, saveWord });
      if (!m) throw new Error('No se pudo generar una asociación');
      const mnemonics = await svc('mnemonics');
      const id = await mnemonics.createOne({ ...m, owner: req.accountability.user, source: 'ai' });
      return mnemonics.readOne(id);
    });
    router.post('/keyword', paid, newKeyword);
    router.post('/mnemonic', paid, newKeyword); // alias antiguo

    // Completa palabras nuevas: pronunciación real, figurada, ejemplo real y (solo si procede) asociación compartida.
    router.post('/fill', paid, wrap(async (req) => {
      const wordsSvc = await svc('words');
      const mnemonics = await svc('mnemonics');
      const ids = (req.body.words || []).slice(0, 12);
      if (!ids.length) return { filled: 0 };
      const words = await wordsSvc.readMany(ids);
      for (const w of words) {
        const ph = await phoneticsFor(w, providers, (patch) => saveWord(w.id, patch));
        const patch = {};
        if (!w.pron_es && ph.phones.length) patch.pron_es = pronunciationEs(ph.phones);
        if (!w.example_en) {
          const ex = await providers.sentences.examples(w.en, 3).catch(() => []);
          if (ex[0]) Object.assign(patch, { example_en: ex[0].en, example_es: ex[0].es, examples: ex });
        }
        if (Object.keys(patch).length) { await wordsSvc.updateOne(w.id, patch); Object.assign(w, patch); }
      }
      const have = new Set((await mnemonics.readByQuery({ filter: { word: { _in: ids }, owner: { _null: true } }, fields: ['word'], limit: -1 })).map((m) => m.word));
      const todo = words.filter((w) => !have.has(w.id) && (!w.kind || w.kind === 'keyword' || w.kind === 'irregular'));
      if (!todo.length) return { filled: 0 };
      const made = await generateKeywordMnemonics(todo, providers, { model: model(req), saveWord });
      for (const m of made) await mnemonics.createOne({ ...m, owner: null, source: 'ai' });
      return { filled: made.length };
    }));

    // Frases reales (Tatoeba), guardadas en la palabra para no volver a pedirlas.
    router.post('/examples', auth, wrap(async (req) => {
      const wordsSvc = await svc('words');
      const w = await wordsSvc.readOne(req.body.word);
      if (Array.isArray(w.examples) && w.examples.length) return { examples: w.examples };
      const ex = await providers.sentences.examples(w.en, 5).catch(() => []);
      if (ex.length) await wordsSvc.updateOne(w.id, { examples: ex });
      return { examples: ex };
    }));

    // Imagen de una asociación (Pollinations gratis por defecto).
    router.post('/image', auth, wrap(async (req) => {
      const mnemonics = await svc('mnemonics');
      const m = await mnemonics.readOne(req.body.mnemonic);
      if (m.owner && m.owner !== req.accountability.user) throw Object.assign(new Error('No es tu asociación'), { status: 403 });
      const prompt = `Funny colorful cartoon, one single clear scene, no text, no letters: ${m.story_en || m.scene_es}`;
      const img = await providers.image.generate(prompt);
      const fileId = await new FilesService({ schema: await getSchema() }).uploadOne(Readable.from(img.buffer), {
        storage: String(env.STORAGE_LOCATIONS || 'local').split(',')[0],
        filename_download: `mnemonic-${m.id}.${img.type.split('/')[1] || 'jpg'}`, type: img.type, title: m.keyword || `mnemonic ${m.id}`,
      });
      await mnemonics.updateOne(m.id, { image: fileId });
      return { image: fileId };
    }));

    // Retención por asociación, por origen y por tipo de palabra, con los datos de TODOS los alumnos (anónimo).
    router.get('/mnemonic-stats', auth, wrap(async (req) => {
      const attempts = await (await svc('attempts')).readByQuery({
        filter: { kind: { _in: ['exam', 'review'] } },
        fields: ['user', 'word', 'kind', 'result', 'hours_since_learned', 'mnemonic', 'hints', 'created_at'], limit: -1,
      });
      const mIds = [...new Set(attempts.map((a) => a.mnemonic).filter(Boolean))];
      const mnem = mIds.length ? await (await svc('mnemonics')).readMany(mIds, { fields: ['id', 'word', 'keyword', 'source', 'phon_score', 'owner'] }) : [];
      const mById = new Map(mnem.map((m) => [m.id, m]));
      const wIds = [...new Set(attempts.map((a) => a.word))];
      const words = wIds.length ? await (await svc('words')).readMany(wIds, { fields: ['id', 'en', 'kind'] }) : [];
      const wById = new Map(words.map((w) => [w.id, w]));
      const toRows = (map, describe) => [...map.entries()].map(([key, cells]) => ({ key, ...describe(key), cells }));
      const band = (s) => (s == null ? 'sin puntuar' : s >= 0.65 ? 'sonido bueno' : s >= 0.52 ? 'sonido flojo' : 'sonido malo');
      return {
        buckets: BUCKETS,
        // Solo asociaciones compartidas o tuyas: las privadas de otros alumnos no se muestran.
        byMnemonic: toRows(retentionBy(attempts, (a) => {
          const m = mById.get(a.mnemonic);
          return m && (!m.owner || m.owner === req.accountability.user) ? m.id : null;
        }), (id) => {
          const m = mById.get(id);
          return { keyword: m?.keyword, source: m?.source, phon_score: m?.phon_score, word: wById.get(m?.word)?.en };
        }),
        bySource: toRows(retentionBy(attempts, (a) => (a.mnemonic ? mById.get(a.mnemonic)?.source ?? 'desconocida' : 'sin mnemotecnia')), () => ({})),
        byKind: toRows(retentionBy(attempts, (a) => wById.get(a.word)?.kind ?? 'sin clasificar'), () => ({})),
        byPhonetic: toRows(retentionBy(attempts, (a) => (a.mnemonic ? band(mById.get(a.mnemonic)?.phon_score) : null)), () => ({})),
        byHints: toRows(retentionBy(attempts, (a) => (a.hints > 0 ? 'con pistas' : 'sin pistas')), () => ({})),
      };
    }));

    // ---------- Práctica con IA ----------

    router.post('/chain', paid, wrap(async (req) => llm.json([
      { role: 'system', content: 'Palacio de la memoria: crea una historia ABSURDA y visual que recorra el lugar indicado y encadene las palabras EN ORDEN usando su palabra puente y su significado. Cada palabra inglesa en MAYÚSCULAS entre paréntesis tras su significado. Máximo 8 frases. Responde SOLO JSON: {"story_es":"","story_en":""} (story_en en inglés A2).' },
      { role: 'user', content: `Lugar: ${req.body.place}. Palabras: ${JSON.stringify((req.body.items || []).slice(0, 12))}` },
    ], { model: model(req) })));

    router.post('/correct', paid, wrap(async (req) => llm.json([
      { role: 'system', content: 'Profesor de inglés paciente para un hispanohablante A2. Corrige la frase. Responde SOLO JSON: {"correct":true|false,"corrected":"","explanation_es":"explicación breve de cada error (o elogio)","natural":"cómo lo diría un nativo","score":0-10}' },
      { role: 'user', content: `Frase: "${req.body.sentence}"${req.body.intended ? `\nQuería decir: "${req.body.intended}"` : ''}${req.body.words?.length ? `\nPalabras objetivo: ${req.body.words.join(', ')}` : ''}` },
    ], { model: model(req), temperature: 0.3 })));

    router.post('/translate', paid, wrap(async (req) => llm.json([
      { role: 'system', content: 'Traduce del español a un inglés natural y hablado (A2-B1). Responde SOLO JSON: {"en":"","alternatives":["",""],"notes_es":"trucos breves"}' },
      { role: 'user', content: String(req.body.text || '') },
    ], { model: model(req), temperature: 0.3 })));

    // Audio natural opcional (Kokoro). Se guarda por texto/voz/velocidad para no regenerarlo.
    router.post('/speech', auth, wrap(async (req) => {
      if (!tts?.enabled) return { available: false };
      const text = String(req.body.text || '').replace(/\*\*/g, '').trim().slice(0, 1200);
      if (!text) return { available: false };
      const voice = String(req.body.voice || env.KOKORO_TTS_VOICE || 'af_heart');
      const rate = Math.max(.5, Math.min(1.5, Number(req.body.rate) || 1));
      const cacheKey = createHash('sha256').update(JSON.stringify({ text, voice, rate })).digest('hex');
      // No dependemos de la relación antigua speech_cache.file: si el esquema
      // de Directus tiene relaciones dañadas, TTS debe seguir pudiendo generar.
      let cache = null;
      try {
        cache = await svc('speech_cache_v2');
        const hits = await cache.readByQuery({ filter: { cache_key: { _eq: cacheKey } }, fields: ['file_id'], limit: 1 });
        if (hits[0]?.file_id) return { available: true, file: hits[0].file_id, cached: true };
      } catch (e) { logger.warn(e, 'memora: speech cache read skipped'); }
      const audio = await tts.generate(text, { voice, rate });
      const file = await new FilesService({ schema: await getSchema() }).uploadOne(Readable.from(audio.buffer), {
        storage: String(env.STORAGE_LOCATIONS || 'local').split(',')[0],
        filename_download: `speech-${cacheKey}.${audio.type.includes('wav') ? 'wav' : 'mp3'}`,
        type: audio.type, title: `Memora · ${text.slice(0, 80)}`,
      });
      try { if (cache) await cache.createOne({ cache_key: cacheKey, text, voice, rate, file_id: file }); }
      catch (e) { logger.warn(e, 'memora: speech cache write skipped'); }
      return { available: true, file, cached: false };
    }));

    router.post('/define', paid, wrap(async (req) => llm.json([
      { role: 'system', content: 'Profesor de inglés para un hispanohablante A2. Explica UNA palabra o bloque inglés de forma muy breve y práctica. Da su significado más útil EN EL CONTEXTO, una nota si es un falso amigo o tiene una trampa, y un ejemplo A2 corto. Responde SOLO JSON: {"term":"","meaning_es":"","note_es":"","example_en":""}.' },
      { role: 'user', content: `Término: "${String(req.body.term || '').slice(0, 80)}"\nContexto: "${String(req.body.context || '').slice(0, 500)}"` },
    ], { model: model(req), temperature: 0.2 })));

    router.post('/story', paid, wrap(async (req) => llm.json([
      { role: 'system', content: 'Historia corta, divertida y absurda (120-180 palabras) en inglés A2 con el máximo de las palabras dadas, marcadas con **negrita**. Incluye UNA estructura gramatical útil que aparezca de verdad en la historia. Responde SOLO JSON: {"title":"","story_en":"","story_es":"","grammar_focus":{"title":"","pattern":"","explanation_es":"","examples":[{"en":"","es":""},{"en":"","es":""}]},"questions":[{"q":"","a":""}]} con 3 preguntas.' },
      { role: 'user', content: `Palabras: ${(req.body.words || []).slice(0, 40).join(', ')}` },
    ], { model: model(req) })));

    router.post('/chat', paid, wrap(async (req) => {
      const history = (req.body.messages || []).slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1500) }));
      return llm.json([
        { role: 'system', content: `Compañero de conversación en inglés para un hispanohablante A2. Tema: ${req.body.topic || 'libre'}. Frases cortas, UNA pregunta cada vez, usa a menudo: ${(req.body.words || []).slice(0, 40).join(', ')}. Responde SOLO JSON: {"reply_en":"","reply_es":"","correction_es":"corrección breve de su último mensaje o cadena vacía"}` },
        ...history,
      ], { model: model(req) });
    }));
  },
};
