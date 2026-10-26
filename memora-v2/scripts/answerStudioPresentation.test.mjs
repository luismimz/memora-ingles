import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../src/components/answerStudio.css', import.meta.url), 'utf8'));
const declarations = (selector) => {
  const values = {};
  css.walkRules(selector, (rule) => rule.walkDecls((decl) => { values[decl.prop] = decl.value; }));
  return values;
};
it('la guía se muestra al escribir sin retirar su espacio ni duplicar la franja de idiomas', () => {
  const idle = declarations('.answer-studio-status');
  expect(idle.opacity).toBe('0');
  expect(idle.display).toBeUndefined();
  expect(idle.visibility).toBeUndefined();
  expect(idle.position).toBeUndefined();
  expect(declarations('.answer-studio:focus-within .answer-studio-status').opacity).toBe('1');
  expect(declarations('.answer-studio form').margin).toBe('0');
  expect(css.toString()).not.toContain('answer-studio-direction');
});
it('la consigna no hereda separación/alineación de formularios de otros juegos', () => {
  const label = declarations('.answer-studio > .answer-studio-instruction');
  expect(label.margin).toBe('0');
  expect(label['text-align']).toBe('center');
  expect(label.color).toBe('var(--muted)');
});
it('el chat vertical no combina altura limitada con mensajes que desbordan sobre el campo', () => {
  expect(declarations('.chat-card:has(.answer-studio) .chat-log')['max-height']).toBeUndefined();
  expect(declarations('.chat-card:not(.card-vertical):has(.answer-studio) .chat-log')['max-height']).toBe('160px');
});
