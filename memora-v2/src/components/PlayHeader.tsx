import type { Appearance } from '../useAppearance';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import './playFlow.css';

/** A shared play surface, not a new learning flow or progress store. */
export function PlayHeader({ title, onExit, appearance, onToggleAppearance, syncStatus, inspection = false, progress, position }: {
  title: string; onExit: () => void; appearance: Appearance; onToggleAppearance: () => void;
  syncStatus?: SyncStatus; inspection?: boolean; progress?: number; position?: string;
}) {
  const saved = inspection ? 'Vista de revisión · no guarda progreso' : syncStatus ? syncLabels[syncStatus] : 'Progreso en este dispositivo';
  const warning = !inspection && (syncStatus === 'offline' || syncStatus === 'error' || syncStatus === 'storage-full');
  return <>
    <header className="play-header">
      <button type="button" className="activity-back" onClick={onExit}>← Recorrido</button>
      <p className="play-intention">{title}</p>
      <details className="play-options">
        <summary aria-label="Opciones y estado de guardado" title="Opciones y guardado">•••<span className={`play-save-dot${warning ? ' needs-attention' : ''}`} aria-hidden="true" /></summary>
        <div className="play-options-panel">
          <p>{inspection ? 'Revisión' : position ?? 'MEMORA · EN JUEGO'}</p>
          <p role="status">{saved}</p>
          {progress !== undefined && Number.isFinite(progress) ? <small>Avance de esta tanda: {Math.max(0, Math.min(100, progress))} %. No mide dominio.</small> : null}
          <button type="button" className="quiet-action" onClick={onToggleAppearance}>Activar modo {appearance === 'light' ? 'oscuro' : 'claro'}</button>
          <small>Puedes salir y retomar la actividad. Deslizar nunca responde por ti.</small>
        </div>
      </details>
    </header>
    {warning ? <p className="play-save-warning" role={syncStatus === 'storage-full' ? 'alert' : 'status'}>{saved}</p> : null}
  </>;
}
