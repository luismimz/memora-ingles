import { describe, expect, it } from 'vitest';
import world1Extra from '../../content/world1-extra.json';
import kitchenExtra from '../../content/world1-kitchen-extra.json';
import bedroomExtra from '../../content/world1-bedroom-extra.json';
import { validateAssociationQuality, validateUnit } from './unit';

describe('nuevas escenas de La Casa Viva', () => {
  it.each([...world1Extra, kitchenExtra, bedroomExtra])('$title conserva el ciclo completo y asociaciones revisables', (raw) => {
    const unit = validateUnit(raw);
    expect(unit.location?.world).toBe('world1');
    expect(unit.words).toHaveLength(3);
    expect(unit.grammar).toHaveLength(1);
    expect(unit.communication?.dialogue?.turns).toHaveLength(2);
    for (const word of unit.words) {
      expect(validateAssociationQuality(word).automatedGate).toBe('pass');
      expect(word.bridgeEvidence?.spanishCue).toBe(word.bridge);
      expect(unit.sentence.en.toLowerCase().includes(word.en.toLowerCase()) || unit.grammar.some((form) =>
        form.englishBase?.toUpperCase() === word.en && unit.sentence.en.toLowerCase().includes(form.english))).toBe(true);
    }
  });
});
