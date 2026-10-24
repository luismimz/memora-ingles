import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); }
it.each(['light', 'dark'])('la paleta %s mantiene contraste de texto, acción y foco sin depender solo del color', (mode) => {
  const block = mode === 'light' ? css.match(/:root\s*\{([^}]+)\}/)[1] : css.match(/:root\[data-appearance='dark'\]\s*\{([^}]+)\}/)[1];
  const tokens = Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[a-f\d]{6})/gi)].map((match) => [match[1], match[2]]));
  for (const surface of ['--page', '--surface-strong', '--surface-soft']) {
    expect(contrast(tokens['--ink'], tokens[surface])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--muted'], tokens[surface])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--accent-ink'], tokens[surface])).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(tokens['--page'], tokens['--accent-ink'])).toBeGreaterThanOrEqual(4.5);
});
