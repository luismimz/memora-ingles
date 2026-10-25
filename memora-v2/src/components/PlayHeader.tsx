import type { Appearance } from '../useAppearance';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import './playFlow.css';
import { useDisclosureDismissal } from './useDisclosureDismissal';

/** A shared play surface, not a new learning flow or progress store. */
export function PlayHeader({ title, onExit, appearance, onToggleAppearance, syncStatus, inspection = false, progress, position, trail }: {
  title: string; onExit: () => void; appearance: Appearance; onToggleAppearance: () => void;
  syncStatus?: SyncStatus; inspection?: boolean; progress?: number; position?: string;
  /** Location only, never inferred completion, prerequisites or a navigation control. */
  trail?: { steps: string[]; current: number };
}) {
  const { trigger, onKeyDown } = useDisclosureDismissal();
  const saved = inspection ? 'Vista de revisión · no guarda progreso' : syncStatus ? syncLabels[syncStatus] : 'Progreso en este dispositivo';
  const warning = !inspection && (syncStatus === 'offline' || syncStatus === 'error' || syncStatus === 'storage-full');
  return <>
    <header className="play-header">
      <button type="button" className="activity-back" onClick={onExit}>← Recorrido</button>
      <div className="play-header-context"><span className="play-location-label">{position ?? 'TU PRÁCTICA DE INGLÉS'}</span><p className="play-intention">{title}</p></div>
      <details className="play-options" onKeyDown={onKeyDown}>
        <summary ref={trigger} aria-label="Opciones y estado de guardado" title="Opciones y guardado">•••<span className={`play-save-dot${warning ? ' needs-attention' : ''}`} aria-hidden="true" /></summary>
        <div className="play-options-panel">
          <p>{inspection ? 'Revisión' : position ?? 'MEMORA · EN JUEGO'}</p>
          <p role="status">{saved}</p>
          {progress !== undefined && Number.isFinite(progress) ? <small>Avance de esta tanda: {Math.max(0, Math.min(100, progress))} %. No mide dominio.</small> : null}
          <button type="button" className="quiet-action" onClick={onToggleAppearance}>Activar modo {appearance === 'light' ? 'oscuro' : 'claro'}</button>
          <small>Puedes salir y retomar la actividad. Deslizar nunca responde por ti.</small>
        </div>
      </details>
    </header>
    {trail && trail.current >= 0 && trail.current < trail.steps.length ? <ol className="play-trail" aria-label="Pasos de esta práctica: posición, no dominio">
      {trail.steps.map((step, index) => <li key={step} aria-current={index === trail.current ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{step}</li>)}
    </ol> : null}
    {warning ? <p className="play-save-warning" role={syncStatus === 'storage-full' ? 'alert' : 'status'}>{saved}</p> : null}
  </>;
}
