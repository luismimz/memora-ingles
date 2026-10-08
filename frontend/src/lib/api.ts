// Cliente mínimo para la API REST de Directus con refresco automático del token.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const KEY = 'memora.auth';

interface Tokens { access_token: string; refresh_token: string; expires_at: number }

function load(): Tokens | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(t: Tokens | null) {
  try { t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY); } catch { /* modo privado */ }
}

let tokens: Tokens | null = load();
let refreshing: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function setTokens(d: { access_token: string; refresh_token: string; expires: number }) {
  tokens = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires - 15_000 };
  save(tokens);
}

async function refresh(): Promise<boolean> {
  if (!tokens?.refresh_token) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens!.refresh_token, mode: 'json' }),
      });
      if (!res.ok) { tokens = null; save(null); return false; }
      setTokens((await res.json()).data);
      return true;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

export const isLoggedIn = () => Boolean(tokens);
export const assetUrl = (id: string, params = 'width=640&quality=80') =>
  `${BASE}/assets/${id}?${params}${tokens ? `&access_token=${tokens.access_token}` : ''}`;

export async function request<T = unknown>(method: string, path: string, body?: unknown, retry = true, signal?: AbortSignal): Promise<T> {
  if (tokens && Date.now() > tokens.expires_at) await refresh();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(tokens ? { authorization: `Bearer ${tokens.access_token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (res.status === 401 && retry && tokens && (await refresh())) return request(method, path, body, false, signal);
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.error || `Error ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return (json.data !== undefined ? json.data : json) as T;
}

export async function login(email: string, password: string) {
  const d = await request<{ access_token: string; refresh_token: string; expires: number }>('POST', '/auth/login', { email, password });
  setTokens(d);
}

export async function register(email: string, password: string, first_name: string) {
  await request('POST', '/users/register', { email, password, first_name });
  await login(email, password);
}

export async function logout() {
  try { if (tokens) await request('POST', '/auth/logout', { refresh_token: tokens.refresh_token, mode: 'json' }); } catch { /* da igual */ }
  tokens = null; save(null);
}

// Azúcar para colecciones
const q = (params: Record<string, unknown>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) s.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const items = {
  list: <T>(c: string, params: Record<string, unknown> = {}) => request<T[]>('GET', `/items/${c}${q({ limit: -1, ...params })}`),
  create: <T>(c: string, data: unknown) => request<T>('POST', `/items/${c}`, data),
  update: <T>(c: string, id: number | string, data: unknown) => request<T>('PATCH', `/items/${c}/${id}`, data),
  updateMany: <T>(c: string, data: unknown[]) => request<T[]>('PATCH', `/items/${c}`, data),
  remove: (c: string, id: number | string) => request('DELETE', `/items/${c}/${id}`),
};

export const ai = <T>(path: string, body: Record<string, unknown>) => request<T>('POST', `/memora/${path}`, body);

export interface SpeechAsset {
  file: string;
  url: string;
  cached: boolean;
  requestMs: number;
  voice: string | null;
  rate: number;
}

let naturalSettings = { voice: null as string | null, rate: 0.88 };
export const configureNaturalSpeech = (voice: string | null, rate: number) => {
  naturalSettings = { voice, rate: Number.isFinite(rate) ? rate : 0.88 };
};

const pendingSpeech = new Map<string, Promise<SpeechAsset | null>>();
const resolvedSpeech = new Map<string, string>();

export async function naturalSpeechAsset(text: string, opts: { voice?: string | null; rate?: number; refresh?: boolean } = {}): Promise<SpeechAsset | null> {
  const preferredVoice = opts.voice === undefined ? naturalSettings.voice : opts.voice;
  const rate = opts.rate ?? naturalSettings.rate;
  const key = JSON.stringify({ text, voice: preferredVoice || undefined, rate });
  if (tokens && Date.now() > tokens.expires_at) await refresh();
  const cachedFile = !opts.refresh ? resolvedSpeech.get(key) : undefined;
  if (cachedFile) return { file: cachedFile, url: assetUrl(cachedFile, 'download=0'), cached: true, requestMs: 0, voice: preferredVoice, rate };
  const current = pendingSpeech.get(key);
  if (current) return current;
  const run = (async () => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30_000);
    const started = performance.now();
    try {
      const out = await request<{ available: boolean; file?: string; cached?: boolean }>('POST', '/memora/speech', { text, voice: preferredVoice, rate }, true, ctrl.signal);
      if (!out.available || !out.file) return null;
      resolvedSpeech.set(key, out.file);
      return {
        file: out.file,
        url: assetUrl(out.file, 'download=0'),
        cached: Boolean(out.cached),
        requestMs: Math.round(performance.now() - started),
        voice: preferredVoice,
        rate,
      };
    } finally { window.clearTimeout(timer); }
  })();
  pendingSpeech.set(key, run);
  try { return await run; } finally { if (pendingSpeech.get(key) === run) pendingSpeech.delete(key); }
}

export async function naturalSpeech(text: string, opts: { voice?: string | null; rate?: number } = {}) {
  return (await naturalSpeechAsset(text, opts))?.url ?? null;
}

export async function naturalVoices() {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 2500);
  try { return await request<{ provider: string; voices: { id: string; name: string }[] }>('GET', '/memora/voices', undefined, true, ctrl.signal); }
  finally { window.clearTimeout(timer); }
}
