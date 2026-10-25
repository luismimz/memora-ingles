import { useMemo, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { playEnglish, playSnap } from '../services/audio';
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
  const done = selected.length === parts.length;
  function choose(id: number) {
    if (done || selected.includes(id)) return;
    if (parts[id] !== parts[selected.length]) { setCue(`Busca «${parts[selected.length]}»`); return; }
    const next = [...selected, id]; setSelected(next); setCue(''); playSnap();
    if (next.length === parts.length) void playEnglish(word.en, word.audioUrl);
  }
  return <GameCard vertical={vertical} stepKey={done ? 'assembled' : 'assemble'} onAdvance={done ? onContinue : undefined} advanceControl revealFooter={done} advanceLabel="Siguiente palabra" className="word-assembly-card"><div className="word-assembly">
    <h1>{word.es}</h1>
    <SceneVisual word={word} compact hideAnswer={!done} />
    <h2>{done ? helped ? 'Armada con modelo' : '✓ Palabra armada' : 'Arma la palabra'}</h2>
    <div className={`assembly-line${done ? ' is-complete' : ''}`} role="group" aria-label="Tu palabra"><span className="sr-only">{done ? model : `${selected.length} de ${parts.length} piezas colocadas`}</span>{parts.map((_, index) => <span key={index} className={index < selected.length ? 'is-filled' : ''} aria-hidden="true">{index < selected.length ? parts[selected[index]] : '·'}</span>)}</div>
    {!done ? <div className="assembly-bank" aria-label="Piezas de la palabra">{bank.map(({ text, id }) => <button type="button" key={id} lang="en" disabled={selected.includes(id)} onClick={() => choose(id)} aria-label={`Colocar ${text}, pieza ${id + 1}`}>{text}</button>)}</div> : null}
    {cue ? <p className="assembly-cue" role="status">{cue}</p> : null}
    {!done ? <details className="assembly-help" onToggle={(event) => { if (event.currentTarget.open) setHelped(true); }}><summary>Una pista</summary><p className="assembly-model"><strong lang="en">{model}</strong><button type="button" className="quiet-action" onClick={() => void playEnglish(word.en, word.audioUrl)} aria-label="Escuchar modelo">🔊</button></p></details> : <button type="button" className="quiet-action" onClick={() => void playEnglish(word.en, word.audioUrl)} aria-label="Escuchar palabra">🔊</button>}
  </div></GameCard>;
}
