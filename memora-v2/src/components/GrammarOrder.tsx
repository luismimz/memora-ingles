import type { LessonPiece } from '../domain/grammarLesson';
import './grammarOrder.css';

/** Controlled navigation only. GrammarCoach owns attempts, hints and checkpoints. */
export function GrammarOrder({ pieces, selected, locked, onChange, onAnswer }: {
  pieces: LessonPiece[]; selected: number[]; locked: boolean; onChange: (selection: number[]) => void; onAnswer: (answer: string) => void;
}) {
  return <div className="grammar-order">
    <div className="order-message" role="group" aria-label="Tu mensaje ordenado">
      {selected.length ? selected.map((id, position) => <button type="button" key={id} disabled={locked} className={`coach-piece coach-${pieces[id].role}`} aria-label={`Quitar ${pieces[id].text}, posición ${position + 1}`} onClick={() => onChange(selected.filter((_, index) => index !== position))}>{pieces[id].text}</button>) : <p>Toca las piezas para construir tu mensaje.</p>}
    </div>
    <div className="order-bank" role="group" aria-label="Piezas disponibles">
      {pieces.map((part, index) => <button type="button" key={index} disabled={locked || selected.includes(index)} className={`coach-piece coach-${part.role}`} onClick={() => onChange([...selected, index])}>{part.text}</button>)}
    </div>
    <button type="button" className="primary-action" disabled={locked || selected.length !== pieces.length} onClick={() => onAnswer(selected.map((id) => pieces[id].text).join(' '))}>Enviar mensaje →</button>
    <small>Con piezas es práctica con apoyo, no escritura sin pistas.</small>
  </div>;
}
