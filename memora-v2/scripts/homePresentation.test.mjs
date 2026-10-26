import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/components/homeGuided.css', import.meta.url), 'utf8');
const rgb = (hex) => hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
const blend = (foreground, background) => { const values = rgb(foreground), alpha = values[3] / 255; return background.map((value, index) => value * (1 - alpha) + values[index] * alpha); };
const luminance = (values) => values.map((value) => { const component = value / 255; return component <= .04045 ? component / 12.92 : ((component + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); };
it('mantiene legibles texto y acción de portada incluso al superponer ambos brillos', () => {
  const block = css.match(/\.home-now \{([^}]+)\}/)[1];
  const background = block.split('background:')[1].split(';')[0];
  const colors = background.match(/#[a-f\d]{6,8}/gi);
  const surface = colors.slice(0, -1).reverse().reduce((result, color) => blend(color, result), rgb(colors.at(-1)));
  for (const color of ['#f4f7ff', '#bbcbdc', '#b9dccf']) {
    expect(css).toContain(`color: ${color}`);
    expect(contrast(rgb(color), surface)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(rgb('#142b2a'), rgb('#e3f3ed'))).toBeGreaterThanOrEqual(4.5);
});
it('no anima sin fin y respeta movimiento reducido sin ocultar contenido ni controles', () => {
  expect(css).not.toContain('infinite');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toMatch(/\.home-word-orbit > span, \.home-word-orbit svg, \.home-now h1 \{ animation: none; \}/);
  expect(css).toMatch(/\.home-now \.home-continue \{[^}]*min-height: 62px/);
});
