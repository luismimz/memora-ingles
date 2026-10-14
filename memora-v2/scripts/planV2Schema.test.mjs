import { describe, expect, it } from 'vitest';
import { proposeV2Schema } from '../../backend/scripts/plan-v2-schema.mjs';

const baseline = { version: 1, vendor: 'postgres', directus: '11.17.4', collections: [{ collection: 'words', schema: { name: 'words' }, meta: { note: 'Conservar' } }], fields: [{ collection: 'words', field: 'id', type: 'uuid', schema: { name: 'id', is_primary_key: true } }], relations: [{ collection: 'words', field: 'owner', related_collection: 'directus_users' }] };
describe('propuesta mínima de esquema V2', () => {
  it('solo añade dos colecciones y 18 campos, sin modificar el esquema anterior', () => {
    const before = structuredClone(baseline);
    const proposal = proposeV2Schema(baseline);
    expect(baseline).toEqual(before);
    expect(proposal.addedCollections).toEqual(['learning_units', 'learning_events']);
    expect(proposal.addedFields).toHaveLength(18);
    expect(proposal.target.collections[0]).toEqual(before.collections[0]);
    expect(proposal.target.fields[0]).toEqual(before.fields[0]);
    expect(proposal.target.relations).toEqual(before.relations);
  });
  it('repetir el plan no duplica tablas ni campos', () => {
    const first = proposeV2Schema(baseline);
    const second = proposeV2Schema(first.target);
    expect(second.addedFields).toEqual([]); expect(second.addedCollections).toEqual([]);
    expect(second.target).toEqual(first.target);
  });
  it('rechaza copiar la estructura SQLite local sobre PostgreSQL', () => {
    expect(() => proposeV2Schema({ ...baseline, vendor: 'sqlite' })).toThrow('PostgreSQL de destino');
  });
});
