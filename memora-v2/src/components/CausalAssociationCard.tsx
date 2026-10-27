import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit, AtomicWord } from '../domain/unit';
import type { WordAssemblyPosition } from '../domain/game';
import { causalDiscoveryPresentation, hasCausalDiscovery, recordCausalDiscovery } from '../domain/causalDiscovery';
import { GameCard } from './GameCard';
import { CausalDeskScene } from './CausalDeskScene';
import { CausalPillowScene } from './CausalPillowScene';
import { CausalPhoneScene } from './CausalPhoneScene';
import { WordAssembly } from './WordAssembly';
import { WordHeading } from './WordHeading';
import { MnemonicSceneText } from './SceneVisual';
import { BridgeSoundNote } from './BridgeSoundNote';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useSpeechPlayback } from './useSpeechPlayback';
import { stopSpeech } from '../services/audio';
import { recordWordDemonstration } from '../domain/wordDemonstration';
import './causalDiscovery.css';

export function CausalAssociationCard({ unit, word, userId, index, total, assemblyPosition, onAssemblyProgress, onConnect, onReject, rehearseWord = true }: {
  unit: AtomicUnit; word: AtomicWord; userId: string; index: number; total: number;
  assemblyPosition?: WordAssemblyPosition; onAssemblyProgress?: (position: WordAssemblyPosition) => void;
  onConnect: () => void; onReject: () => void;
  rehearseWord?: boolean;
}) {
  const [restored] = useState(() => hasCausalDiscovery(userId, unit, word));
  const [active, setActive] = useState(restored);
  const activated = useRef(restored);
  const sceneTouch = useRef<number>();
  const sceneDragged = useRef(false);
  const [replay, setReplay] = useState(0);
  const [assembling, setAssembling] = useState(Boolean(assemblyPosition));
  const playback = useSpeechPlayback();
  const presentation = causalDiscoveryPresentation(word);
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
    if (!rehearseWord) { recordWordDemonstration(userId, unit, word); onConnect(); return; }
    onAssemblyProgress?.({ selected: [], hinted: false, modelUsed: false, layout: 'letters-v2' }); setAssembling(true);
  }
  if (assembling) return <WordAssembly word={word} userId={userId} vertical sceneAsHelp initialPosition={assemblyPosition} onProgress={onAssemblyProgress} onContinue={onConnect} />;
  if (!presentation) return null;
  const scene = presentation.kind === 'pillow-piloto' ? <CausalPillowScene active={active} replay={replay} /> : presentation.kind === 'phone-fondo' ? <CausalPhoneScene active={active} replay={replay} /> : <CausalDeskScene active={active} replay={replay} />;
  return <GameCard vertical stepKey={active ? 'causal-result' : 'causal-seed'} className="causal-discovery-card" onAdvance={active ? assemble : discover} advanceLabel={active ? rehearseWord ? 'Armar con menos ayuda' : index + 1 < total ? 'Descubre la siguiente' : 'Recuerda las palabras' : 'Descubrir la conexión'}>
    <div className="causal-discovery">
      <p className="eyebrow">DESCUBRE · {index + 1}/{total}</p>
      <div className={`causal-word-slot${playback.audio?.status === 'playing' ? ' is-speaking' : ''}`}>
        {active ? <WordHeading en={word.en} es={word.es.toUpperCase()} /> : <h1>{presentation.prompt}</h1>}
        <button type="button" className="round-audio" aria-label="Escuchar modelo inglés" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(word.en, 'en', word.audioUrl)}>🔊</button>
      </div>
      <button type="button" className="causal-scene-control" data-feed-surface="true" onTouchStart={(event) => { sceneTouch.current = event.touches.length === 1 ? event.touches[0].clientY : undefined; sceneDragged.current = false; }} onTouchMove={(event) => { if (sceneTouch.current !== undefined && event.touches.length === 1 && Math.abs(event.touches[0].clientY - sceneTouch.current) > 12) sceneDragged.current = true; }} onTouchEnd={() => { sceneTouch.current = undefined; }} onTouchCancel={() => { sceneTouch.current = undefined; sceneDragged.current = true; }} onClick={(event) => { if (sceneDragged.current && event?.detail !== 0) { sceneDragged.current = false; return; } sceneDragged.current = false; discover(); }} aria-label={active ? 'Repetir la transformación' : presentation.control}>{scene}<span>{active ? '↻ Repetir' : presentation.tap}</span></button>
      <div className="causal-story-slot" role="status">{active ? <p><MnemonicSceneText word={word} /></p> : null}</div>
      <AssociationAudioStatus state={playback.audio} compact />
      <details className="association-help"><summary>Ayuda</summary><p>{word.ipa}</p><BridgeSoundNote word={word} explain /></details>
      <button type="button" className="association-reject" onClick={() => { playback.reset(); stopSpeech(); onReject(); }}>Esta asociación no me ayuda</button>
    </div>
  </GameCard>;
}
