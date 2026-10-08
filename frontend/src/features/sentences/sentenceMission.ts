export interface SentenceMission {
  id: string;
  promptEs: string;
  /** Todas las formulaciones naturales que el Constructor puede aceptar. */
  acceptedSentences: string[];
  correctWords: string[];
  distractors?: string[];
  context?: string;
  sourceWord?: string;
  xp?: number;
}

export const DEFAULT_SENTENCE_MISSION: SentenceMission = {
  id: 'borrow-charger',
  promptEs: 'Pide un cargador durante un minuto.',
  context: 'Usa la conexión que acabas de descubrir en una frase que sí podrías decir hoy.',
  sourceWord: 'borrow',
  acceptedSentences: [
    'Can I borrow your charger for a minute?',
    'Can I borrow a charger for a minute?',
  ],
  correctWords: ['Can', 'I', 'borrow', 'your', 'charger', 'for', 'a', 'minute?'],
  distractors: ['lend', 'the', 'phone'],
  xp: 25,
};

interface MissionWord {
  en: string;
  es: string;
  exampleEn?: string | null;
}

/** Crea una misión real a partir del ejemplo que ya conoce Memora. */
export function sentenceMissionFromWord(word: MissionWord): SentenceMission {
  const correctWords = tokenize(word.exampleEn);
  const hasSourceWord = correctWords.some((token) => normalize(token) === normalize(word.en));
  if (correctWords.length >= 3 && correctWords.length <= 14 && hasSourceWord) {
    const distractors = ['really', 'actually', 'please', 'the', 'a']
      .filter((token) => !correctWords.some((wordToken) => normalize(wordToken) === token))
      .slice(0, 3);
    return {
      id: `word-${slug(word.en)}`,
      promptEs: `Construye la frase de «${word.es}».`,
      context: 'No la copies de memoria: ordena las piezas y observa cómo funciona dentro de una frase real.',
      sourceWord: word.en,
      acceptedSentences: acceptedVariants(correctWords),
      correctWords,
      distractors,
      xp: 25,
    };
  }

  // Los datos antiguos pueden no tener ejemplo. Esta frase de respaldo es
  // gramatical y mantiene la palabra activa sin bloquear el recorrido.
  return {
    id: `word-${slug(word.en)}`,
    promptEs: `Di: «Recuerdo la palabra ${word.en}».`,
    context: 'La frase de respaldo mantiene viva la conexión hasta que haya un ejemplo real disponible.',
    sourceWord: word.en,
    acceptedSentences: ['I remember the word ' + `${word.en}.`],
    correctWords: ['I', 'remember', 'the', 'word', `${word.en}.`],
    distractors: ['really', 'actually', 'a'],
    xp: 20,
  };
}

function tokenize(value?: string | null) {
  return value?.match(/[A-Za-z]+(?:'[A-Za-z]+)?[!?.,]?/g) ?? [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[!?.,]/g, '');
}

function acceptedVariants(tokens: string[]) {
  const canonical = tokens.join(' ');
  const variants = [canonical];
  const yourIndex = tokens.findIndex((token) => normalize(token) === 'your');
  if (yourIndex >= 0) {
    const withoutPossessive = [...tokens];
    withoutPossessive[yourIndex] = 'a';
    variants.push(withoutPossessive.join(' '));
  }
  return [...new Set(variants)];
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
}
