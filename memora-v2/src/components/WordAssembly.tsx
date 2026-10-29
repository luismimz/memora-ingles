import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import type { WordAssemblyPosition } from '../domain/game';
import { GameCard, usePlayFeed } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { playSnap, stopSpeech } from '../services/audio';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useSpeechPlayback } from './useSpeechPlayback';
import { isAssociationRejected } from '../domain/associationPreference';
import './wordAssembly.css';
import { spellingBoard } from '../domain/spellingBoard';
import { readArcadeCalm } from '../domain/arcadeCadence';

/** Guided spelling rehearsal, not an independent recall or a new memory store. */
export function WordAssembly({ word, userId, onContinue, vertical = false, initialPosition, onProgress, sceneAsHelp = false }: { word: AtomicWord; userId?: string; onContinue: () => void; vertical?: boolean; initialPosition?: WordAssemblyPosition; onProgress?: (position: WordAssemblyPosition) => void; sceneAsHelp?: boolean }) {
  const feed = usePlayFeed();
  const sceneVisible = !isAssociationRejected(userId, word);
  const visualHelp = sceneAsHelp && sceneVisible;
  const calm = userId ? readArcadeCalm(userId) : false;
  const model = word.en.toUpperCase();
  const legacy = Boolean(initialPosition && !initialPosition.layout);
  const { parts, gaps, guided } = spellingBoard(model, initialPosition?.layout, legacy);
  const positionLayout = initialPosition && !initialPosition.layout ? {} : { layout: 'letters-v2' as const };
  const bank = useMemo(() => {
    const pieces = gaps.map((id) => ({ text: parts[id], id }));
    for (let index = pieces.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [pieces[index], pieces[other]] = [pieces[other], pieces[index]];
    }
    return pieces;
  }, [model, legacy]);
  const [selected, setSelected] = useState<number[]>(() => initialPosition && initialPosition.selected.length <= gaps.length && new Set(initialPosition.selected).size === initialPosition.selected.length && initialPosition.selected.every((id, index) => gaps.includes(id) && parts[id] === parts[gaps[index]]) ? initialPosition.selected : []), [cue, setCue] = useState('');
  const [helped, setHelped] = useState(guided || (initialPosition?.modelUsed ?? false));
  const [hinted, setHinted] = useState(visualHelp || (initialPosition?.hinted ?? false));
  const playback = useSpeechPlayback();
  const continued = useRef(false);
  const justCompleted = useRef(false);
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  const listen = () => playback.listen(word.en, 'en', word.audioUrl);
  const done = selected.length === gaps.length;
  const visibleSpelling = parts.map((part, index) => gaps.indexOf(index) < 0 || gaps.indexOf(index) < selected.length ? part : '_').join('');
  const save = (selection: number[], hint: boolean, modelUsed: boolean) => onProgress?.({ selected: selection, hinted: hint, modelUsed, ...positionLayout });
  function choose(id: number) {
    if (done || selected.includes(id)) return;
    if (parts[id] !== parts[gaps[selected.length]]) { setHinted(true); save(selected, true, helped); setCue(`Busca «${parts[gaps[selected.length]]}»`); return; }
    const next = [...selected, id]; setSelected(next); setCue(''); playSnap();
    save(next, hinted, helped);
    if (next.length === gaps.length) { justCompleted.current = true; void listen(); }
  }
  const advance = () => { if (!done || continued.current) return; continued.current = true; playback.reset(); stopSpeech(); onContinue(); };
  useEffect(() => {
    // Same result rhythm as the feed, never a timer over teaching or an old
    // restored result. An explicit replay finishes before automatic movement.
    if (!done || !justCompleted.current || !vertical || !feed || calm || playback.audio?.status === 'preparing' || playback.audio?.status === 'playing') return;
    const timer = window.setTimeout(advance, 1300);
    return () => window.clearTimeout(timer);
  }, [done, vertical, feed, calm, playback.audio?.status]);
  const speaker = <button type="button" className="round-audio" aria-busy={playback.audio?.status === 'preparing'} title={playback.label} onClick={() => void listen()} aria-label={done ? 'Escuchar palabra' : 'Escuchar modelo'}>🔊</button>;
  return <GameCard feedback={done ? helped || hinted ? 'model' : 'correct' : cue ? 'retry' : undefined} vertical={vertical} stepKey={done ? 'assembled' : 'assemble'} onAdvance={done ? advance : undefined} advanceControl revealFooter={done} advanceLabel="Continuar" className="word-assembly-card"><div className="word-assembly">
    <div className={`assembly-context${sceneVisible ? ' has-scene' : ''}`}>
      {sceneVisible ? <SceneVisual word={word} compact hideAnswer={!done} /> : null}
      <h1>{word.es}</h1>
    </div>
    <h2 role={done ? 'status' : undefined}>{done ? guided ? '✓ Palabra completada con apoyo' : helped ? 'Armada con modelo' : hinted ? 'Armada con ayuda' : '✓ Palabra armada' : guided ? 'Completa las letras' : 'Arma la palabra'}</h2>
    <div className={`assembly-line${done ? ' is-complete' : ''}${guided ? ' is-guided' : ''}`} role="group" aria-label="Tu palabra"><span className="sr-only">{done ? model : `${visibleSpelling}. ${selected.length} de ${gaps.length} piezas colocadas`}</span>{done ? <strong className="assembly-whole" lang="en">{model}</strong> : parts.map((part, index) => { const gap = gaps.indexOf(index); const filled = gap < 0 || gap < selected.length; return <span key={index} className={!part.trim() ? 'assembly-space' : filled ? gap < 0 ? 'is-given' : 'is-filled' : ''} aria-hidden="true">{filled ? part : '·'}</span>; })}</div>
    {!done ? <div className="assembly-bank" aria-label="Piezas de la palabra">{bank.map(({ text, id }) => <button type="button" key={id} lang="en" disabled={selected.includes(id)} onClick={() => choose(id)} aria-label={`Colocar ${text}, pieza ${id + 1}`}>{text}</button>)}</div> : null}
    {cue ? <p className="assembly-cue" role="status">{cue}</p> : null}
    {!done ? <><button type="button" className="quiet-action assembly-listen" aria-busy={playback.audio?.status === 'preparing'} onClick={() => { setHelped(true); save(selected, hinted, true); void listen(); }}>🔊 Escuchar una pista</button><details className="assembly-help" onToggle={(event) => { if (event.currentTarget.open) { setHelped(true); save(selected, hinted, true); } }}><summary>Una pista</summary><p className="assembly-model"><strong lang="en">{model}</strong>{speaker}</p></details></> : speaker}
    <AssociationAudioStatus state={playback.audio} compact />
  </div></GameCard>;
}
