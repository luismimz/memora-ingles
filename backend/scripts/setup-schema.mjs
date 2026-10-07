// Crea (de forma idempotente) colecciones, relaciones, rol "Learner", permisos y registro público.
// Uso: node scripts/setup-schema.mjs   (con Directus arrancado y ADMIN_EMAIL/ADMIN_PASSWORD en .env)
import { api } from './lib.mjs';

const pk = { field: 'id', type: 'integer', meta: { hidden: true, readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } };
const str = (field, extra = {}) => ({ field, type: 'string', meta: { interface: 'input' }, schema: {}, ...extra });
const text = (field) => ({ field, type: 'text', meta: { interface: 'input-multiline' }, schema: {} });
const int = (field, def = null) => ({ field, type: 'integer', meta: { interface: 'input' }, schema: { default_value: def } });
const float = (field, def = null) => ({ field, type: 'float', meta: { interface: 'input' }, schema: { default_value: def } });
const bool = (field, def = false) => ({ field, type: 'boolean', meta: { interface: 'boolean' }, schema: { default_value: def } });
const ts = (field) => ({ field, type: 'timestamp', meta: { interface: 'datetime' }, schema: {} });
const json = (field) => ({ field, type: 'json', meta: { interface: 'input-code', options: { language: 'json' } }, schema: {} });
const created = { field: 'created_at', type: 'timestamp', meta: { special: ['date-created'], readonly: true, interface: 'datetime' }, schema: {} };
const owner = (field = 'user', nullable = false) => ({
  field, type: 'uuid',
  meta: { special: nullable ? [] : ['user-created'], interface: 'select-dropdown-m2o', readonly: !nullable },
  schema: {},
});
const m2o = (field, type = 'integer') => ({ field, type, meta: { interface: 'select-dropdown-m2o' }, schema: {} });

const collections = {
  words: {
    meta: { icon: 'translate', note: 'Vocabulario ordenado por utilidad (rank). day = día sugerido.' },
    fields: [pk, int('rank'), int('day'), str('en'), str('es'), str('pos'), str('ipa'), str('pron_es'),
      text('example_en'), text('example_es'), str('topic'),
      str('kind'), text('hint_es'), str('arpabet'), json('examples'), int('pilot')],
  },
  mnemonics: {
    meta: { icon: 'psychology', note: 'Asociaciones: seed (curadas), ai (generadas) o user (propias).' },
    fields: [pk, m2o('word'), owner('owner', true), str('source'), str('keyword'), text('scene_es'), text('story_en'),
      str('emoji'), m2o('image', 'uuid'), int('likes', 0), float('phon_score'), str('focus'), created],
  },
  progress: {
    meta: { icon: 'trending_up', note: 'Estado de cada palabra para cada usuario (repetición espaciada).' },
    fields: [pk, owner(), m2o('word'), str('status'), int('study_day'), int('step', 0), ts('learned_at'), ts('due_at'),
      ts('relearn_at'), int('reps', 0), int('lapses', 0), int('ok', 0), int('doubt', 0), int('fail', 0), int('avg_ms'),
      ts('last_seen'), m2o('mnemonic'), str('mnemonic_mode'), created],
  },
  attempts: {
    meta: { icon: 'fact_check', note: 'Cada respuesta: permite medir retención a +1h, +24h, +7d, +30d.' },
    fields: [pk, owner(), m2o('word'), int('study_day'), int('step'), str('kind'), str('mode'), str('result'), int('ms'),
      float('hours_since_learned'), m2o('mnemonic'), int('hints', 0), created],
  },
  study_days: {
    meta: { icon: 'calendar_month', note: 'Una fila por día de estudio.' },
    fields: [pk, owner(), int('day'), str('date'), ts('started_at'), ts('finished_at'), int('goal', 100),
      int('learned', 0), int('known', 0), int('exam_ok', 0), int('exam_total', 0), int('seconds', 0), json('chains'), created],
  },
  sentences: {
    meta: { icon: 'edit_note', note: 'Frases propias, escaleras y correcciones de la IA.' },
    fields: [pk, owner(), str('kind'), text('en'), text('es'), json('words'), text('feedback'), int('score'),
      bool('favorite'), created],
  },
  irregular_verbs: {
    meta: { icon: 'shuffle', note: 'Verbos irregulares agrupados por familias fonéticas.' },
    fields: [pk, str('base'), str('past'), str('participle'), str('es'), str('family'), int('sort'),
      text('mnemonic_es'), text('example_en')],
  },
  verb_progress: {
    meta: { icon: 'military_tech', note: 'Cajas de Leitner para los irregulares.' },
    fields: [pk, owner(), m2o('verb'), int('box', 0), ts('due_at'), int('ok', 0), int('fail', 0), created],
  },
  profiles: {
    meta: { icon: 'person', note: 'Preferencias del alumno.' },
    fields: [pk, owner(), str('start_date'), str('level'), int('round_size', 10), int('daily_goal', 100),
      str('ai_model'), str('voice'), float('rate', 0.95), str('answer_mode'), bool('auto_speak', true), created],
  },
};

collections.mnemonic_feedback = {
  meta: { icon: 'thumb_down', note: '«No me funciona»: qué asociación se rechazó y qué hizo el alumno.' },
  fields: [pk, owner(), m2o('word'), m2o('mnemonic'), str('action'), created],
};
collections.pilot_reports = {
  meta: { icon: 'science', note: 'Resultados y opinión de la prueba piloto de 20 palabras.' },
  fields: [pk, owner(), json('data'), json('ratings'), text('comment'), created],
};
collections.personal_vocabulary = {
  meta: { icon: 'bookmark_add', note: 'Palabras y bloques que el alumno guarda al leer o escuchar contenido.' },
  fields: [pk, owner(), str('term'), str('meaning_es'), text('note_es'), text('example_en'), text('context_en'), str('source'), created],
};
collections.speech_cache = {
  meta: { icon: 'record_voice_over', note: 'Audio natural generado una vez y reutilizado por texto, voz y velocidad.' },
  fields: [pk, str('cache_key'), text('text'), str('voice'), float('rate', 1), m2o('file', 'uuid'), created],
};
// Caché sin relación M2O: algunas instalaciones antiguas de Directus fallan al
// reconstruir el esquema de relaciones y devuelven «reading primary». El nuevo
// caché guarda el id del archivo como texto y evita que TTS dependa del introspector.
collections.speech_cache_v2 = {
  meta: { icon: 'record_voice_over', note: 'Caché de voz natural compatible con instalaciones Directus antiguas.' },
  fields: [pk, str('cache_key'), text('text'), str('voice'), float('rate', 1), str('file_id'), created],
};

const relations = [
  ['mnemonics', 'word', 'words', 'CASCADE'],
  ['mnemonics', 'owner', 'directus_users', 'CASCADE'],
  ['mnemonics', 'image', 'directus_files', 'SET NULL'],
  ['progress', 'user', 'directus_users', 'CASCADE'],
  ['progress', 'word', 'words', 'CASCADE'],
  ['progress', 'mnemonic', 'mnemonics', 'SET NULL'],
  ['attempts', 'user', 'directus_users', 'CASCADE'],
  ['attempts', 'word', 'words', 'CASCADE'],
  ['study_days', 'user', 'directus_users', 'CASCADE'],
  ['sentences', 'user', 'directus_users', 'CASCADE'],
  ['verb_progress', 'user', 'directus_users', 'CASCADE'],
  ['verb_progress', 'verb', 'irregular_verbs', 'CASCADE'],
  ['profiles', 'user', 'directus_users', 'CASCADE'],
  ['attempts', 'mnemonic', 'mnemonics', 'SET NULL'],
  ['mnemonic_feedback', 'user', 'directus_users', 'CASCADE'],
  ['mnemonic_feedback', 'word', 'words', 'CASCADE'],
  ['mnemonic_feedback', 'mnemonic', 'mnemonics', 'SET NULL'],
  ['pilot_reports', 'user', 'directus_users', 'CASCADE'],
  ['personal_vocabulary', 'user', 'directus_users', 'CASCADE'],
  ['speech_cache', 'file', 'directus_files', 'CASCADE'],
];

async function ensureCollections() {
  const existing = new Set((await api('GET', '/collections')).map((c) => c.collection));
  for (const [name, def] of Object.entries(collections)) {
    if (!existing.has(name)) {
      await api('POST', '/collections', { collection: name, meta: def.meta, schema: {}, fields: def.fields });
      console.log(`+ colección ${name}`);
      continue;
    }
    const have = new Set((await api('GET', `/fields/${name}`)).map((f) => f.field));
    for (const f of def.fields) {
      if (!have.has(f.field)) {
        await api('POST', `/fields/${name}`, f);
        console.log(`+ campo ${name}.${f.field}`);
      }
    }
  }
}

async function ensureRelations() {
  const existing = new Set((await api('GET', '/relations')).map((r) => `${r.collection}.${r.field}`));
  for (const [collection, field, related, onDelete] of relations) {
    if (existing.has(`${collection}.${field}`)) continue;
    await api('POST', '/relations', { collection, field, related_collection: related, schema: { on_delete: onDelete } });
    console.log(`+ relación ${collection}.${field} -> ${related}`);
  }
}

async function ensureLearnerRole() {
  let [policy] = await api('GET', '/policies?filter[name][_eq]=Learner');
  if (!policy) {
    policy = await api('POST', '/policies', { name: 'Learner', icon: 'school', app_access: false, admin_access: false, description: 'Alumnos de Memora' });
    console.log('+ policy Learner');
  }
  let [role] = await api('GET', '/roles?filter[name][_eq]=Learner');
  if (!role) {
    role = await api('POST', '/roles', { name: 'Learner', icon: 'school', policies: [{ policy: policy.id }] });
    console.log('+ rol Learner');
  }

  // Reemplaza por completo los permisos de la policy para que el script sea reproducible.
  const old = await api('GET', `/permissions?filter[policy][_eq]=${policy.id}&limit=-1`);
  if (old.length) await api('DELETE', '/permissions', old.map((p) => p.id));

  const mine = { user: { _eq: '$CURRENT_USER' } };
  const perms = [];
  const add = (collection, action, permissions = {}, extra = {}) =>
    perms.push({ policy: policy.id, collection, action, permissions, validation: {}, presets: {}, fields: ['*'], ...extra });

  add('words', 'read');
  add('irregular_verbs', 'read');
  add('directus_files', 'read');
  add('mnemonics', 'read', { _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }] });
  add('mnemonics', 'create', {}, { presets: { owner: '$CURRENT_USER', source: 'user' }, validation: { owner: { _eq: '$CURRENT_USER' } } });
  add('mnemonics', 'update', { owner: { _eq: '$CURRENT_USER' } }, { validation: { owner: { _eq: '$CURRENT_USER' } } });
  add('mnemonics', 'delete', { owner: { _eq: '$CURRENT_USER' } });
  for (const c of ['progress', 'attempts', 'study_days', 'sentences', 'verb_progress', 'profiles', 'mnemonic_feedback', 'pilot_reports', 'personal_vocabulary']) {
    for (const action of ['create', 'read', 'update', 'delete']) add(c, action, action === 'create' ? {} : mine);
  }
  add('directus_users', 'read', { id: { _eq: '$CURRENT_USER' } }, { fields: ['id', 'email', 'first_name', 'last_name', 'role'] });
  add('directus_users', 'update', { id: { _eq: '$CURRENT_USER' } }, { fields: ['first_name', 'last_name', 'password'] });

  await api('POST', '/permissions', perms);
  console.log(`= ${perms.length} permisos para Learner`);
  return role;
}

async function main() {
  await ensureCollections();
  await ensureRelations();
  const role = await ensureLearnerRole();
  await api('PATCH', '/settings', {
    project_name: 'Memora',
    public_registration: process.env.PUBLIC_REGISTRATION !== 'false',
    public_registration_role: role.id,
    public_registration_verify_email: false,
  });
  console.log('✓ Esquema listo (registro público activado con rol Learner)');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
