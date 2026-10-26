import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit, AtomicWord } from '../domain/unit';
import type { WordAssemblyPosition } from '../domain/game';
import { hasCausalDiscovery, recordCausalDiscovery } from '../domain/causalDiscovery';
import { GameCard } from './GameCard';
import { CausalDeskScene } from './CausalDeskScene';
import { WordAssembly } from './WordAssembly';
import { WordHeading } from './WordHeading';
import { MnemonicSceneText } from './SceneVisual';
import { BridgeSoundNote } from './BridgeSoundNote';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useSpeechPlayback } from './useSpeechPlayback';
import { stopSpeech } from '../services/audio';
import './causalDiscovery.css';

export function CausalAssociationCard({ unit, word, userId, index, total, assemblyPosition, onAssemblyProgress, onConnect, onReject }: {
  unit: AtomicUnit; word: AtomicWord; userId: string; index: number; total: number;
  assemblyPosition?: WordAssemblyPosition; onAssemblyProgress?: (position: WordAssemblyPosition) => void;
  onConnect: () => void; onReject: () => void;
}) {
  const [restored] = useState(() => hasCausalDiscovery(userId, unit, word));
  const [active, setActive] = useState(restored);
  const activated = useRef(restored);
  const [replay, setReplay] = useState(0);
  const [assembling, setAssembling] = useState(Boolean(assemblyPosition));
  const playback = useSpeechPlayback();
  useEffect(() => {
    if (!restored && !assemblyPosition) void playback.listen(word.en, 'en', word.audioUrl);
    return () => { playback.reset(); stopSpeech(); };
  }, []);
  function discover() {
    if (!activated.current) { activated.current = true; recordCausalDiscovery(userId, unit, word); }
    setActive(true); setReplay((value) => value + 1);
    void playback.listen(word.en, 'en', word.audioUrl);
  }
  function assemble() {
    playback.reset(); stopSpeech();
    onAssemblyProgress?.({ selected: [], hinted: false, modelUsed: false }); setAssembling(true);
  }
  if (assembling) return <WordAssembly word={word} userId={userId} vertical sceneAsHelp initialPosition={assemblyPosition} onProgress={onAssemblyProgress} onContinue={onConnect} />;
  return <GameCard vertical stepKey={active ? 'causal-result' : 'causal-seed'} className="causal-discovery-card" onAdvance={active ? assemble : discover} advanceLabel={active ? 'Armar con menos ayuda' : 'Descubrir la conexión'}>
    <div className="causal-discovery">
      <p className="eyebrow">DESCUBRE · {index + 1}/{total}</p>
      <div className={`causal-word-slot${playback.audio?.status === 'playing' ? ' is-speaking' : ''}`}>
        {active ? <WordHeading en={word.en} es={word.es.toUpperCase()} /> : <h1>Haz que el disco<br />despliegue sus patas.</h1>}
        <button type="button" className="round-audio" aria-label="Escuchar modelo inglés" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(word.en, 'en', word.audioUrl)}>🔊</button>
      </div>
      <button type="button" className="causal-scene-control" onClick={discover} aria-label={active ? 'Repetir la transformación' : 'Tocar el disco'}><CausalDeskScene active={active} replay={replay} /><span>{active ? '↻ Repetir' : 'Toca el disco'}</span></button>
      <div className="causal-story-slot" role="status">{active ? <p><MnemonicSceneText word={word} /></p> : null}</div>
      <AssociationAudioStatus state={playback.audio} compact />
      <details className="association-help"><summary>Ayuda</summary><p>{word.ipa}</p><BridgeSoundNote word={word} explain /></details>
      <button type="button" className="association-reject" onClick={() => { playback.reset(); stopSpeech(); onReject(); }}>Esta asociación no me ayuda</button>
    </div>
  </GameCard>;
}
