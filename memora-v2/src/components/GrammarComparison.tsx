import { useState } from 'react';
import type { LessonStep } from '../domain/grammarLesson';
import { grammarPieceIdentity, grammarTransition } from '../domain/grammarPresentation';
import { GrammarRow } from './GrammarText';
import './grammarComparison.css';

/** Highlights changes in the authored model, not new vocabulary or word-for-word equivalence. */
export function GrammarComparison({ step, previous }: { step: LessonStep; previous?: LessonStep }) {
  const [replay, setReplay] = useState(0);
  const { changed, contraction } = grammarTransition(step, previous);
  const occurrences = new Map<string, number>();
  return <div className="coach-demonstration coach-comparison">
    <div><small className="coach-language">ESPAÑOL</small><GrammarRow parts={step.es} language="es" /></div>
    {!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small>
      <p className="coach-row" lang="en">{step.en.map((part, index) => {
        const identity = grammarPieceIdentity(part); const occurrence = occurrences.get(identity) ?? 0;
        occurrences.set(identity, occurrence + 1);
        const key = `${identity}:${occurrence}`;
        if (contraction && index === 0) return <span key={`${key}:${replay}`} className="comparison-contraction">
          <span className="comparison-source" aria-hidden="true"><span className="coach-subject">{previous!.en[0].text}</span><span className="coach-auxiliary">{previous!.en[1].text}</span></span>
          <span className="comparison-joined"><span className="coach-subject">{part.text[0]}</span><span className="coach-auxiliary">{part.text.slice(1)}</span></span>
        </span>;
        return <span key={changed.includes(index) ? `${key}:${replay}` : key} className={`coach-piece coach-${part.role}${changed.includes(index) ? ' comparison-changed' : ''}`}>{part.text}</span>;
      })}</p>
      {changed.length || contraction ? <button type="button" className="comparison-replay" onClick={(event) => { event.stopPropagation(); setReplay((value) => value + 1); }}><span aria-hidden="true">↻ </span>Repetir cambio</button> : null}
    </div></> : null}
  </div>;
}
