import { createHash } from 'node:crypto';

const kinds = new Set(['baseline', 'word', 'replacement', 'chunkExposure', 'chunkRecall', 'sentenceExposure', 'sentenceRecall', 'attempt', 'session', 'unit', 'grammar', 'learning']);
const invalid = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
export function validateProgressBatch(body) {
  if (body?.course !== 'es-en') invalid('Curso no disponible.');
  if (!Array.isArray(body.events) || !body.events.length || body.events.length > 25) invalid('Envía entre 1 y 25 eventos.');
  if (Buffer.byteLength(JSON.stringify(body)) > 900_000) invalid('El lote de progreso es demasiado grande.');
  for (const event of body.events) {
    if (!event || !/^[a-f0-9-]{36}$/i.test(event.id) || !kinds.has(event.kind) || !Array.isArray(event.args) || event.args.length > 5 ||
      !Number.isFinite(Date.parse(event.at)) || Buffer.byteLength(JSON.stringify(event)) > 300_000) invalid('Evento de progreso inválido.');
    const [a, b, c] = event.args;
    const word = (value) => value && typeof value === 'object' && typeof value.en === 'string' && typeof value.es === 'string';
    const grade = (value) => ['quick', 'hesitant', 'missed'].includes(value);
    // A dialogue utterance is also a sentence; it has no builder slots.
    // Chunk events below still require a real slot at the supplied index.
    const sentence = (value) => value && typeof value.en === 'string' && value.en.trim() && typeof value.es === 'string' && value.es.trim() && Array.isArray(value.slots);
    if (event.kind === 'word' && (!word(a) || !grade(b) || !['recognition', 'auditory', 'recall', 'production'].includes(c))) invalid('Recuerdo de palabra inválido.');
    if (event.kind === 'replacement' && (!word(a) || typeof b !== 'string')) invalid('Cambio de asociación inválido.');
    if (event.kind === 'chunkExposure' && (typeof a !== 'string' || !sentence(b) || !Number.isInteger(c) || !b.slots[c])) invalid('Pieza de frase inválida.');
    if (event.kind === 'sentenceExposure' && (typeof a !== 'string' || !sentence(b))) invalid('Frase inválida.');
    if (['chunkRecall', 'sentenceRecall'].includes(event.kind) && (typeof a !== 'string' || !grade(b))) invalid('Repaso inválido.');
    if (event.kind === 'attempt' && (!a || typeof a.word !== 'string' || typeof a.correct !== 'boolean' || !Number.isFinite(Date.parse(a.at)))) invalid('Intento inválido.');
    if (event.kind === 'session' && (!a || typeof a.unitId !== 'string' || !Number.isFinite(a.correct) || !Number.isFinite(a.attempted) || !Number.isFinite(Date.parse(a.completedAt)))) invalid('Sesión inválida.');
    if (event.kind === 'unit' && (typeof a !== 'string' || !b || !Number.isFinite(b.correct) || !Number.isFinite(b.attempted) || !Number.isFinite(Date.parse(b.completedAt)) || !Number.isFinite(Date.parse(b.nextReviewAt)))) invalid('Fin de unidad inválido.');
    if (event.version !== undefined && event.version !== 2) invalid('Versión de evento no compatible.');
    if (event.sequence !== undefined && (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || typeof event.device !== 'string')) invalid('Orden de evento inválido.');
    if (event.kind === 'baseline' && (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).some((key) => !['memory', 'chunks', 'sentences', 'attempts', 'sessions', 'grammar', 'learning'].includes(key) && !key.startsWith('unit.')))) invalid('Migración inválida.');
    if (event.kind === 'grammar' && (!a || typeof a.skill !== 'string' || typeof a.correct !== 'boolean' || typeof a.helped !== 'boolean')) invalid('Práctica gramatical inválida.');
    if (event.kind === 'learning' && (!a || a.id !== event.id || !['grammar', 'construction', 'dialogue', 'transfer', 'arcade', 'completion'].includes(a.phase) || !['learner', 'authored'].includes(a.source) || !['choice', 'writing', 'oral'].includes(a.modality) || !['unitId', 'unitTitle', 'activityId', 'skill', 'contentVersion', 'prompt', 'response', 'expected'].every((field) => typeof a[field] === 'string' && a[field].length <= 10_000) || ![true, false, null].includes(a.correct) || typeof a.helped !== 'boolean' || !Number.isFinite(Date.parse(a.at)))) invalid('Actividad de aprendizaje inválida.');
  }
  return body.events.map(({ id, at, kind, args, version, device, sequence }) => ({ id, at, kind, args, ...(version ? { version, device, sequence } : {}) }));
}

export function registerProgressRoutes(router, { auth, wrap, svc, pilotSvc }) {
  router.get('/pilot/keys', auth, wrap(async (req) => {
    const rows = await (await pilotSvc(req)).readByQuery({ filter: { id: { _eq: 'm1-entry-keys' }, status: { _eq: 'draft' } }, fields: ['content'], limit: 1 });
    return rows[0]?.content?.pilot === 'keys-cycle-v1' ? rows[0].content : null;
  }));
  router.get('/progress/events', auth, wrap(async (req) => {
    if (req.query.course !== 'es-en') invalid('Curso no disponible.');
    const after = Number(req.query.after || 0);
    if (!Number.isSafeInteger(after) || after < 0) invalid('Cursor inválido.');
    const records = await (await svc('learning_events')).readByQuery({
      fields: ['id', 'event'], sort: ['id'], limit: 501,
      filter: { user: { _eq: req.accountability.user }, course: { _eq: req.query.course }, id: { _gt: after } },
    });
    const page = records.slice(0, 500);
    return { events: page.map((row) => row.event), cursor: page.at(-1)?.id ?? after, hasMore: records.length > 500 };
  }));
  router.post('/progress/events', auth, wrap(async (req) => {
    const events = validateProgressBatch(req.body);
    const service = await svc('learning_events');
    const accepted = [];
    for (const event of events) {
      // Only the authenticated account can own the event, regardless of request fields.
      const eventKey = createHash('sha256').update(`${req.accountability.user}:${req.body.course}:${event.id}`).digest('hex');
      const filter = { event_key: { _eq: eventKey } };
      if (!(await service.readByQuery({ filter, fields: ['id'], limit: 1 })).length) {
        try { await service.createOne({ event_key: eventKey, user: req.accountability.user, course: req.body.course, event }); }
        catch (error) {
          if (!(await service.readByQuery({ filter, fields: ['id'], limit: 1 })).length) throw error;
        }
      }
      accepted.push(event.id);
    }
    return { accepted };
  }));
}
