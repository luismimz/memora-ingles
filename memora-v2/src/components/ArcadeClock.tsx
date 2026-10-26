export function ArcadeClock({ remaining, paused, revealed, durationMs = 6000 }: { remaining: number; paused: boolean; revealed: boolean; durationMs?: number }) {
  return <><div className={`micro-countdown ${!revealed && remaining < 2000 ? 'is-urgent' : ''}`} role="progressbar" aria-label="Tiempo de esta ronda" aria-valuemin={0} aria-valuemax={Math.ceil(durationMs / 1000)} aria-valuenow={Math.ceil(remaining / 1000)}><span style={{ width: `${Math.min(100, Math.max(0, remaining / durationMs * 100))}%` }} /></div><div className="micro-clock"><span>{paused ? 'En pausa' : revealed ? 'Sin prisa · desliza para seguir' : `${Math.ceil(remaining / 1000)} s`}</span></div></>;
}

export function ArcadeCheckpoint({ onContinue, onExit, rounds = 15, inFeed = false }: { onContinue: () => void; onExit: () => void; rounds?: number; inFeed?: boolean }) {
  return <div className="micro-content"><p className="eyebrow">{rounds} {rounds === 1 ? 'RONDA' : 'RONDAS'}</p><h1>Repaso terminado</h1>{!inFeed ? <button type="button" className="primary-action" onClick={onExit}>Volver al recorrido →</button> : null}<button type="button" className="quiet-action" onClick={onContinue}>Jugar otra vez</button></div>;
}
