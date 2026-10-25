import { useEffect, useRef, type ReactNode } from 'react';
import './answerStudio.css';

/** Presentation + exact-answer convenience. The caller still validates and records. */
export function AnswerStudio({ id, taskKey, target, value, onChange, onAnswer, accepts, disabled = false }: {
  id: string; taskKey: string; target: ReactNode; value: string; onChange: (value: string) => void;
  onAnswer: (value: string) => void; accepts: (value: string) => boolean; disabled?: boolean;
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
    <div className="answer-studio-direction"><span>ES</span><span aria-hidden="true">→</span><strong>EN</strong></div>
    <p className="answer-studio-instruction">Escribe en inglés</p>
    <div className="answer-studio-target" id={`${id}-target`} lang="es">{target}</div>
    <form onSubmit={(event) => { event.preventDefault(); cancel(); if (!disabled && !composing.current && value.trim()) onAnswer(value); }}>
      <label className="sr-only" htmlFor={id}>Escribe en inglés el mensaje de arriba</label>
      <input id={id} aria-describedby={`${id}-target ${id}-status`} lang="en" value={value} onChange={(event) => { edited.current = true; onChange(event.target.value); }} onCompositionStart={() => { composing.current = true; cancel(); }} onCompositionEnd={() => { composing.current = false; schedule(); }} autoComplete="off" autoCapitalize="none" enterKeyHint="send" spellCheck={false} disabled={disabled} placeholder="Tu respuesta en inglés" />
    </form>
    <p id={`${id}-status`} className="answer-studio-status">Se reconoce al acertar. <kbd aria-label="Enter">↵</kbd> para revisar tu intento.</p>
  </section>;
}
