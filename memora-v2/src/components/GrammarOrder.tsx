import { useRef, useState, type PointerEvent } from 'react';
import type { LessonPiece } from '../domain/grammarLesson';
import './grammarOrder.css';

/** Controlled navigation only. GrammarCoach owns attempts, hints and checkpoints. */
export function GrammarOrder({ pieces, selected, locked, onChange, onAnswer, puzzle = false }: {
  pieces: LessonPiece[]; selected: number[]; locked: boolean; onChange: (selection: number[]) => void; onAnswer: (answer: string) => void;
  puzzle?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; piece: number; x: number; y: number; moved: boolean }>();
  const suppressClick = useRef(false);
  const submitted = useRef<string>();
  const [dragging, setDragging] = useState<number>();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  function select(selection: number[]) {
    if (locked) return;
    if (selection.length < pieces.length) submitted.current = undefined;
    onChange(selection);
    if (puzzle && selection.length === pieces.length) {
      const signature = selection.join(',');
      if (submitted.current === signature) return;
      submitted.current = signature;
      onAnswer(selection.map((id) => pieces[id].text).join(' '));
    }
  }
  function add(id: number) { if (!selected.includes(id)) select([...selected, id]); }
  function begin(event: PointerEvent<HTMLButtonElement>, piece: number) {
    if (!puzzle || locked || selected.includes(piece) || event.isPrimary === false || event.button > 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, piece, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - value.x, event.clientY - value.y) >= 8) { value.moved = true; setDragging(value.piece); setOffset({ x: event.clientX - value.x, y: event.clientY - value.y }); }
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    gesture.current = undefined; setDragging(undefined);
    if (!value || value.id !== event.pointerId || !value.moved) return;
    suppressClick.current = true;
    const hit = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest('[data-order-target]');
    if (target && root.current?.contains(target)) add(value.piece);
  }
  return <div ref={root} className={`grammar-order${puzzle ? ' is-puzzle' : ''}`}>
    {puzzle ? <p className="order-instruction">Monta el mensaje: arrastra o toca las piezas.</p> : null}
    <div data-order-target className={`order-message${dragging !== undefined ? ' is-drop-ready' : ''}`} role="group" aria-label="Tu mensaje ordenado">
      {selected.length ? selected.map((id, position) => <button type="button" key={id} disabled={locked} className={`coach-piece coach-${pieces[id].role}`} aria-label={`Quitar ${pieces[id].text}, posición ${position + 1}`} onClick={() => select(selected.filter((_, index) => index !== position))}>{pieces[id].text}</button>) : <p>{puzzle ? 'Tu mensaje va aquí' : 'Toca las piezas para construir tu mensaje.'}</p>}
      {puzzle ? Array.from({ length: pieces.length - selected.length }, (_, index) => <span key={`empty-${index}`} className="order-empty" aria-hidden="true">·</span>) : null}
    </div>
    <div className="order-bank" role="group" aria-label="Piezas disponibles">
      {pieces.map((part, index) => <button type="button" key={index} disabled={locked || selected.includes(index)} className={`coach-piece coach-${part.role}${dragging === index ? ' is-dragging' : ''}`} style={dragging === index ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined} onPointerDown={(event) => begin(event, index)} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { gesture.current = undefined; setDragging(undefined); }} onClick={(event) => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; } add(index); }}>{part.text}</button>)}
    </div>
    {!puzzle ? <button type="button" className="primary-action" disabled={locked || selected.length !== pieces.length} onClick={() => onAnswer(selected.map((id) => pieces[id].text).join(' '))}>Enviar mensaje →</button> : <small>La última pieza comprueba tu mensaje. Toca una pieza colocada para cambiarla.</small>}
    <small className={puzzle ? 'sr-only' : undefined}>Con piezas es práctica con apoyo, no escritura sin pistas.</small>
  </div>;
}
