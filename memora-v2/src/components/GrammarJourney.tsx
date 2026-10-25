import type { AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { grammarJourney, missingGrammarStop, completedGrammarStop } from '../domain/grammarJourney';
import { readWordMemories } from '../domain/memory';
import { readLearningActivities } from '../domain/learningActivity';
import { JourneyMap } from './JourneyMap';
import type { Appearance } from '../useAppearance';
import './homeV2.css';
import './homeGuided.css';
import './grammarJourney.css';
import { useEffect, useRef, useState } from 'react';

export function GrammarJourney({ units, userId, inspection, resumeId, notice, onRetry, onOpen, onPrepare, onBack, onArcade, onEvolution, appearance, onToggleAppearance }: {
  units: AtomicUnit[]; userId: string; inspection: boolean; resumeId?: string | null; notice?: string | null; onRetry: () => void;
  onOpen: (stop: UnitSummary) => void; onBack: () => void; onArcade: () => void; onEvolution?: () => void; appearance: Appearance; onToggleAppearance: () => void;
  onPrepare?: (stop: UnitSummary) => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState<UnitSummary | null>(null);
  const requirements = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) requirements.current?.focus(); }, [selected]);
  const route = grammarJourney(units);
  const memories = readWordMemories(userId);
  const activities = readLearningActivities(userId);
  const completedIds = new Set(route.filter((stop) => completedGrammarStop(stop, activities)).map((stop) => stop.id));
  const lockedIds = new Set(inspection ? [] : route.filter((stop) => missingGrammarStop(stop, units, memories, userId).length).map((stop) => stop.id));
  const resumed = route.find((stop) => stop.id === resumeId && !lockedIds.has(stop.id));
  const current = (resumed && !completedIds.has(resumed.id) ? resumed : undefined) ?? route.find((stop) => !lockedIds.has(stop.id) && !completedIds.has(stop.id)) ?? resumed ?? route.find((stop) => !lockedIds.has(stop.id)) ?? route[0];
  const selectedLocked = selected && lockedIds.has(selected.id) ? selected : null;
  const requirementStop = selectedLocked ?? current;
  const missing = requirementStop ? missingGrammarStop(requirementStop, units, memories, userId) : [];
  const needsWords = route.length > 0 && !route.some((stop) => !lockedIds.has(stop.id));
  const canContinue = Boolean(current && (!lockedIds.has(current.id) || completedIds.has(current.id)));
  return <main className="journey-screen home-v2 grammar-journey">
    <header className="home-guided-header">
      <button type="button" className="home-text-button" onClick={onBack}>← Inicio</button>
      <span className="home-header-caption">Tus frases · un paso cada vez</span>
      <details className="home-navigation"><summary>Menú <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Opciones de gramática">
          <button type="button" onClick={onArcade}>Arcade</button>
          <button type="button" onClick={onEvolution} disabled={!onEvolution}>Mi evolución</button>
          <button type="button" onClick={onToggleAppearance}>Activar modo {appearance === 'light' ? 'oscuro' : 'claro'}</button>
        </nav>
      </details>
    </header>
    {notice ? <div className="journey-error" role="status"><p>{notice}</p><button type="button" className="quiet-action" onClick={onRetry}>Volver a intentar</button></div> : null}
    <div className="grammar-guided-content">
      <p className="grammar-location">{completedIds.size} de {route.length} prácticas de frases registradas · no mide dominio</p>
      {current ? <section className="grammar-next" aria-labelledby="grammar-next-title">
        <p className="eyebrow">{canContinue ? resumed?.id === current.id && !completedIds.has(current.id) ? 'RETOMA TU FRASE' : completedIds.has(current.id) ? 'PRÁCTICA CONOCIDA' : 'AHORA TE TOCA' : 'PRIMERO, SUS PALABRAS'}</p>
        <h1 id="grammar-next-title">{current.title}</h1>
        <p>{canContinue ? 'Descubre cómo decirlo, monta el mensaje y úsalo. Puedes salir y retomarlo.' : 'Esta frase necesita palabras que todavía debes preparar.'}</p>
        {canContinue ? <button type="button" className="primary-action" onClick={() => onOpen(current)}>{completedIds.has(current.id) ? 'Volver a practicar →' : 'Continuar con esta frase →'}</button> : null}
      </section> : <section className="journey-empty"><h1>Este camino está preparándose.</h1><p>Aún no hay trucos publicados disponibles. Puedes seguir jugando en Inicio.</p><button type="button" className="primary-action" onClick={onBack}>Volver al juego →</button></section>}
      {needsWords || selectedLocked ? <section ref={requirements} tabIndex={-1} className="grammar-journey-hint" aria-live="polite" aria-label="Palabras necesarias para el truco">{selectedLocked ? <p><strong>{selectedLocked.title}</strong></p> : null}<p>Para jugar, prepara estas palabras: <strong>{missing.join(', ')}</strong>.</p><button type="button" className="quiet-action" onClick={() => { if (onPrepare && requirementStop) onPrepare(requirementStop); else onBack(); }}>{onPrepare ? 'Aprender estas palabras →' : 'Preparar palabras en Inicio →'}</button></section> : null}
      {route.length ? <details className="grammar-route" onToggle={(event) => setShowMap(event.currentTarget.open)}>
        <summary>Ver mi recorrido de frases <small>Ubicarme o elegir otra práctica</small></summary>
        {showMap ? <JourneyMap units={route} currentId={current?.id} completedIds={completedIds} lockedIds={lockedIds} onOpen={onOpen} onLockedOpen={setSelected} continueLabel={current && completedIds.has(current.id) ? 'Volver a practicar →' : undefined} /> : null}
      </details> : null}
    </div>
    {inspection ? <p className="mirror-save">Vista de prueba · no guarda progreso</p> : null}
  </main>;
}
