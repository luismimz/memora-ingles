import { describe, expect, it } from 'vitest';
import { phrasalFamilies, validatePhrasalFamilies } from './phrasalFamilies';
describe('fusión editorial por familias', () => {
  it('reutiliza puentes españoles y distingue el sentido del ejemplo', () => {
    expect(() => validatePhrasalFamilies(phrasalFamilies)).not.toThrow();
    expect(phrasalFamilies.flatMap((family) => family.discoveries)).toHaveLength(20);
    const result = phrasalFamilies[0].discoveries.find((entry) => entry.particle === 'OUT')!;
    expect(result.meaning).toBe('salir / resultar (bien)');
    expect(result.translation).toBe('Salió bien.');
    expect(phrasalFamilies.every((family) => family.word.status === 'needs_review')).toBe(true);
  });
  it('rechaza duplicados o historias que pierden la asociación madre', () => {
    expect(() => validatePhrasalFamilies([phrasalFamilies[0], phrasalFamilies[0]])).toThrow();
    expect(() => validatePhrasalFamilies([{ ...phrasalFamilies[0], discoveries: [{ ...phrasalFamilies[0].discoveries[0], association: 'Un interruptor se enciende.' }] }])).toThrow();
  });
});
