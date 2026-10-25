import { expect, it } from 'vitest';
import { parse } from 'postcss';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('./preparationNotice.css', import.meta.url), 'utf8');

it('preparación dispone contenido y acciones en columna, sin estirar verticalmente los botones', () => {
  const declarations = (selector) => {
    const values = {};
    parse(css).walkRules(selector, (rule) => { rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; }); });
    return values;
  };
  expect(declarations('.preparation-content')).toMatchObject({ display: 'flex', 'flex-direction': 'column', width: '100%', 'min-width': '0' });
  expect(declarations('.preparation-actions')).toMatchObject({ display: 'flex', 'flex-direction': 'column' });
  expect(declarations('.preparation-actions > button')).toMatchObject({ flex: '0 0 auto', height: 'auto', width: '100%', 'min-height': '48px', 'white-space': 'normal' });
});
