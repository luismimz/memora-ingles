// Utilidad HTTP compartida por los proveedores.
/** fetch con timeout y reintento corto (las APIs gratuitas a veces tardan). */
export async function fetchJson(url, init = {}, { timeout = 12000, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      const body = await res.json();
      if (!res.ok) throw Object.assign(new Error(body?.error?.message || body?.message || `HTTP ${res.status}`), { status: res.status });
      return body;
    } catch (e) {
      if (attempt >= retries || (e.status && e.status < 500)) throw e;
    } finally { clearTimeout(t); }
  }
}
