import type { AtomicWord } from '../domain/unit';
import { wordVisual } from '../domain/wordVisual';
import { playEnglish } from '../services/audio';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { WordHeading } from './WordHeading';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import type { AssociationAudioState } from './useAssociationAudio';
import { CognateConnection } from './CognateConnection';
import { WordUsageExample } from './WordUsageExample';

/** Same visual card as PLAY; a transparent cognate is not a made-up acoustic bridge. */
export function CognateAssociationCard({ word, index, total, audioState, onListen, onConnect, vertical = false }: {
  word: AtomicWord; index: number; total: number; audioState?: AssociationAudioState; onListen?: () => void; onConnect: () => void; vertical?: boolean;
}) {
  const visual = wordVisual(word);
  return <GameCard vertical={vertical} onAdvance={onConnect} advanceControl advanceLabel={vertical ? 'Armar la palabra' : 'Ya la he conectado'} back={vertical ? undefined : <div className="hint-face"><SceneVisual word={visual} showMemoryLink /><p><strong lang="en">{word.en}</strong> → <strong>{word.es}</strong></p><p>Se parecen y comparten este significado.</p></div>}>
    <div className="association-content cognate-association is-revealed">
      <p className="eyebrow">PALABRA {index + 1}/{total}</p>
      <div className="association-word-top">{vertical ? <h1 className="cognate-discovery-title">Mira lo que ya conoces</h1> : <WordHeading en={word.en} es={word.es.toUpperCase()} />}<button type="button" className="round-audio" aria-busy={audioState?.status === 'preparing'} title={audioState?.status === 'preparing' ? 'Preparando audio…' : audioState?.status === 'playing' ? 'Reproduciendo…' : 'Escuchar'} onClick={onListen ?? (() => void playEnglish(word.en.toLowerCase(), word.audioUrl))} aria-label={`Escuchar ${word.en}`}>🔊</button></div>
      <AssociationAudioStatus state={audioState} compact />
      {vertical ? <CognateConnection word={word} /> : <SceneVisual word={visual} showMemoryLink />}
            <details className="association-help"><summary>Ayuda</summary>{vertical ? <SceneVisual word={visual} showMemoryLink /> : null}<p>Se parece al español y comparte este significado.</p><p className="ipa">{word.ipa}</p>{audioState?.status === 'ready' ? <AssociationAudioStatus state={audioState} /> : null}</details>
      <WordUsageExample word={word} />
    </div>
  </GameCard>;
}
