import { Fragment } from 'react';
import type { MessageRepairData } from '../domain/messageRepair';
import { SpeechModelButton } from './SpeechModelButton';
import './messageRepair.css';

/** An explicitly broken authored message, not a pronunciation model.
 * Choosing a seam is navigation. Only inserting a tile submits an attempt. */
export function MessageRepair({ target, pieces, choices, solution, joined, insight, position, result, onPosition, onAnswer, headingLevel = 1 }: MessageRepairData & {
  position?: number; result: 'idle' | 'retry' | 'correct' | 'model';
  headingLevel?: 1 | 2;
  onPosition: (position: number) => void; onAnswer: (message: string) => void;
}) {
  const done = result === 'correct' || result === 'model';
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const selected = position !== undefined && Number.isInteger(position) && position >= 0 && position <= pieces.length ? position : undefined;
  return <section className={`message-repair${done ? ' is-repaired' : ''}`} aria-label="Detective de mensajes">
    <p className="eyebrow">{done ? result === 'model' ? 'REPARACIÓN CON AYUDA' : 'MENSAJE REPARADO' : 'ARCADE · DETECTIVE'}</p>
    <Heading>{done ? 'Una pieza cambia el mensaje.' : 'El mensaje ha perdido una pieza.'}</Heading>
    <p className="repair-target">{target}</p>
    <div className="repair-note">
      <span className="repair-note-author">Nora <small>{done ? 'Ahora sí' : 'Borrador con un error'}</small></span>
      {done ? <p className="repair-solution" lang="en">{joined.before}<span className="repair-linked">{joined.first} <strong className="repair-arrived">{joined.inserted}</strong></span>{joined.after}</p> : <div className="repair-message" lang="en" role="group" aria-label="Elige dónde falta una pieza">
        {Array.from({ length: pieces.length + 1 }, (_, index) => <Fragment key={index}>
          <button type="button" className="repair-seam" aria-pressed={selected === index} aria-label={index === 0 ? 'Insertar al principio' : `Insertar después de ${pieces[index - 1].text}`} onClick={() => onPosition(index)}><span aria-hidden="true">{selected === index ? '↓' : '+'}</span></button>
          {pieces[index] ? <span className={`coach-piece coach-${pieces[index].role}`}>{pieces[index].text}</span> : null}
        </Fragment>)}
      </div>}
    </div>
    {!done ? <>
      <p className="repair-instruction" role="status">{selected === undefined ? 'Toca + donde falta algo.' : 'Ahora toca la pieza que lo repara.'}</p>
      <div className="repair-bank" role="group" aria-label="Piezas para reparar el mensaje">{choices.map((choice) => <button type="button" className={`coach-piece coach-${choice.role}`} key={choice.text} disabled={selected === undefined} onClick={() => {
        if (selected === undefined) return;
        onAnswer([...pieces.slice(0, selected).map((part) => part.text), choice.text, ...pieces.slice(selected).map((part) => part.text)].join(' '));
      }}>{choice.text}</button>)}</div>
    </> : <><p className="repair-insight">{insight}</p><SpeechModelButton text={solution} label="Escuchar el mensaje reparado" /></>}
  </section>;
}
