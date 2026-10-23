import type { AtomicWord } from '../domain/unit';
import { wordVisual } from '../domain/wordVisual';
import { playEnglish } from '../services/audio';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { WordHeading } from './WordHeading';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import type { AssociationAudioState } from './useAssociationAudio';

/** Same visual card as PLAY; a transparent cognate is not a made-up acoustic bridge. */
export function CognateAssociationCard({ word, index, total, audioState, onListen, onConnect, vertical = false }: {
  word: AtomicWord; index: number; total: number; audioState?: AssociationAudioState; onListen?: () => void; onConnect: () => void; vertical?: boolean;
}) {
  const visual = wordVisual(word);
  return <GameCard vertical={vertical} onAdvance={onConnect} advanceControl advanceLabel="Ya la he conectado" back={<div className="hint-face"><SceneVisual word={visual} showMemoryLink /><p><strong lang="en">{word.en}</strong> → <strong>{word.es}</strong></p><p>Se parecen y comparten este significado.</p></div>}>
    <div className="association-content cognate-association is-revealed">
      <p className="eyebrow">PALABRA {index + 1}/{total}</p>
      <div className="association-word-top"><WordHeading en={word.en} es={word.es.toUpperCase()} /><button type="button" className="round-audio" onClick={onListen ?? (() => void playEnglish(word.en.toLowerCase(), word.audioUrl))} aria-label={`Escuchar ${word.en}`}>🔊</button></div>
      <SceneVisual word={visual} showMemoryLink />
      <p className="scene-copy">Mismo significado; escucha cómo suena en inglés.</p>
      <details className="association-help"><summary>Sonido y ayuda para recordar</summary><p className="ipa">{word.ipa}</p><AssociationAudioStatus state={audioState} /></details>
      {word.usageExample ? <details className="cognate-example"><summary>Ver un ejemplo</summary><p lang="en">{word.usageExample.en}</p><p>{word.usageExample.es}</p><button type="button" className="quiet-action" onClick={() => void playEnglish(word.usageExample!.en)}>🔊 Escuchar el ejemplo</button></details> : null}
    </div>
  </GameCard>;
}
