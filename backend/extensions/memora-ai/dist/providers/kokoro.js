// Adaptador para cualquier servidor Kokoro compatible con OpenAI /v1/audio/speech.
// Se mantiene fuera del frontend: la URL y cualquier clave nunca se exponen al navegador.
export function kokoroTts(env) {
  const base = String(env.KOKORO_TTS_URL || '').replace(/\/$/, '');
  const key = String(env.KOKORO_TTS_API_KEY || '');
  return {
    name: 'kokoro',
    enabled: Boolean(base),
    async generate(text, { voice, rate } = {}) {
      if (!base) throw new Error('KOKORO_TTS_URL no está configurado');
      const headers = { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60_000);
      try {
        const res = await fetch(`${base}/v1/audio/speech`, {
          method: 'POST', headers,
          body: JSON.stringify({ model: env.KOKORO_TTS_MODEL || 'kokoro', input: text, voice: voice || env.KOKORO_TTS_VOICE || 'af_heart', response_format: 'mp3', speed: Number(rate) || 1 }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Kokoro TTS ${res.status}`);
        const type = res.headers.get('content-type') || 'audio/mpeg';
        return { buffer: Buffer.from(await res.arrayBuffer()), type: type.split(';')[0] };
      } finally { clearTimeout(timer); }
    },
  };
}
