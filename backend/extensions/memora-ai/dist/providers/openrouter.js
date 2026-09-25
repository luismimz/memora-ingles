// OpenRouter: LLM (cualquier modelo, incluidos los ":free") e imágenes con modelos que las generan.
import { fetchJson } from './http.js';

const base = (env) => String(env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const headers = (env) => ({
  authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  'content-type': 'application/json',
  'HTTP-Referer': env.PUBLIC_URL || 'http://localhost',
  'X-Title': 'Memora',
});

export function extractJson(text) {
  const start = text.search(/[[{]/);
  if (start < 0) throw new Error('La IA no devolvió JSON');
  const close = text[start] === '{' ? '}' : ']';
  return JSON.parse(text.slice(start, text.lastIndexOf(close) + 1));
}

export function openRouterLlm(env) {
  const models = String(env.OPENROUTER_MODELS || env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1').split(',').map((s) => s.trim()).filter(Boolean);
  const defaultModel = env.OPENROUTER_MODEL || models[0];
  return {
    name: 'openrouter',
    enabled: Boolean(env.OPENROUTER_API_KEY),
    models,
    defaultModel,
    async json(messages, { model, temperature = 0.8 } = {}) {
      const body = await fetchJson(`${base(env)}/chat/completions`, {
        method: 'POST', headers: headers(env),
        body: JSON.stringify({ model: models.includes(model) ? model : defaultModel, messages, temperature, response_format: { type: 'json_object' } }),
      }, { timeout: 90000 });
      return extractJson(body.choices?.[0]?.message?.content ?? '');
    },
  };
}

export function openRouterImage(env) {
  return {
    name: 'openrouter',
    async generate(prompt) {
      const body = await fetchJson(`${base(env)}/chat/completions`, {
        method: 'POST', headers: headers(env),
        body: JSON.stringify({ model: env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image', modalities: ['image', 'text'], messages: [{ role: 'user', content: prompt }] }),
      }, { timeout: 120000 });
      const url = body.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url?.startsWith('data:')) throw new Error('El modelo no devolvió imagen');
      const [meta, b64] = url.split(',');
      return { buffer: Buffer.from(b64, 'base64'), type: meta.slice(5, meta.indexOf(';')) || 'image/png' };
    },
  };
}
