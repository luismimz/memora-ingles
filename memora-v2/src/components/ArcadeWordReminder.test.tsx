import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArcadeWordReminder } from './ArcadeWordReminder';
import { vocabularyPreviewPacks } from '../preview/vocabularyPacks';
import { previewUnit } from '../preview/previewUnit';
describe('recordatorio según la ruta aprendida', () => {
  it('no inventa un puente o escena para un cognado', () => {
    const html = renderToStaticMarkup(<ArcadeWordReminder word={vocabularyPreviewPacks[0].words[0]} paused={false} />);
    expect(html).toContain('RECUERDA LA PALABRA');
    expect(html).not.toContain('RECUERDA EL PUENTE');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('pronunciación inglesa');
  });
  it('mantiene la historia y el puente de la asociación original', () => {
    const html = renderToStaticMarkup(<ArcadeWordReminder word={previewUnit.words[0]} paused={false} />);
    expect(html).toContain('RECUERDA EL PUENTE');
    expect(html).toContain('PLAYA');
    expect(html).toContain('role="img"');
  });
});
