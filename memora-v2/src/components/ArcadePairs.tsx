import { useEffect, useRef, useState } from 'react';
import type { MicroRound } from '../domain/microArcade';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';

/** A small recognition board. Selecting one tile is not an attempt or recall. */
export function ArcadePairs({ rounds, seed, paused, onPair, onModel, onComplete, initialClosed = {} }: {
  rounds: MicroRound[]; seed: number; paused: boolean;
  onPair: (target: MicroRound, answer: MicroRound, correct: boolean) => void;
  onModel: (target: MicroRound) => void; onComplete: () => void;
  initialClosed?: Record<string, 'correct' | 'model'>;
}) {
  const [selection, setSelection] = useState<{ en?: string; es?: string }>({});
  const validClosed = Object.fromEntries(Object.entries(initialClosed).filter(([id, value]) => rounds.some((round) => normalizeSentenceAnswer(round.word.en) === id) && ['correct', 'model'].includes(value)));
  const [closed, setClosed] = useState<Record<string, 'correct' | 'model'>>(validClosed);
  const committed = useRef<Record<string, 'correct' | 'model'>>(validClosed);
  const finished = useRef(false);
  const [feedback, setFeedback] = useState('');
  const key = (round: MicroRound) => normalizeSentenceAnswer(round.word.en);
  const offset = 1 + seed % (rounds.length - 1);
  const meanings = [...rounds.slice(offset), ...rounds.slice(0, offset)];
  function finish() {
    if (Object.keys(committed.current).length !== rounds.length || finished.current) return;
    finished.current = true; onComplete();
  }
  useEffect(() => { finish(); }, []);
  function pick(side: 'en' | 'es', id: string) {
    if (paused || finished.current || committed.current[id]) return;
    const next = { ...selection, [side]: selection[side] === id ? undefined : id };
    if (!next.en || !next.es) { setSelection(next); return; }
    const target = rounds.find((round) => key(round) === next.en)!;
    const answer = rounds.find((round) => key(round) === next.es)!;
    const correct = next.en === next.es;
    committed.current[next.en] = correct ? 'correct' : 'model';
    setClosed({ ...committed.current }); setSelection({});
    setFeedback(correct ? `${target.word.en} · ${target.word.es} ✓` : `${target.word.en} → ${target.word.es}. Esta es su pareja.`);
    onPair(target, answer, correct); finish();
  }
  function model() {
    if (paused || finished.current) return;
    const pending = rounds.filter((round) => !committed.current[key(round)]);
    for (const round of pending) committed.current[key(round)] = 'model';
    setClosed({ ...committed.current }); setSelection({});
    setFeedback('Conexiones mostradas con ayuda.');
    for (const round of pending) onModel(round);
    finish();
  }
  const done = Object.keys(closed).length === rounds.length;
  const tile = (round: MicroRound, side: 'en' | 'es') => {
    const id = key(round), state = closed[id];
    return <button type="button" key={id} lang={side} className={`pair-tile${selection[side] === id ? ' is-selected' : ''}${state ? ` is-${state}` : ''}`} disabled={paused || Boolean(state)} aria-pressed={selection[side] === id} onClick={() => pick(side, id)}>
      <span>{round.word[side]}</span>{state === 'model' && side === 'en' ? <small lang="es">{round.word.es}</small> : null}{state ? <span className="pair-mark" aria-label={state === 'correct' ? 'Conectada' : 'Con modelo'}>{state === 'correct' ? '✓' : '↔'}</span> : null}
    </button>;
  };
  return <div className="arcade-pairs">
    <p className="eyebrow">CONECTA LAS PAREJAS</p>
    <h1>{done ? 'Conexiones listas' : '¿Qué va con qué?'}</h1>
    <p className="pairs-instruction">{done ? 'Desliza para seguir.' : 'Toca una palabra y su significado.'}</p>
    <div className="pairs-board"><div role="group" aria-label="Palabras inglesas">{rounds.map((round) => tile(round, 'en'))}</div><div role="group" aria-label="Significados en español">{meanings.map((round) => tile(round, 'es'))}</div></div>
    <div className="pairs-feedback" role="status">{paused ? 'En pausa.' : feedback}</div>
    {!done ? <button type="button" className="quiet-action" disabled={paused} onClick={model}>Ver conexiones</button> : null}
  </div>;
}
