import { readFileSync } from 'node:fs';
import { parse } from 'postcss';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../src/components/playFlow.css', import.meta.url), 'utf8');
const sheet = parse(source);
const tokens = (selector, inherited = {}, sourceSheet = sheet) => {
  const result = { ...inherited };
  sourceSheet.walkRules(selector, (rule) => rule.nodes.forEach((node) => { if (node.type === 'decl') result[node.prop] = node.value; }));
  return result;
};
const rgb = (hex) => hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
const luminance = (color) => color.map((value) => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const ratio = (a, b) => { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + .05) / (dark + .05); };
it('también conserva contraste de texto y feedback en cada escena del nuevo Play, sin bajar el umbral', () => {
  const zero = parse(readFileSync(new URL('../src/components/zeroJourney.css', import.meta.url), 'utf8'));
  const light = tokens('.zero-journey', {}, zero), dark = tokens(":root[data-appearance='dark'] .zero-journey", light, zero);
  for (const mode of ['light','dark']) {
    for (const phase of ['', '.zero-winter', '.zero-rejection', '.zero-door', '.zero-journey.zero-arcade']) {
      const selector = phase ? `${mode === 'dark' ? ":root[data-appearance='dark'] " : ''}${phase}` : '';
      const values = selector ? tokens(selector, mode === 'dark' ? dark : light, zero) : mode === 'dark' ? dark : light;
      const states = tokens(mode === 'dark' ? ":root[data-appearance='dark'] .zero-card" : '.zero-journey .zero-card', {}, zero);
      for (const background of ['--page','--zero-glow','--surface-strong','--surface-soft']) {
        for (const [foreground,value] of Object.entries({ ...Object.fromEntries(['--ink','--muted','--accent-ink','--zero-mint','--warm','--grammar-subject','--grammar-verb'].map((key) => [key,values[key]])), ...Object.fromEntries(Object.entries(states).filter(([key]) => key.startsWith('--task-'))) })) {
          expect(ratio(rgb(value),rgb(values[background])), `${mode}/${phase}/${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  }
});
it('mantiene legibles texto, apoyo y acción en todos los extremos del escenario claro y oscuro', () => {
  const light = tokens('.game-screen.play-flow');
  const dark = tokens(":root[data-appearance='dark'] .game-screen.play-flow", light);
  for (const mode of ['light', 'dark']) {
    for (const phase of ['associate', 'grammar', 'build', 'conversation', 'arcade']) {
      const base = mode === 'light' ? light : dark;
      const selector = mode === 'light' ? `.game-screen.play-flow[data-play-tone='${phase}']` : `:root[data-appearance='dark'] .play-flow[data-play-tone='${phase}']`;
      const values = tokens(selector, base);
      const states = tokens(mode === 'light' ? '.play-flow .game-card-anchor' : ":root[data-appearance='dark'] .play-flow .game-card-anchor");
      for (const background of ['--page', '--play-glow', '--play-glow-secondary', '--surface-strong', '--surface-soft']) {
        for (const [foreground, value] of Object.entries({ ...Object.fromEntries(['--ink', '--muted', '--accent-ink'].map((key) => [key, values[key]])), ...states })) {
          expect(ratio(rgb(value), rgb(values[background])), `${mode}/${phase}/${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  }
});
it('mantiene superficies transparentes, espacio de avance estable y movimiento reducido sin bucles decorativos', () => {
  expect(tokens('.play-flow .game-card-face').background).toBe('transparent');
  expect(tokens('.play-flow .card-vertical-scroll').background).toBe('transparent');
  expect(tokens('.play-flow .card-vertical-next, .play-flow .card-vertical-rest')['min-height']).toBe('calc(58px + env(safe-area-inset-bottom))');
  expect(tokens('.play-flow :is(.recall-choices, .memory-options, .coach-options) button')['min-height']).toBe('68px');
  sheet.walkDecls('animation', (decl) => {
    // The pre-existing busy-audio spinner is status, not a decorative loop.
    if (decl.parent.selector !== ".round-audio[aria-busy='true']::after") expect(decl.value).not.toContain('infinite');
  });
  let reduced;
  sheet.walkAtRules('media', (rule) => { if (rule.params === '(prefers-reduced-motion: reduce)') reduced = rule; });
  const rules = [];
  reduced.walkDecls((decl) => rules.push(`${decl.prop}:${decl.value}`));
  expect(rules).toContain('transition:none'); expect(rules).toContain('animation:none');
});
