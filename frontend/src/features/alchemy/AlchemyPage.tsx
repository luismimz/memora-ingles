import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../../components/common';
import { useStore } from '../../store';
import { AlchemyChallenge, AlchemyEmpty } from './AlchemyChallenge';
import { alchemyChallengeFromWord } from './alchemy.types';

/** Nodo jugable para phrasal verbs y futuras palabras compuestas. */
export function AlchemyPage() {
  const { words } = useStore();
  const candidates = useMemo(() => words.filter((word) => word.kind === 'phrasal' || word.kind === 'phrasal_verb' || word.kind === 'compound'), [words]);
  const [index, setIndex] = useState(0);
  const word = candidates[index % Math.max(candidates.length, 1)];
  const challenge = useMemo(() => word ? alchemyChallengeFromWord(word) : null, [word]);

  if (!challenge) return <AlchemyEmpty><Link className="btn secondary" to="/phrasal-verbs">Ver el catálogo phrasal</Link></AlchemyEmpty>;

  return (
    <AlchemyChallenge
      challenge={challenge}
      onComplete={() => toast(`⚗️ ${challenge.targetEn} se ha unido a tu ruta de memoria.`)}
      onNext={() => setIndex((value) => value + 1)}
      onExit={() => window.history.back()}
    />
  );
}
