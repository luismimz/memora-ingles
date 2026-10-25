import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import type { AssociationAudioState } from './useAssociationAudio';
import './wordAssembly.css';

/** Guided spelling rehearsal, not an independent recall or a new memory store. */
export function WordAssembly({ word, onContinue, vertical = false }: { word: AtomicWord; onContinue: () => void; vertical?: boolean }) {
  const model = word.en.toUpperCase();
  const parts = model.includes(' ') ? model.split(/\s+/) : model.length > 10 ? model.match(/.{1,2}/gu)! : Array.from(model);
  const bank = useMemo(() => {
    const pieces = parts.map((text, id) => ({ text, id }));
    for (let index = pieces.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [pieces[index], pieces[other]] = [pieces[other], pieces[index]];
    }
    return pieces;
  }, [model]);
  const [selected, setSelected] = useState<number[]>([]), [cue, setCue] = useState('');
  const [helped, setHelped] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [audio, setAudio] = useState<AssociationAudioState>();
  const request = useRef(0);
  const continued = useRef(false);
  useEffect(() => () => { request.current++; stopSpeech(); }, []);
  async function listen() {
    const token = ++request.current;
    setAudio({ status: 'preparing', source: null });
    try {
      const result = await playEnglish(word.en, word.audioUrl, true, (source) => {
        if (token === request.current) setAudio({ status: 'playing', source });
      });
      if (token === request.current) setAudio({ status: result.status === 'played' ? 'ready' : result.status === 'unavailable' ? 'unavailable' : 'blocked', source: result.source });
    } catch { if (token === request.current) setAudio({ status: 'unavailable', source: null }); }
  }
  const done = selected.length === parts.length;
  function choose(id: number) {
    if (done || selected.includes(id)) return;
    if (parts[id] !== parts[selected.length]) { setHinted(true); setCue(`Busca «${parts[selected.length]}»`); return; }
    const next = [...selected, id]; setSelected(next); setCue(''); playSnap();
    if (next.length === parts.length) void listen();
  }
  const advance = () => { if (!done || continued.current) return; continued.current = true; request.current++; stopSpeech(); onContinue(); };
  const speaker = <button type="button" className="round-audio" aria-busy={audio?.status === 'preparing'} title={audio?.status === 'preparing' ? 'Preparando audio…' : audio?.status === 'playing' ? 'Reproduciendo…' : 'Escuchar'} onClick={() => void listen()} aria-label={done ? 'Escuchar palabra' : 'Escuchar modelo'}>🔊</button>;
  return <GameCard vertical={vertical} stepKey={done ? 'assembled' : 'assemble'} onAdvance={done ? advance : undefined} advanceControl revealFooter={done} advanceLabel="Continuar" className="word-assembly-card"><div className="word-assembly">
    <h1>{word.es}</h1>
    <SceneVisual word={word} compact hideAnswer={!done} />
    <h2 role={done ? 'status' : undefined}>{done ? helped ? 'Armada con modelo' : hinted ? 'Armada con ayuda' : '✓ Palabra armada' : 'Arma la palabra'}</h2>
    <div className={`assembly-line${done ? ' is-complete' : ''}`} role="group" aria-label="Tu palabra"><span className="sr-only">{done ? model : `${selected.length} de ${parts.length} piezas colocadas`}</span>{parts.map((_, index) => <span key={index} className={index < selected.length ? 'is-filled' : ''} aria-hidden="true">{index < selected.length ? parts[selected[index]] : '·'}</span>)}</div>
    {!done ? <div className="assembly-bank" aria-label="Piezas de la palabra">{bank.map(({ text, id }) => <button type="button" key={id} lang="en" disabled={selected.includes(id)} onClick={() => choose(id)} aria-label={`Colocar ${text}, pieza ${id + 1}`}>{text}</button>)}</div> : null}
    {cue ? <p className="assembly-cue" role="status">{cue}</p> : null}
    {!done ? <details className="assembly-help" onToggle={(event) => { if (event.currentTarget.open) setHelped(true); }}><summary>Una pista</summary><p className="assembly-model"><strong lang="en">{model}</strong>{speaker}</p></details> : speaker}
    <AssociationAudioStatus state={audio} compact />
  </div></GameCard>;
}
