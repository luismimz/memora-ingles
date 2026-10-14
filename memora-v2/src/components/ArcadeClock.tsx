import { stopSpeech } from '../services/audio';

export function ArcadeClock({ remaining, paused, revealed, onPause }: { remaining: number; paused: boolean; revealed: boolean; onPause: () => void }) {
  return <><div className={`micro-countdown ${remaining < 2000 ? 'is-urgent' : ''}`} role="progressbar" aria-label="Tiempo de esta ronda" aria-valuemin={0} aria-valuemax={6} aria-valuenow={revealed ? 0 : Math.ceil(remaining / 1000)}><span style={{ width: `${revealed ? 0 : remaining / 6000 * 100}%` }} /></div><div className="micro-clock"><span>{paused ? 'En pausa' : revealed ? 'Siguiente…' : `${Math.ceil(remaining / 1000)} s`}</span><button type="button" className="quiet-action" aria-pressed={paused} onClick={() => { stopSpeech(); onPause(); }}>{paused ? 'Seguir' : 'Pausar'}</button></div></>;
}

export function ArcadeCheckpoint({ onContinue, onExit }: { onContinue: () => void; onExit: () => void }) {
  return <div className="micro-content"><p className="eyebrow">15 RONDAS</p><h1>¿Seguimos?</h1><button type="button" className="primary-action" onClick={onContinue}>Seguir jugando →</button><button type="button" className="quiet-action" onClick={onExit}>Terminar</button></div>;
}
