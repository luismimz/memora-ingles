import { expect, it } from 'vitest';
import { parse } from 'postcss';
import { readFileSync } from 'node:fs';

it('movimiento reducido muestra el modelo final y las capas comparten espacio sin saltos de altura', () => {
  const root = parse(readFileSync(new URL('./grammarComparison.css', import.meta.url), 'utf8'));
  const declarations = (selector, parent) => {
    const values = {};
    (parent ?? root).walkRules(selector, (rule) => rule.walkDecls((decl) => { values[decl.prop] = decl.value; }));
    return values;
  };
  expect(declarations('.comparison-source, .comparison-joined')).toMatchObject({ 'grid-area': '1 / 1' });
  let reduced;
  root.walkAtRules('media', (rule) => { if (rule.params === '(prefers-reduced-motion: reduce)') reduced = rule; });
  expect(reduced).toBeTruthy();
  expect(declarations('.coach-comparison .comparison-changed, .comparison-source, .comparison-joined', reduced)).toMatchObject({ animation: 'none', transform: 'none' });
  expect(declarations('.comparison-source', reduced)).toMatchObject({ visibility: 'hidden' });
  expect(declarations('.comparison-joined', reduced)).toMatchObject({ opacity: '1' });
});
