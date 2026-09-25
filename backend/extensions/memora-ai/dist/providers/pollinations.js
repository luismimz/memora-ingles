// Pollinations: generación de imágenes gratuita y sin clave.
export function pollinationsImage(env) {
  return {
    name: 'pollinations',
    async generate(prompt) {
      const seed = Math.floor(Math.random() * 1e6);
      const url = `${env.POLLINATIONS_URL || 'https://image.pollinations.ai/prompt'}/${encodeURIComponent(prompt)}?width=640&height=480&nologo=true&seed=${seed}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Pollinations ${res.status}`);
        const type = res.headers.get('content-type') || 'image/jpeg';
        if (!type.startsWith('image/')) throw new Error('Pollinations no devolvió una imagen');
        return { buffer: Buffer.from(await res.arrayBuffer()), type };
      } finally { clearTimeout(t); }
    },
  };
}
