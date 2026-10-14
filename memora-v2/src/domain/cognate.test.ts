import { describe, expect, it } from 'vitest';
import { validateAssociationQuality } from './unit';
describe('cognados sin asociaciones inventadas', () => {
  const word = { en: 'INFORMATION', es: 'información', bridge: '', associationMode: 'cognate', scene: 'INFORMATION → información', cognateEvidence: { sameMeaning: true, note: 'Información en ambas lenguas; en inglés es incontable.' }, usageExample: { en: 'I need information.', es: 'Necesito información.' } };
  it('acepta la pareja clara y no exige microhistoria', () => {
    const result = validateAssociationQuality(word);
    expect(result.automatedGate).toBe('pass');
    expect(result.checks.find((check) => check.rule === 'scene_length')?.status).toBe('not_applicable');
  });
  it('no admite fingir un puente ni omitir comprobación semántica', () => {
    expect(validateAssociationQuality({ ...word, bridge: 'INFORMACIÓN' }).automatedGate).toBe('blocked');
    expect(validateAssociationQuality({ ...word, cognateEvidence: undefined }).automatedGate).toBe('blocked');
    expect(validateAssociationQuality({ ...word, usageExample: undefined }).automatedGate).toBe('blocked');
  });
});
