import { useId, useState } from 'react';
import './explainBack.css';

/** Optional self-explanation, never an automatic correctness/phonetic score. */
export function ExplainBack({ prompt, model, draft, compared, onDraft, onCompare }: {
  prompt: string; model: string; draft: string; compared: boolean;
  onDraft: (draft: string) => void; onCompare: () => void;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(Boolean(draft || compared));
  return <details className="explain-back" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Explícaselo a Nora <small>Opcional</small></summary>
    <label htmlFor={fieldId}>{prompt}</label>
    <textarea id={fieldId} value={draft} maxLength={500} rows={2} placeholder="Con tus palabras…" onChange={(event) => onDraft(event.target.value.slice(0, 500))} />
    <button type="button" className="quiet-action" disabled={compared} onClick={onCompare}>{compared ? 'Comparación guardada' : draft.trim() ? 'Comparar mi explicación' : 'Ver el truco sin escribir'}</button>
    {compared ? <div className="explain-back-model" role="status"><p>{model}</p><small>Compáralo con tu idea. No hemos evaluado tu explicación.</small></div> : null}
  </details>;
}
