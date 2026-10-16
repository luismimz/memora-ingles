import type { AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { grammarJourney, missingGrammarStop, completedGrammarStop } from '../domain/grammarJourney';
import { readWordMemories } from '../domain/memory';
import { readLearningActivities } from '../domain/learningActivity';
import { JourneyMap } from './JourneyMap';
import type { Appearance } from '../useAppearance';
import './homeV2.css';
import { useEffect, useRef, useState } from 'react';

export function GrammarJourney({ units, userId, inspection, resumeId, notice, onRetry, onOpen, onPrepare, onBack, onArcade, onEvolution, appearance, onToggleAppearance }: {
  units: AtomicUnit[]; userId: string; inspection: boolean; resumeId?: string | null; notice?: string | null; onRetry: () => void;
  onOpen: (stop: UnitSummary) => void; onBack: () => void; onArcade: () => void; onEvolution?: () => void; appearance: Appearance; onToggleAppearance: () => void;
  onPrepare?: (stop: UnitSummary) => void;
}) {
  const [selected, setSelected] = useState<UnitSummary | null>(null);
  const requirements = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) requirements.current?.focus(); }, [selected]);
  const route = grammarJourney(units);
  const memories = readWordMemories(userId);
  const activities = readLearningActivities(userId);
  const completedIds = new Set(route.filter((stop) => completedGrammarStop(stop, activities)).map((stop) => stop.id));
  const lockedIds = new Set(inspection ? [] : route.filter((stop) => missingGrammarStop(stop, units, memories).length).map((stop) => stop.id));
  const resumed = route.find((stop) => stop.id === resumeId && !lockedIds.has(stop.id));
  const current = (resumed && !completedIds.has(resumed.id) ? resumed : undefined) ?? route.find((stop) => !lockedIds.has(stop.id) && !completedIds.has(stop.id)) ?? resumed ?? route.find((stop) => !lockedIds.has(stop.id)) ?? route[0];
  const selectedLocked = selected && lockedIds.has(selected.id) ? selected : null;
  const requirementStop = selectedLocked ?? current;
  const missing = requirementStop ? missingGrammarStop(requirementStop, units, memories) : [];
  const needsWords = route.length > 0 && !route.some((stop) => !lockedIds.has(stop.id));
  return <main className="journey-screen home-v2 grammar-journey">
    <div className={`home-play-hub ${route.length ? 'has-map' : ''}`}>
      <header className="journey-header home-header">
        <button type="button" className="home-text-button" onClick={onBack}>← Inicio</button>
        <nav className="home-nav" aria-label="Navegación principal"><button type="button" aria-current="page">Gramática</button><button type="button" onClick={onArcade}>Arcade</button><button type="button" onClick={onEvolution} disabled={!onEvolution}>Mi evolución</button></nav>
        <button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button>
      </header>
      {notice ? <div className="journey-error" role="status"><p>{notice}</p><button type="button" className="quiet-action" onClick={onRetry}>Volver a intentar</button></div> : null}
      <div className="home-hub-content">
        <div className="home-intro"><div><h1>Tus palabras, nuevos poderes</h1><p className="home-catalogue"><strong>{completedIds.size}/{route.length}</strong> trucos practicados · un paso cada vez</p></div></div>
        {needsWords || selectedLocked ? <section ref={requirements} tabIndex={-1} className="grammar-journey-hint" aria-live="polite" aria-label="Palabras necesarias para el truco">{selectedLocked ? <p><strong>{selectedLocked.title}</strong></p> : null}<p>Para jugar, prepara estas palabras: <strong>{missing.join(', ')}</strong>.</p><button type="button" className="quiet-action" onClick={() => { if (onPrepare && requirementStop) onPrepare(requirementStop); else onBack(); }}>{onPrepare ? 'Aprender estas palabras →' : 'Preparar palabras en Inicio →'}</button></section> : null}
        {route.length ? <JourneyMap units={route} currentId={current?.id} completedIds={completedIds} lockedIds={lockedIds} onOpen={onOpen} onLockedOpen={setSelected} continueLabel={current && completedIds.has(current.id) ? 'Volver a practicar →' : undefined} /> : <section className="journey-empty"><h2>Este camino está preparándose.</h2><p>Aún no hay trucos publicados disponibles. Puedes seguir jugando en Inicio.</p><button type="button" className="primary-action" onClick={onBack}>Volver al juego →</button></section>}
      </div>
    </div>
    {inspection ? <p className="mirror-save">Vista de prueba · no guarda progreso</p> : null}
  </main>;
}
