import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const unitFields = [
  ['id', 'string', { is_primary_key: true, is_nullable: false, is_unique: true }],
  ['status', 'string', { default_value: 'draft' }, { interface: 'select-dropdown', options: { choices: [{ text: 'Borrador', value: 'draft' }, { text: 'Publicada', value: 'published' }] } }],
  ['title', 'string'], ['content', 'json', {}, { interface: 'input-code', options: { language: 'json' } }],
  ['ux_verdict', 'string'], ['dropout_risk', 'integer'], ['ux_audit', 'json'], ['audit_model', 'string'], ['audited_at', 'timestamp'],
  ['curriculum_verdict', 'string'], ['curriculum_audit', 'json'], ['curriculum_audited_at', 'timestamp'],
];
const eventFields = [
  ['id', 'integer', { is_primary_key: true, is_nullable: false, is_unique: true, has_auto_increment: true }],
  ['event_key', 'string', { max_length: 64, is_unique: true, is_nullable: false }],
  ['user', 'uuid', { is_nullable: false }, { readonly: true }],
  ['course', 'string', { is_nullable: false }, { readonly: true }],
  ['event', 'json', {}, { interface: 'input-code', options: { language: 'json' }, readonly: true }],
  ['created_at', 'timestamp', {}, { special: ['date-created'], readonly: true }],
];
const definitions = [
  { collection: 'learning_units', icon: 'auto_stories', note: 'Contenido V2. Borradores hasta revisión y publicación explícita.', fields: unitFields },
  { collection: 'learning_events', icon: 'history', note: 'Intentos por usuario y curso. Sin acceso público ni lectura directa del alumno.', fields: eventFields },
];
const dataTypes = { string: 'character varying', integer: 'integer', json: 'json', uuid: 'uuid', timestamp: 'timestamp with time zone' };

export function proposeV2Schema(snapshot) {
  if (snapshot?.version !== 1 || !['postgres', 'pg'].includes(snapshot.vendor) || !Array.isArray(snapshot.collections) || !Array.isArray(snapshot.fields) || !Array.isArray(snapshot.relations)) throw new Error('Se necesita una instantánea válida del PostgreSQL de destino; no usar la base SQLite local.');
  const target = structuredClone(snapshot);
  const addedCollections = []; const addedFields = [];
  for (const definition of definitions) {
    const { collection } = definition;
    if (!target.collections.some((item) => item.collection === collection)) {
      target.collections.push({ collection, meta: { collection, icon: definition.icon, note: definition.note, hidden: false, singleton: false, accountability: 'all' }, schema: { name: collection } });
      addedCollections.push(collection);
    }
    for (const [name, type, schema = {}, meta = {}] of definition.fields) {
      // Existing fields are never rewritten, even if their shape differs.
      if (target.fields.some((item) => item.collection === collection && item.field === name)) continue;
      target.fields.push({ collection, field: name, type,
        meta: { collection, field: name, interface: type === 'string' ? 'input' : null, hidden: false, readonly: false, ...meta },
        schema: { name, table: collection, data_type: dataTypes[type], default_value: null, max_length: type === 'string' ? 255 : null, numeric_precision: type === 'integer' ? 32 : null, numeric_scale: type === 'integer' ? 0 : null, is_nullable: true, is_unique: false, is_indexed: false, is_primary_key: false, is_generated: false, generation_expression: null, has_auto_increment: false, foreign_key_table: null, foreign_key_column: null, ...schema },
      });
      addedFields.push(`${collection}.${name}`);
    }
  }
  return { target, addedCollections, addedFields };
}

// Only produces an additive proposal file. Does not connect to a database,
// apply changes, grant permissions, import content, or execute boot scripts.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || resolve(input) === resolve(output)) throw new Error('Uso: node plan-v2-schema.mjs snapshot-del-destino.json propuesta-nueva.json');
  const proposed = proposeV2Schema(JSON.parse(await readFile(input, 'utf8')));
  await writeFile(output, JSON.stringify(proposed.target, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ addedCollections: proposed.addedCollections, addedFields: proposed.addedFields, existingCollectionsChanged: 0, existingFieldsChanged: 0, deleted: 0, permissionsChanged: 0 }));
}
