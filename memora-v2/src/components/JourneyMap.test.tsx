import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyMap } from './JourneyMap';

describe('journey map navigation', () => {
  it('renders every mission, marks the actual position and preserves completed ones', () => {
    const units = Array.from({ length: 186 }, (_, i) => ({ id: `u-${i}`, title: `Misión ${i + 1}` }));
    const html = renderToStaticMarkup(<JourneyMap units={units} currentId="u-9" completedIds={new Set(['u-0', 'u-1'])} onOpen={() => {}} />);
    expect(html.match(/class="journey-map-node"/gu)).toHaveLength(186);
    expect(html.match(/aria-current="step"/gu)).toHaveLength(1);
    expect(html).toContain('Tu posición · parada 10 de 186');
    expect(html).toContain('Parada 10: Misión 10. Continúa aquí.');
    expect(html).toContain('Parada 1: Misión 1. Completada.');
    expect(html).toContain('Parada 186: Misión 186.');
    expect(html).not.toContain('misiones restantes');
    expect(html).toContain('tabindex="0"');
  });
});
