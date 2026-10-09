// Adaptador para cualquier servidor Kokoro compatible con OpenAI /v1/audio/speech.
// Se mantiene fuera del frontend: la URL y cualquier clave nunca se exponen al navegador.
export function kokoroTts(env) {
  // Aceptamos tanto http://tts:8880 como http://tts:8880/v1. Evita la
  // regresión clásica `/v1/v1/audio/speech` al copiar la URL desde la
  // documentación de Kokoro.
  const base = String(env.KOKORO_TTS_URL || '').replace(/\/+$/, '').replace(/\/v1$/i, '');
  const apiBase = `${base}/v1`;
  const key = String(env.KOKORO_TTS_API_KEY || '');
  return {
    name: 'kokoro',
    enabled: Boolean(base),
    async voices() {
      if (!base) return [];
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4_000);
      try {
        const res = await fetch(`${apiBase}/audio/voices`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Kokoro voices ${res.status}`);
        const data = await res.json();
        return Array.isArray(data.voices) ? data.voices.map((v) => typeof v === 'string' ? { id: v, name: v } : { id: v.id, name: v.name || v.id }).filter((v) => v.id) : [];
      } finally { clearTimeout(timer); }
    },
    async generate(text, { voice, rate } = {}) {
      if (!base) throw new Error('KOKORO_TTS_URL no está configurado');
      const headers = { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20_000);
      try {
        const normalized = String(text)
          .replace(/\*\*/g, '')
          .replace(/\bAPI\b/g, 'A P I')
          .replace(/\bAI\b/g, 'A I')
          .replace(/([!?.,])(?=[A-Za-z])/g, '$1 ')
          .replace(/\s+/g, ' ')
          .trim();
        const fallbackVoice = env.KOKORO_TTS_VOICE || 'af_heart';
        const requestedVoice = voice || fallbackVoice;
        const requestAudio = (selectedVoice) => fetch(`${apiBase}/audio/speech`, {
          method: 'POST', headers,
          body: JSON.stringify({ model: env.KOKORO_TTS_MODEL || 'kokoro', input: normalized, voice: selectedVoice, response_format: 'mp3', speed: Number(rate) || 1 }),
          signal: ctrl.signal,
        });
        let res = await requestAudio(requestedVoice);
        // Perfiles antiguos guardaban voces del navegador (Samantha, Google…).
        // Si Kokoro no reconoce ese nombre, reintenta con su voz oficial.
        if (!res.ok && requestedVoice !== fallbackVoice && (res.status === 400 || res.status === 404 || res.status === 422)) {
          res = await requestAudio(fallbackVoice);
        }
        if (!res.ok) {
          const detail = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 180);
          throw new Error(`Kokoro TTS ${res.status}${detail ? `: ${detail}` : ''}`);
        }
        const type = res.headers.get('content-type') || 'audio/mpeg';
        return { buffer: Buffer.from(await res.arrayBuffer()), type: type.split(';')[0] };
      } finally { clearTimeout(timer); }
    },
  };
}
