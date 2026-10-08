import type { Word } from '../../types';

export type AlchemyTokenRole = 'primary' | 'distractor';

export interface AlchemyToken {
  id: string;
  label: string;
  role: AlchemyTokenRole;
}

export interface AlchemyChallenge {
  id: string;
  wordId: number;
  sourceKind: 'phrasal' | 'compound';
  targetEs: string;
  targetEn: string;
  tokens: AlchemyToken[];
  exampleEn: string | null;
  xp: number;
}

/**
 * Convierte una unidad real del catálogo en un reto de fusión.
 * Agrupamos todo lo que va después del primer verbo/palabra en la segunda
 * ficha para que incluso «run out of» conserve una interacción de dos piezas.
 */
export function alchemyChallengeFromWord(word: Word): AlchemyChallenge {
  const parts = word.en.trim().split(/\s+/).filter(Boolean);
  const left = parts[0] || word.en;
  const right = parts.slice(1).join(' ') || parts[0] || word.en;
  const sourceKind = word.kind === 'compound' ? 'compound' : 'phrasal';
  const distractorPool = sourceKind === 'compound'
    ? ['house', 'light', 'work', 'time', 'book', 'side']
    : ['up', 'down', 'on', 'off', 'back', 'out', 'over', 'away'];
  const distractors = distractorPool
    .filter((candidate) => candidate !== left.toLowerCase() && candidate !== right.toLowerCase())
    .slice(0, 2);

  return {
    id: `alchemy-${word.id}`,
    wordId: word.id,
    sourceKind,
    targetEs: word.es,
    targetEn: word.en,
    exampleEn: word.example_en,
    xp: 20,
    tokens: [
      { id: `alchemy-${word.id}-left`, label: left, role: 'primary' },
      { id: `alchemy-${word.id}-right`, label: right, role: 'primary' },
      ...distractors.map((label, index) => ({ id: `alchemy-${word.id}-distractor-${index}`, label, role: 'distractor' as const })),
    ],
  };
}
