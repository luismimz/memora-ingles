import { useEffect, useRef, type ReactNode } from 'react';
import './answerStudio.css';

/** Presentation + exact-answer convenience. The caller still validates and records. */
export function AnswerStudio({ id, taskKey, target, value, onChange, onAnswer, accepts, disabled = false, feedback, instruction = 'Escribe en inglés', scene, draftCue, onDraftCue, repeatDraftCues = false }: {
  id: string; taskKey: string; target: ReactNode; value: string; onChange: (value: string) => void;
  onAnswer: (value: string) => void; accepts: (value: string) => boolean; disabled?: boolean;
  feedback?: ReactNode;
  instruction?: string;
  /** Persistent visual context next to the target, never hidden on focus. */
  scene?: ReactNode;
  draftCue?: (value: string) => string | undefined;
  onDraftCue?: (value: string, cue: string) => void;
  /** Opt-in: a different complete draft can receive its own neutral cue. */
  repeatDraftCues?: boolean;
}) {
  const composing = useRef(false), timer = useRef<ReturnType<typeof setTimeout>>();
  const fired = useRef('');
  const edited = useRef(false);
  const cueSent = useRef(false);
  const cueSignature = useRef('');
  const field = useRef<HTMLInputElement>(null);
  const current = useRef({ taskKey, value, disabled, accepts, onAnswer, draftCue, onDraftCue, repeatDraftCues });
  current.current = { taskKey, value, disabled, accepts, onAnswer, draftCue, onDraftCue, repeatDraftCues };
  function cancel() { clearTimeout(timer.current); }
  function commit(text: string) {
    // Close the software keyboard before a solved answer changes the scene.
    // A wrong submission keeps the same field, caret, draft and keyboard.
    if (current.current.accepts(text) && field.current && typeof document !== 'undefined' && document.activeElement === field.current) field.current.blur();
    current.current.onAnswer(text);
  }
  function schedule() {
    cancel(); const entry = current.current;
    if (!edited.current || composing.current || entry.disabled || !entry.value.trim()) return;
    if (!entry.accepts(entry.value)) {
      const cue = entry.draftCue?.(entry.value), signature = `${entry.taskKey}:${entry.value}:${cue}`;
      if ((!entry.repeatDraftCues && cueSent.current) || cueSignature.current === signature || !entry.onDraftCue || !cue) return;
      timer.current = setTimeout(() => {
        const latest = current.current;
        if (composing.current || latest.disabled || latest.taskKey !== entry.taskKey || latest.value !== entry.value || (!latest.repeatDraftCues && cueSent.current) || cueSignature.current === signature || latest.accepts(latest.value)) return;
        const cue = latest.draftCue?.(latest.value);
        if (cue && latest.onDraftCue) { cueSent.current = true; cueSignature.current = signature; latest.onDraftCue(latest.value, cue); }
      }, 1200);
      return;
    }
    timer.current = setTimeout(() => {
      const latest = current.current, signature = `${entry.taskKey}:${entry.value}`;
      if (composing.current || latest.disabled || latest.taskKey !== entry.taskKey || latest.value !== entry.value || fired.current === signature || !latest.accepts(latest.value)) return;
      fired.current = signature; commit(latest.value);
    }, 450);
  }
  useEffect(() => { edited.current = false; fired.current = ''; cueSent.current = false; cueSignature.current = ''; cancel(); }, [taskKey]);
  useEffect(() => { schedule(); return cancel; }, [taskKey, value, disabled]);
  return <section className="answer-studio" aria-label="Tu reto de escritura">
    <div className={`answer-studio-prompt${scene ? ' has-scene' : ''}`}>
      {scene ? <div className="answer-studio-scene">{scene}</div> : null}
      <div className="answer-studio-question"><label className="answer-studio-instruction" htmlFor={id}>{instruction}</label><div className="answer-studio-target" id={`${id}-target`} lang="es">{target}</div></div>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); cancel(); if (!disabled && !composing.current && value.trim()) commit(value); }}>
      <input ref={field} id={id} aria-describedby={`${id}-target ${id}-status${feedback ? ` ${id}-feedback` : ''}`} lang="en" value={value} onChange={(event) => { edited.current = true; onChange(event.target.value); }} onCompositionStart={() => { composing.current = true; cancel(); }} onCompositionEnd={() => { composing.current = false; schedule(); }} autoComplete="off" autoCapitalize="none" enterKeyHint="send" spellCheck={false} disabled={disabled} placeholder="Tu respuesta" />
    </form>
    {feedback ? <div id={`${id}-feedback`} className="answer-studio-feedback" role="status">{feedback}</div> : null}
    <p id={`${id}-status`} className="answer-studio-status">Se reconoce al acertar. <kbd aria-label="Enter">↵</kbd> para revisar.</p>
  </section>;
}
