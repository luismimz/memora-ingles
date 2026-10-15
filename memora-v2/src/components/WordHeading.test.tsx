import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WordHeading } from './WordHeading';

describe('responsive word heading', () => {
  it('keeps CONFIGURATION complete and sizes it against its card', () => {
    const html = renderToStaticMarkup(<WordHeading en="CONFIGURATION" es="configuración" />);
    expect(html).toContain('CONFIGURATION');
    expect(html).toContain('configuración');
    expect(html).toContain('9.62cqi');
    expect(html).toContain('lang="en"');
  });
  it('retains larger short words and a readable lower bound', () => {
    expect(renderToStaticMarkup(<WordHeading en="KEY" es="llave" />)).toContain('18.00cqi');
    expect(renderToStaticMarkup(<WordHeading en="" es="" />)).not.toContain('Infinity');
  });
});
