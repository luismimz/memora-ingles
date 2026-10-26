import { useEffect, useRef, type ReactNode } from 'react';
import './answerStudio.css';

/** Presentation + exact-answer convenience. The caller still validates and records. */
export function AnswerStudio({ id, taskKey, target, value, onChange, onAnswer, accepts, disabled = false, feedback, instruction = 'Escribe en inglés' }: {
  id: string; taskKey: string; target: ReactNode; value: string; onChange: (value: string) => void;
  onAnswer: (value: string) => void; accepts: (value: string) => boolean; disabled?: boolean;
  feedback?: ReactNode;
  instruction?: string;
}) {
  const composing = useRef(false), timer = useRef<ReturnType<typeof setTimeout>>();
  const fired = useRef('');
  const edited = useRef(false);
  const current = useRef({ taskKey, value, disabled, accepts, onAnswer });
  current.current = { taskKey, value, disabled, accepts, onAnswer };
  function cancel() { clearTimeout(timer.current); }
  function schedule() {
    cancel(); const entry = current.current;
    if (!edited.current || composing.current || entry.disabled || !entry.value.trim() || !entry.accepts(entry.value)) return;
    timer.current = setTimeout(() => {
      const latest = current.current, signature = `${entry.taskKey}:${entry.value}`;
      if (composing.current || latest.disabled || latest.taskKey !== entry.taskKey || latest.value !== entry.value || fired.current === signature || !latest.accepts(latest.value)) return;
      fired.current = signature; latest.onAnswer(latest.value);
    }, 450);
  }
  useEffect(() => { edited.current = false; fired.current = ''; cancel(); }, [taskKey]);
  useEffect(() => { schedule(); return cancel; }, [taskKey, value, disabled]);
  return <section className="answer-studio" aria-label="Tu reto de escritura">
    <label className="answer-studio-instruction" htmlFor={id}>{instruction}</label>
    <div className="answer-studio-target" id={`${id}-target`} lang="es">{target}</div>
    <form onSubmit={(event) => { event.preventDefault(); cancel(); if (!disabled && !composing.current && value.trim()) onAnswer(value); }}>
      <input id={id} aria-describedby={`${id}-target ${id}-status${feedback ? ` ${id}-feedback` : ''}`} lang="en" value={value} onChange={(event) => { edited.current = true; onChange(event.target.value); }} onCompositionStart={() => { composing.current = true; cancel(); }} onCompositionEnd={() => { composing.current = false; schedule(); }} autoComplete="off" autoCapitalize="none" enterKeyHint="send" spellCheck={false} disabled={disabled} placeholder="Tu respuesta" />
    </form>
    {feedback ? <p id={`${id}-feedback`} className="answer-studio-feedback" role="status">{feedback}</p> : null}
    <p id={`${id}-status`} className="answer-studio-status">Se reconoce al acertar. <kbd aria-label="Enter">↵</kbd> para revisar.</p>
  </section>;
}
