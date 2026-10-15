import type { AtomicWord } from '../domain/unit';
import { wordVisual } from '../domain/wordVisual';
import { playEnglish } from '../services/audio';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { WordHeading } from './WordHeading';

/** Same visual card as PLAY; a transparent cognate is not a made-up acoustic bridge. */
export function CognateAssociationCard({ word, index, total, revealed, onConnect }: {
  word: AtomicWord; index: number; total: number; revealed: boolean; onConnect: () => void;
}) {
  const visual = wordVisual(word);
  return <GameCard onAdvance={revealed ? onConnect : undefined} back={<div className="hint-face"><SceneVisual word={visual} showMemoryLink /><p><strong lang="en">{word.en}</strong> → <strong>{word.es}</strong></p><p>Se parecen y comparten este significado.</p></div>}>
    <div className={`association-content cognate-association ${revealed ? 'is-revealed' : 'is-listening'}`}>
      <p className="eyebrow">ASOCIACIÓN {index + 1}/{total}</p>
      <WordHeading en={word.en} es={word.es.toUpperCase()} />
      <p className="ipa">{word.ipa}</p>
      <SceneVisual word={visual} showMemoryLink />
      <div className="bridge-row"><div><small>SE PARECE A</small><b>{word.es.toUpperCase()}</b></div><button type="button" className="round-audio" onClick={() => void playEnglish(word.en.toLowerCase(), word.audioUrl)} aria-label={`Escuchar ${word.en}`}>🔊</button></div>
      <p className="scene-copy">Mismo significado; escucha cómo suena en inglés.</p>
      {word.usageExample ? <details className="cognate-example"><summary>Ver un ejemplo</summary><p lang="en">{word.usageExample.en}</p><p>{word.usageExample.es}</p><button type="button" className="quiet-action" onClick={() => void playEnglish(word.usageExample!.en)}>🔊 Escuchar el ejemplo</button></details> : null}
      <span className="audio-glass" role="status" aria-label={revealed ? 'Palabra revelada' : 'Escucha antes de leer'}><span aria-hidden="true">◉</span></span>
    </div>
  </GameCard>;
}
