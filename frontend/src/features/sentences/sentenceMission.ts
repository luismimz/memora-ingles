/**
 * Contrato del contenido que llega desde Directus para el constructor.
 *
 * Este archivo no contiene palabras, escenas ni frases de ejemplo. Solo
 * valida/adapta el registro de `words` para que la UI pueda trabajar con un
 * modelo estable. Directus es la fuente única de verdad.
 */
export interface SentenceMission {
  id: string;
  promptEs: string;
  targetSentenceEs: string;
  targetSentenceEn: string;
  /** Se conserva como array para admitir futuras variantes de Directus. */
  acceptedSentences: string[];
  correctWords: string[];
  distractors: string[];
  context: string;
  sourceWord: string;
  bridgeEs: string;
  pronunciation?: string;
  xp?: number;
  illustration?: string;
  rarity?: 'common' | 'rare' | 'legendary';
}

export interface MissionWord {
  en: string;
  es: string;
  ipa?: string | null;
  bridge_word?: string | null;
  scene_es?: string | null;
  target_sentence_es?: string | null;
  target_sentence_en?: string | null;
  distractor?: string | null;
  irregular_forms?: { v1?: string; v2?: string; v3?: string } | null;
}

const MIN_SENTENCE_WORDS = 5;
const MAX_SENTENCE_WORDS = 24;

/**
 * Convierte exclusivamente un registro enriquecido de Directus en misión.
 * Los registros incompletos devuelven null y la cola de Descubrir los omite.
 */
export function sentenceMissionFromWord(word: MissionWord): SentenceMission | null {
  const sentenceEs = word.target_sentence_es?.trim();
  const sentenceEn = word.target_sentence_en?.trim();
  const bridge = word.bridge_word?.trim();
  const scene = word.scene_es?.trim();
  const distractor = word.distractor?.trim();
  if (!sentenceEs || !sentenceEn || !bridge || !scene || !distractor) return null;

  const correctWords = tokenize(sentenceEn);
  if (correctWords.length < MIN_SENTENCE_WORDS || correctWords.length > MAX_SENTENCE_WORDS) return null;

  if (!sentenceContainsSource(sentenceEn, word.en, word.irregular_forms)) return null;

  return {
    id: `word-${slug(word.en)}`,
    promptEs: sentenceEs,
    targetSentenceEs: sentenceEs,
    targetSentenceEn: sentenceEn,
    acceptedSentences: [sentenceEn],
    correctWords,
    distractors: [distractor],
    context: scene,
    sourceWord: word.en,
    bridgeEs: bridge,
    pronunciation: word.ipa ?? undefined,
    xp: 25,
  };
}

/**
 * A complete sentence may use a normal inflection (cry → cries, dig →
 * digging) or a common plural (tooth → teeth). Exact string matching made
 * valid Directus content disappear from the mission, so the validator works
 * with token-safe variants instead of accepting arbitrary substrings.
 */
export function sentenceContainsSource(
  sentence: string,
  source: string,
  irregularForms: { v1?: string; v2?: string; v3?: string } | null | undefined = null,
) {
  const sentenceTokens = normalize(sentence).split(/\s+/).filter(Boolean);
  const forms = [source, ...Object.values(irregularForms ?? {}), ...commonInflections(source)]
    .filter(Boolean)
    .flatMap((value) => {
      const normalized = normalize(String(value));
      return normalized ? [normalized] : [];
    });
  return forms.some((form) => {
    const formTokens = form.split(/\s+/).filter(Boolean);
    if (!formTokens.length) return false;
    return sentenceTokens.some((_, index) => formTokens.every((token, offset) => sentenceTokens[index + offset] === token));
  });
}

function commonInflections(value: string) {
  const base = normalize(value);
  if (!base || base.includes(' ') || base.length < 3) return [];
  const variants = [base, `${base}s`, `${base}es`, `${base}ed`, `${base}ing`, `${base}'s`];
  if (base.endsWith('y')) {
    variants.push(`${base.slice(0, -1)}ies`, `${base.slice(0, -1)}ied`, `${base.slice(0, -1)}ying`);
  }
  if (base.endsWith('e')) {
    // Los verbos acabados en e conservan la e al formar el pasado regular:
    // move → moved, hire → hired. Para -ing sí se elimina: move → moving.
    variants.push(`${base}d`, `${base.slice(0, -1)}ing`);
  }
  // En verbos cortos con patrón consonante-vocal-consonante se duplica la
  // última consonante: dig → digging, stop → stopped/stopping.
  const last = base.at(-1) ?? '';
  const previous = base.at(-2) ?? '';
  const beforePrevious = base.at(-3) ?? '';
  if (isDoublableFinalConsonant(last, previous, beforePrevious)) {
    variants.push(`${base}${last}ed`, `${base}${last}ing`);
  }
  const irregularPlurals: Record<string, string> = {
    tooth: 'teeth', foot: 'feet', mouse: 'mice', child: 'children', person: 'people',
    man: 'men', woman: 'women', goose: 'geese',
  };
  if (irregularPlurals[base]) variants.push(irregularPlurals[base]);
  return variants;
}

function isDoublableFinalConsonant(last: string, previous: string, beforePrevious: string) {
  return Boolean(last && previous && beforePrevious)
    && /[^aeiou]/.test(last)
    && /[aeiou]/.test(previous)
    && /[^aeiou]/.test(beforePrevious)
    && !/[wxy]/.test(last);
}

function tokenize(value: string) {
  return value.match(/[A-Za-z]+(?:'[A-Za-z]+)?[!?.,]?/g) ?? [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
}
