import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import register from '../extensions/memora-invitation/dist/index.js';

let transform;
register({ filter: (event, handler) => { assert.equal(event, 'email.send'); transform = handler; } }, {
  env: { EMAIL_FROM: 'no-reply@luismontalvan.com' },
});

test('brands native invitation without modifying secure URL or recipients', () => {
  const payload = {
    to: 'learner@example.invalid', subject: "You've been invited",
    template: { name: 'user-invitation', data: { url: 'https://example.invalid/admin/accept-invite?token=TEST_ONLY&a=1' } },
  };
  const result = transform(payload);
  assert.equal(result.to, payload.to);
  assert.equal(result.template, payload.template);
  assert.equal(result.subject, 'Tu aventura en Memora empieza aquí');
  assert.deepEqual(result.from, { name: 'Memora', address: 'no-reply@luismontalvan.com' });
  assert.ok(result.text.includes(payload.template.data.url));
  assert.equal(payload.from, undefined);
});
test('does not alter other mail', () => {
  for (const name of ['password-reset', 'user-registration', 'custom']) {
    const payload = { template: { name }, from: 'sender@example.invalid' };
    assert.equal(transform(payload), payload);
  }
});
test('keeps explicit sender address and subject', () => {
  const result = transform({ from: { name: 'Old', address: 'sender@example.invalid' }, subject: 'Invitación especial', template: { name: 'user-invitation' } });
  assert.equal(result.from.address, 'sender@example.invalid');
  assert.equal(result.subject, 'Invitación especial');
});
test('HTML retains escaped native URL, accessible text and no tracking assets', async () => {
  const html = await readFile(new URL('../templates/user-invitation.liquid', import.meta.url), 'utf8');
  assert.match(html, /lang="es"/);
  assert.match(html, /href="\{\{ url \| escape \}\}"/);
  assert.match(html, /Activar mi cuenta/);
  assert.doesNotMatch(html, /<script|<img|<form|\{\{ url \}\}/i);
  const tokens = [...html.matchAll(/\{\{(.*?)\}\}/g)].map((match) => match[1].trim());
  assert.ok(tokens.every((token) => token === 'url | escape'));
});
