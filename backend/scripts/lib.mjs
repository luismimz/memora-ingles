// Helpers compartidos por los scripts de setup/seed: login como admin y fetch contra la API de Directus.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// Carga ../.env sin dependencias (solo si las variables no vienen ya del entorno).
const envPath = join(here, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const URL_BASE = process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055';
let token = process.env.DIRECTUS_TOKEN || null;

export async function login() {
  if (token) return token;
  const res = await fetch(`${URL_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login fallido: ${JSON.stringify(body)}`);
  token = body.data.access_token;
  return token;
}

export async function api(method, path, data, { allowFail = false } = {}) {
  await login();
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    if (allowFail) return { error: body, status: res.status };
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data;
}
