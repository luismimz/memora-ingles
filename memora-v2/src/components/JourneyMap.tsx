import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { UnitSummary } from '../services/directus';
import { journeyPresentation, mapPath, mapPosition, mapScrollTarget, MAP_STEP, MAP_TOP, MAP_NODE_WIDTH } from '../domain/journeyMap';
import { JourneyScene } from './JourneyScene';
import './journeyMap.css';

type Props = { units: UnitSummary[]; currentId?: string; completedIds: ReadonlySet<string>; lockedIds?: ReadonlySet<string>; onOpen: (unit: UnitSummary) => void };

export function JourneyMap({ units, currentId, completedIds, lockedIds, onOpen }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [away, setAway] = useState(false);
  const initial = useRef(true);
  const gesture = useRef<{ id: number; y: number; top: number; moved: boolean } | null>(null);
  const suppressClickUntil = useRef(0);
  const activeIndex = Math.max(0, units.findIndex((unit) => unit.id === currentId));
  const current = units[activeIndex];
  const height = MAP_TOP * 2 + Math.max(0, units.length - 1) * MAP_STEP;

  function moveTo(index: number, animate = true) {
    const element = viewport.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ top: mapScrollTarget(index, units.length, element.clientHeight), behavior: animate && !reduced ? 'smooth' : 'auto' });
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    setWidth(element.clientWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    moveTo(activeIndex, !initial.current);
    initial.current = false;
  }, [currentId, units.length]); // Only recenter when the actual learning position changes.

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    gesture.current = { id: event.pointerId, y: event.clientY, top: event.currentTarget.scrollTop, moved: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!event.buttons) { gesture.current = null; return; }
    const delta = event.clientY - drag.y;
    if (Math.abs(delta) > 7 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('is-dragging');
    }
    if (drag.moved) {
      event.preventDefault();
      event.currentTarget.scrollTop = drag.top - delta;
    }
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.moved) suppressClickUntil.current = performance.now() + 300;
    gesture.current = null;
    event.currentTarget.classList.remove('is-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const element = event.currentTarget;
    const distances: Record<string, number> = { ArrowDown: MAP_STEP, ArrowUp: -MAP_STEP, PageDown: element.clientHeight * .8, PageUp: -element.clientHeight * .8 };
    if (event.key in distances) { event.preventDefault(); element.scrollBy({ top: distances[event.key], behavior: 'auto' }); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); moveTo(event.key === 'Home' ? 0 : units.length - 1); }
  }

  return <section className="journey-map-section" aria-labelledby="journey-map-title">
    <div className="journey-map-heading"><div><h2 id="journey-map-title">Tu camino</h2><p id="journey-map-help">Arrastra el mapa. Toca para jugar.<span className="map-keyboard-help"> También puedes usar la rueda, Tab y las flechas.</span></p></div></div>
    <div className="journey-map-shell">
      <div className="journey-map-toolbar"><span aria-label={current ? `Tu posición · parada ${activeIndex + 1} de ${units.length}` : 'Tu recorrido'}>{current ? `Parada ${activeIndex + 1} de ${units.length}` : 'Tu recorrido'}</span><button type="button" onClick={() => moveTo(activeIndex)} disabled={!away} aria-label="Volver a mi posición">◎ Mi posición</button></div>
      <div ref={viewport} className="journey-map-viewport" role="region" aria-label="Mapa de tu recorrido" aria-describedby="journey-map-help" tabIndex={0}
        onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        onClickCapture={(event) => { if (performance.now() < suppressClickUntil.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}
        onScroll={() => { const element = viewport.current; if (element) setAway(Math.abs(element.scrollTop - mapScrollTarget(activeIndex, units.length, element.clientHeight)) > MAP_STEP * .75); }}>
        <div className="journey-map-landscape" style={{ height }}>
          <svg className="journey-map-path" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><path className="map-path-shadow" d={mapPath(units.length, width)} /><path className="map-path-road" d={mapPath(units.length, width)} /><path className="map-path-dots" d={mapPath(units.length, width)} /></svg>
          <ol className="journey-map-stops" aria-label="Paradas del recorrido">{units.map((unit, index) => {
            const position = mapPosition(index, width);
            const presentation = journeyPresentation(unit);
            const active = unit.id === current?.id;
            const done = completedIds.has(unit.id);
            const locked = !done && Boolean(lockedIds?.has(unit.id));
            return <li key={unit.id} style={{ left: position.x, top: position.y, width: MAP_NODE_WIDTH }} className={`journey-map-stop ${active ? 'is-current' : ''} ${done ? 'is-complete' : ''}`}>
              <button type="button" className={unit.routeTrick ? 'journey-map-node is-trick' : 'journey-map-node'} disabled={locked} aria-current={active ? 'step' : undefined} aria-label={`Parada ${index + 1}: ${presentation.title}. ${locked ? 'Practica primero sus palabras. ' : active ? 'Continúa aquí. ' : done ? 'Completada. ' : ''}${presentation.terms}`} onClick={() => onOpen(unit)}>
                <span className="map-node-art"><JourneyScene scene={presentation.scene} /><span className="map-node-number">{done ? '✓' : index + 1}</span>{active ? <span className="map-you">ESTÁS AQUÍ</span> : null}</span>
                <span className="map-node-copy"><small>{done ? 'COMPLETADA' : locked ? '🔒 PREPARA SUS PALABRAS' : unit.routeTrick ? '✦ PARADA TRUCO' : active ? 'CONTINUAR' : presentation.place}</small><strong>{presentation.title}</strong><span>{presentation.terms || 'Descubre la escena'}</span></span>
              </button>
            </li>;
          })}</ol>
        </div>
      </div>
      <div className="journey-map-footer"><span>Explora a tu ritmo · tu progreso se conserva</span>{current ? <button type="button" onClick={() => onOpen(current)}>Continuar →</button> : null}</div>
    </div>
  </section>;
}
