import type { zeroWritingGuide } from '../domain/zeroJourney';
import { GrammarOrder } from './GrammarOrder';

export function WritingGuide({ target, guide, order, locked, onOrder, onAnswer }: {
  target: string; guide: ReturnType<typeof zeroWritingGuide>; order: number[]; locked: boolean;
  onOrder: (order: number[]) => void; onAnswer: (answer: string) => void;
}) {
  return <section className="zero-writing-guide" aria-label="Montar el mensaje con ayuda">
    <p className="zero-native">{target}</p>
    <div className="zero-mirror" role="group" aria-label="Modelo de piezas con su significado">{guide.model.map((part) => <span key={part.en} className={`coach-piece coach-${part.role}`}><strong lang="en">{part.en}</strong><small lang="es">{part.es}</small></span>)}</div>
    <GrammarOrder puzzle autoCheck pieces={guide.pieces} selected={order} locked={locked} onChange={onOrder} onAnswer={onAnswer} />
  </section>;
}
