// Registro de proveedores. El núcleo solo usa estas interfaces; cada implementación se elige por variable de entorno.
//
// interface LlmProvider        { name; json(messages, opts?: {model?, temperature?}) -> Promise<object> }
// interface PronunciationProvider { name; lookup(en) -> Promise<{ arpabet: string|null }> }
// interface CandidateProvider  { name; candidates(respellings: string[]) -> Promise<{ word, freq, noun }[]> }
// interface ImageProvider      { name; generate(prompt) -> Promise<{ buffer: Buffer, type: string }> }
// interface SentenceProvider   { name; examples(en, limit) -> Promise<{ en, es }[]> }
//
// Para añadir otro (p. ej. ElevenLabs, Openverse, otro LLM), crea el archivo y regístralo aquí.
import { datamuseCandidates, datamusePronunciation } from './datamuse.js';
import { openRouterImage, openRouterLlm } from './openrouter.js';
import { pollinationsImage } from './pollinations.js';
import { tatoebaSentences } from './tatoeba.js';
import { kokoroTts } from './kokoro.js';
import { disabledTts } from './none.js';

const FACTORIES = {
  llm: { openrouter: openRouterLlm },
  pronunciation: { datamuse: datamusePronunciation },
  candidates: { datamuse: datamuseCandidates },
  image: { pollinations: pollinationsImage, openrouter: openRouterImage },
  sentences: { tatoeba: tatoebaSentences },
  tts: { none: disabledTts, kokoro: kokoroTts },
};

// Si Coolify ya tiene KOKORO_TTS_URL, no obligamos a duplicar la configuración
// con TTS_PROVIDER=kokoro. Solo se mantiene desactivado cuando no hay URL.
const DEFAULTS = { llm: 'openrouter', pronunciation: 'datamuse', candidates: 'datamuse', image: 'pollinations', sentences: 'tatoeba', tts: 'none' };

export function createProviders(env) {
  const out = {};
  for (const [kind, impls] of Object.entries(FACTORIES)) {
    const automaticTts = kind === 'tts' && env.KOKORO_TTS_URL ? 'kokoro' : DEFAULTS[kind];
    const name = String(env[`${kind.toUpperCase()}_PROVIDER`] || automaticTts).toLowerCase();
    const factory = impls[name];
    if (!factory) throw new Error(`Proveedor desconocido ${kind}=${name}. Disponibles: ${Object.keys(impls).join(', ')}`);
    out[kind] = factory(env);
  }
  return out;
}

export { fetchJson } from './http.js';
