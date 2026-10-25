import type { LessonPiece, LessonStep } from '../domain/grammarLesson';
import { GrammarRow } from './GrammarText';
import './grammarComparison.css';

const identity = (part: LessonPiece) => `${part.role}:${part.text.trim().toLocaleLowerCase('en-US')}`;

/** Highlights changes in the authored model, not new vocabulary or word-for-word equivalence. */
export function GrammarComparison({ step, previous }: { step: LessonStep; previous?: LessonStep }) {
  const previousEnglish = previous && !previous.hideEnglish ? new Set(previous.en.map(identity)) : undefined;
  const candidates = previousEnglish ? step.en.map((part, index) => previousEnglish.has(identity(part)) ? -1 : index).filter((index) => index >= 0) : [];
  // A wholly different model is not a small edit of the previous one.
  const changed = candidates.length < step.en.length ? candidates : [];
  return <div className="coach-demonstration coach-comparison">
    <div><small className="coach-language">ESPAÑOL</small><GrammarRow parts={step.es} language="es" /></div>
    {!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small>
      <p className="coach-row" lang="en">{step.en.map((part, index) => <span key={index} className={`coach-piece coach-${part.role}${changed.includes(index) ? ' comparison-changed' : ''}`}>{part.text}</span>)}</p>
      {changed.length ? <p className="comparison-cue"><span aria-hidden="true">↳ </span>Cambia aquí: <span lang="en">{changed.map((index) => step.en[index].text.trim()).join(' · ')}</span></p> : null}
    </div></> : null}
  </div>;
}
