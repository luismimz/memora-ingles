// Núcleo del método de la palabra clave. Solo depende de las interfaces de proveedores y de shared/phonetics.
//
//   1. Pronunciación inglesa REAL (CMU vía proveedor) -> fonemas y sílaba fuerte.
//   2. Candidatas españolas que suenan parecido (proveedor) -> filtro fonético objetivo (scoreKeyword).
//   3. El LLM elige la más visualizable y escribe UNA escena interactiva (la palabra puente HACE el significado).
//   4. Se vuelve a puntuar la elegida: si no supera el criterio fonético se fuerza la mejor candidata.
import {
  arpabetPhones, englishPhones, render, scoreKeyword, spanishRespelling, stressedFocus, WEAK,
} from '../../../../../shared/phonetics.mjs';
import { isConciseMnemonic } from '../../../../../shared/mnemonicQuality.mjs';

const RULES = `Método de la palabra clave (Atkinson) para hispanohablantes de España. Reglas OBLIGATORIAS:
1. La palabra puente es una palabra o nombre ESPAÑOL, CONCRETO y fácil de VISUALIZAR (objeto, animal, persona, personaje conocido). Nada de interjecciones ni ideas abstractas.
2. Debe SONAR como la sílaba fuerte de la palabra inglesa real (se te da la transcripción). Prefiere las candidatas con mejor puntuación fonética.
3. La escena es UNA sola imagen en la que la palabra puente REALIZA o SUFRE el significado. Sin historia alrededor.
4. MÁXIMO 12 PALABRAS. Una frase y una acción. Elimina todo adjetivo, lugar, peligro, persecución o personaje que no conecte sonido y significado.
5. Escribe la PALABRA PUENTE y el SIGNIFICADO en MAYÚSCULAS dentro de la escena.
6. No uses paréntesis ni expliques la palabra puente. No empieces con «¡Cuidado!», «Imagina» o «De repente».
7. story_en: la misma imagen en inglés A2, también en una sola frase corta, con la palabra inglesa en MAYÚSCULAS.
8. Modelo correcto: borrow / BURRO / pedir prestado → «Un BURRO te PIDE PRESTADO el móvil.»
9. Modelo correcto: hang / JUAN / colgar → «JUAN CUELGA tu mochila.» Nunca: «Un gigante Juan te persigue para colgarla».
10. emoji: 2 emojis que dibujen únicamente la palabra puente y la acción.`;

/** Datos fonéticos de una palabra (usa el arpabet guardado o lo pide al proveedor). */
export async function phoneticsFor(word, providers, save) {
  let arpabet = word.arpabet;
  if (!arpabet && !word.en.includes(' ')) {
    try { arpabet = (await providers.pronunciation.lookup(word.en)).arpabet; } catch { /* sin conexión: IPA de respaldo */ }
    if (arpabet && save) await save({ arpabet });
  }
  const phones = arpabet ? arpabetPhones(arpabet) : englishPhones(word);
  const focus = stressedFocus(phones);
  return { arpabet, phones, focus, focusText: render(focus) };
}

/** Candidatas puntuadas, de mejor a peor (sin IA: gratis). */
export async function scoredCandidates(ph, providers, { avoid = [] } = {}) {
  if (!ph.phones.length) return [];
  const raw = await providers.candidates.candidates([spanishRespelling(ph.phones), spanishRespelling(ph.focus)]);
  const bad = new Set(avoid.map((a) => String(a).toLowerCase()));
  return raw
    .filter((c) => c.word.length >= 3 && !bad.has(c.word.toLowerCase()))
    .map((c) => ({ ...c, ...scoreKeyword(ph.phones, c.word) }))
    .filter((c) => c.score >= WEAK && c.freq >= 0.3)
    // sustantivos frecuentes primero (se visualizan), luego por sonido
    .sort((a, b) => (b.score + (b.noun ? 0.08 : 0) + Math.min(b.freq, 50) / 500) - (a.score + (a.noun ? 0.08 : 0) + Math.min(a.freq, 50) / 500))
    .slice(0, 12);
}

const describe = (w, ph, cands) => ({
  id: w.id, en: w.en, es: w.es, pos: w.pos,
  pronunciacion_real: w.ipa || ph.arpabet || '',
  silaba_fuerte: ph.focusText,
  candidatas: cands.map((c) => `${c.word} (${Math.round(c.score * 100)}%${c.noun ? ', sustantivo' : ''})`),
});

/**
 * Genera asociaciones para varias palabras con UNA llamada al LLM (barato) y las valida fonéticamente.
 * @returns {Promise<Array<{word:number, keyword, scene_es, story_en, emoji, phon_score, focus}>>}
 */
export async function generateKeywordMnemonics(words, providers, { model, avoid = {}, fixedKeywords = {}, saveWord } = {}) {
  const prepared = [];
  for (const w of words) {
    const ph = await phoneticsFor(w, providers, saveWord ? (patch) => saveWord(w.id, patch) : null);
    const cands = await scoredCandidates(ph, providers, { avoid: avoid[w.id] ?? [] }).catch(() => []);
    prepared.push({ w, ph, cands });
  }
  const out = await providers.llm.json([
    { role: 'system', content: `${RULES}\nResponde SOLO JSON: {"items":[{"id":0,"keyword":"","scene_es":"","story_en":"","emoji":""}]}` },
    { role: 'user', content: JSON.stringify(prepared.map(({ w, ph, cands }) => ({ ...describe(w, ph, cands), palabra_puente_obligatoria: fixedKeywords[w.id] || undefined, evita: avoid[w.id] ?? [] }))) },
  ], { model, temperature: 0.8 });

  const results = [];
  for (const { w, ph, cands } of prepared) {
    let it = (out.items || []).find((x) => Number(x.id) === w.id);
    const fixedKeyword = fixedKeywords[w.id];
    if (fixedKeyword) it = { ...(it || {}), keyword: fixedKeyword };
    if (!it?.keyword) continue;
    let sc = scoreKeyword(ph.phones, it.keyword);
    // Criterio fonético: si la elegida no llega, se rehace con la mejor candidata.
    if (!fixedKeyword && sc.score < WEAK && cands[0]) {
      const forced = await providers.llm.json([
        { role: 'system', content: `${RULES}\nLa palabra puente es OBLIGATORIAMENTE "${cands[0].word}". Responde SOLO JSON: {"keyword":"","scene_es":"","story_en":"","emoji":""}` },
        { role: 'user', content: JSON.stringify(describe(w, ph, cands.slice(0, 1))) },
      ], { model, temperature: 0.7 });
      it = { ...forced, keyword: cands[0].word };
      sc = scoreKeyword(ph.phones, it.keyword);
    }
    for (let attempt = 0; attempt < 2 && !isConciseMnemonic(it); attempt++) {
      const concise = await providers.llm.json([
        { role: 'system', content: `${RULES}\nREESCRIBE, no cambies la palabra puente «${it.keyword}». Si sobra una palabra, bórrala. Devuelve SOLO JSON: {"scene_es":"","story_en":"","emoji":""}` },
        { role: 'user', content: JSON.stringify({ en: w.en, significado: w.es, keyword: it.keyword, scene_es_mala: it.scene_es, story_en_mala: it.story_en }) },
      ], { model, temperature: 0.15 });
      it = { ...it, ...concise, keyword: it.keyword };
    }
    // Una salida que no pasa la regla nunca llega a la base de datos.
    if (!isConciseMnemonic(it)) continue;
    results.push({
      word: w.id, keyword: it.keyword, scene_es: it.scene_es, story_en: it.story_en, emoji: it.emoji,
      phon_score: sc.score, focus: ph.focusText,
    });
  }
  return results;
}
