import type { ReactNode } from 'react';

/** Presentation only: the caller still owns completion, navigation and evidence. */
export function PracticeClosure({ nextLabel, onContinue, onExit, onPractice, onEvolution, children }: {
  nextLabel?: string; onContinue?: () => void; onExit: () => void;
  onPractice?: () => void; onEvolution?: () => void; children?: ReactNode;
}) {
  return <div className="practice-closure">
    <div className="practice-closure-actions">
      {onContinue ? <button type="button" className="primary-action" onClick={onContinue}>{nextLabel ?? 'Continuar'}</button> : null}
      <button type="button" className="quiet-action" onClick={onExit}>Terminar por hoy</button>
    </div>
    {children || onPractice || onEvolution ? <details className="practice-closure-extras">
      <summary>Escuchar o practicar más <small>Opcional · puedes continuar sin abrirlo</small></summary>
      {children}
      <div className="practice-closure-links">
        {onPractice ? <button type="button" className="quiet-action" onClick={onPractice}>Arcade de asociaciones</button> : null}
        {onEvolution ? <button type="button" className="quiet-action" onClick={onEvolution}>Ver Mi evolución</button> : null}
      </div>
    </details> : null}
  </div>;
}
