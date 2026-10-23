import { useRef, useState, type PointerEvent } from 'react';
import type { LessonPiece } from '../domain/grammarLesson';
import './grammarOrder.css';

/** Controlled navigation only. GrammarCoach owns attempts, hints and checkpoints. */
export function GrammarOrder({ pieces, selected, locked, onChange, onAnswer, puzzle = false }: {
  pieces: LessonPiece[]; selected: number[]; locked: boolean; onChange: (selection: number[]) => void; onAnswer: (answer: string) => void;
  puzzle?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; piece: number; x: number; y: number; left: number; top: number; width: number; moved: boolean }>();
  const suppressClick = useRef(false);
  const submitted = useRef<string>();
  const [dragging, setDragging] = useState<number>();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [gap, setGap] = useState<number>();
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
  function place(id: number, position: number) {
    const remaining = selected.filter((item) => item !== id);
    const selection = [...remaining.slice(0, position), id, ...remaining.slice(position)];
    if (selection.join(',') !== selected.join(',')) select(selection);
  }
  function add(id: number) { if (!selected.includes(id)) place(id, selected.length); }
  function destination(event: PointerEvent<HTMLButtonElement>, piece: number): number | undefined {
    const hit = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest('[data-order-target]');
    if (!target || !root.current?.contains(target)) return undefined;
    const remaining = Array.from(root.current.querySelectorAll<HTMLButtonElement>('[data-order-piece]')).filter((node) => Number(node.dataset.orderPiece) !== piece);
    const before = remaining.findIndex((node) => {
      const rect = node.getBoundingClientRect();
      return event.clientY < rect.top || event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2;
    });
    return before < 0 ? remaining.length : before;
  }
  function begin(event: PointerEvent<HTMLButtonElement>, piece: number) {
    if (!puzzle || locked || event.isPrimary === false || event.button > 0) return;
    suppressClick.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    const parent = root.current?.getBoundingClientRect?.();
    // Local coordinates survive the transformed GameCard and a scrolled viewport.
    gesture.current = { id: event.pointerId, piece, x: event.clientX, y: event.clientY, left: rect.left - (parent?.left ?? 0), top: rect.top - (parent?.top ?? 0), width: rect.width, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - value.x, event.clientY - value.y) >= 8) { value.moved = true; setDragging(value.piece); setOffset({ x: event.clientX - value.x, y: event.clientY - value.y }); setGap(destination(event, value.piece)); }
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    if (!value.moved) { cancel(); return; }
    const position = destination(event, value.piece);
    gesture.current = undefined; setDragging(undefined); setGap(undefined);
    suppressClick.current = true;
    // Outside never deletes, answers or loses a tile that was already in the line.
    if (position !== undefined) place(value.piece, position);
  }
  function cancel() { if (gesture.current?.moved) suppressClick.current = true; gesture.current = undefined; setDragging(undefined); setGap(undefined); }
  function click(event: { detail?: number }, action: () => void) {
    if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
    action();
  }
  function dragStyle(id: number) {
    const value = gesture.current;
    return dragging === id && value ? { position: 'absolute' as const, left: value.left, top: value.top, width: value.width, transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined;
  }
  const visibleLine = selected.filter((id) => id !== dragging);
  const marker = (position: number) => puzzle && gap === position ? <span key={`gap-${position}`} className="order-insert" aria-hidden="true" /> : null;
  return <div ref={root} className={`grammar-order${puzzle ? ' is-puzzle' : ''}`}>
    {puzzle ? <p className="order-instruction">Monta el mensaje: arrastra o toca las piezas.</p> : null}
    <div data-order-target className={`order-message${dragging !== undefined ? ' is-drop-ready' : ''}`} role="group" aria-label="Tu mensaje ordenado">
      {selected.length ? selected.map((id, position) => <span key={id} className="order-line-piece">{id !== dragging ? marker(visibleLine.indexOf(id)) : null}<button data-order-piece={id} type="button" disabled={locked} className={`coach-piece coach-${pieces[id].role}${dragging === id ? ' is-dragging' : ''}`} style={dragStyle(id)} aria-label={`Quitar ${pieces[id].text}, posición ${position + 1}`} aria-describedby={puzzle ? 'order-controls' : undefined} onPointerDown={(event) => begin(event, id)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onClick={(event) => click(event, () => select(selected.filter((_, index) => index !== position)))} onKeyDown={(event) => {
        if (!puzzle || locked || !['ArrowLeft', 'ArrowRight'].includes(event.key) || event.repeat) return;
        event.preventDefault(); event.stopPropagation();
        place(id, Math.max(0, Math.min(selected.length - 1, position + (event.key === 'ArrowLeft' ? -1 : 1))));
      }}>{pieces[id].text}</button></span>) : <p>{puzzle ? 'Tu mensaje va aquí' : 'Toca las piezas para construir tu mensaje.'}</p>}
      {marker(visibleLine.length)}
      {puzzle ? Array.from({ length: pieces.length - selected.length }, (_, index) => <span key={`empty-${index}`} className="order-empty" aria-hidden="true">·</span>) : null}
    </div>
    <div className="order-bank" role="group" aria-label="Piezas disponibles">
      {pieces.map((part, index) => <button type="button" key={index} disabled={locked || selected.includes(index)} className={`coach-piece coach-${part.role}${dragging === index ? ' is-dragging' : ''}`} style={selected.includes(index) ? undefined : dragStyle(index)} onPointerDown={(event) => begin(event, index)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onClick={(event) => click(event, () => add(index))}>{part.text}</button>)}
    </div>
    {!puzzle ? <button type="button" className="primary-action" disabled={locked || selected.length !== pieces.length} onClick={() => onAnswer(selected.map((id) => pieces[id].text).join(' '))}>Enviar mensaje →</button> : <small id="order-controls">La última pieza comprueba tu mensaje. Arrastra para cambiar el orden o toca para quitar. Con teclado: ← y → en una pieza.</small>}
    <small className={puzzle ? 'sr-only' : undefined}>Con piezas es práctica con apoyo, no escritura sin pistas.</small>
  </div>;
}
