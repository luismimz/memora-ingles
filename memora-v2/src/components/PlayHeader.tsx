import type { Appearance } from '../useAppearance';
import type { ReactNode } from 'react';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import './playFlow.css';
import { useDisclosureDismissal } from './useDisclosureDismissal';
import { usePlayFeed } from './GameCard';

/** A shared play surface, not a new learning flow or progress store. */
export function PlayHeader({ title, onExit, appearance, onToggleAppearance, syncStatus, inspection = false, progress, position, trail, additionalControls, backLabel = '← Recorrido' }: {
  title: string; onExit: () => void; appearance: Appearance; onToggleAppearance: () => void;
  syncStatus?: SyncStatus; inspection?: boolean; progress?: number; position?: string; backLabel?: string;
  additionalControls?: ReactNode;
  /** Location only, never inferred completion, prerequisites or a navigation control. */
  trail?: { steps: string[]; current: number };
}) {
  const { trigger, onKeyDown } = useDisclosureDismissal();
  const immersive = usePlayFeed();
  const saved = inspection ? 'Vista de revisión · no guarda progreso' : syncStatus ? syncLabels[syncStatus] : 'Progreso en este dispositivo';
  const warning = !inspection && (syncStatus === 'offline' || syncStatus === 'error' || syncStatus === 'storage-full');
  const currentTrail = trail && trail.current >= 0 && trail.current < trail.steps.length ? trail : undefined;
  const positionValue = progress !== undefined && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress))
    : progress === undefined && currentTrail ? currentTrail.current / Math.max(1, currentTrail.steps.length - 1) * 100 : undefined;
  return <>
    <header className="play-header">
      {immersive ? <span className="play-brand-mark" aria-label="Memora">M</span> : <button type="button" className="activity-back" onClick={onExit}>{backLabel}</button>}
      <div className="play-header-context"><p className="play-intention">{title}</p>{positionValue !== undefined ? <div className="play-position-track" role="progressbar" aria-label="Posición en esta actividad; no mide dominio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={positionValue}><span style={{ width: `${positionValue}%` }} /></div> : null}</div>
      <details className="play-options" onKeyDown={onKeyDown} onClick={(event) => { if ((event.target as HTMLElement).closest?.('button')) event.currentTarget.open = false; }}>
        <summary ref={trigger} aria-label="Opciones y estado de guardado" title="Opciones y guardado">•••<span className={`play-save-dot${warning ? ' needs-attention' : ''}`} aria-hidden="true" /></summary>
        <div className="play-options-panel">
          {immersive ? <button type="button" className="activity-back" onClick={onExit}>{backLabel}</button> : null}
          <p>{inspection ? 'Revisión' : position ?? 'MEMORA · EN JUEGO'}</p>
          <p role="status">{saved}</p>
          {progress !== undefined && Number.isFinite(progress) ? <small>Avance de esta tanda: {Math.max(0, Math.min(100, progress))} %. No mide dominio.</small> : null}
          <button type="button" className="quiet-action" onClick={onToggleAppearance}>Activar modo {appearance === 'light' ? 'oscuro' : 'claro'}</button>
          {additionalControls}
          <small>Puedes salir y retomar la actividad. Deslizar nunca responde por ti.</small>
          {currentTrail ? <ol className="play-trail" aria-label="Dónde estoy en esta práctica">
            {currentTrail.steps.map((step, index) => <li key={step} aria-current={index === currentTrail.current ? 'step' : undefined}>{step}</li>)}
          </ol> : null}
        </div>
      </details>
    </header>
    {warning ? <p className="play-save-warning" role={syncStatus === 'storage-full' ? 'alert' : 'status'}>{saved}</p> : null}
  </>;
}
