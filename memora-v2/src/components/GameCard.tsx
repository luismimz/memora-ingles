import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './verticalEpisode.css';

const interactiveCardTarget = (target: EventTarget) => Boolean((target as HTMLElement).closest?.('button,input,textarea,select,a,summary,[contenteditable="true"],[draggable="true"],[role="button"]'));

interface GameCardProps {
  children: ReactNode;
  back?: ReactNode;
  onAdvance?: () => void;
  advanceLabel?: string;
  reserveFooter?: boolean;
  revealFooter?: boolean;
  className?: string;
  showBack?: boolean;
  /** Opt in when the card has no primary button of its own. Gestures stay optional. */
  advanceControl?: boolean;
  /** Vertical feed: reading scrolls normally; a fresh upward gesture at the end continues only when ready. */
  vertical?: boolean;
  stepKey?: string;
  /** Observed task state only. Color accompanies the existing textual feedback. */
  feedback?: 'correct' | 'retry' | 'model';
}

/** La misma superficie y física para asociaciones, recompensas y gramática. */
export function GameCard({ children, back, onAdvance, advanceLabel = 'Conecta', reserveFooter = false, revealFooter = true, className = '', showBack, advanceControl = false, vertical = false, stepKey = '', feedback }: GameCardProps) {
  const verticalAdvanceLabel = advanceLabel.replace(/\s*→\s*$/u, '');
  const [dragX, setDragX] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startX = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const advancing = useRef(false);
  const isFlipped = showBack ?? flipped;
  const scrollport = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number }>();
  const wheelGesture = useRef({ at: -Infinity, allowed: false, distance: 0 });
  const available = useRef({ onAdvance, revealFooter, isFlipped, stepKey });
  available.current = { onAdvance, revealFooter, isFlipped, stepKey };

  useEffect(() => {
    touchStart.current = undefined;
    wheelGesture.current.allowed = false;
    wheelGesture.current.distance = 0;
    if (!advancing.current) setDragX(0);
    if (scrollport.current) scrollport.current.scrollTop = 0;
  }, [vertical, stepKey]);
  useEffect(() => { touchStart.current = undefined; wheelGesture.current.allowed = false; wheelGesture.current.distance = 0; }, [Boolean(onAdvance), revealFooter]);

  useEffect(() => {
    // Only repair a lost entry focus. Narration, feedback and stepKey changes
    // must never pull focus away from a field, header control or open dialog.
    if (typeof document === 'undefined' || !document.activeElement || document.activeElement !== document.body) return;
    scrollport.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  function advance() {
    if (!onAdvance || advancing.current || vertical && (!revealFooter || isFlipped)) return;
    advancing.current = true;
    if (vertical) { touchStart.current = undefined; wheelGesture.current.allowed = false; }
    const origin = stepKey;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setDragX(reduced ? 0 : vertical ? -32 : -800);
    setExiting(true);
    timer.current = window.setTimeout(() => {
      // A step can change inside this same card (not always unmount it).
      // Reset its motion before rendering the destination, or it stays offscreen.
      startX.current = null;
      advancing.current = false;
      setDragX(0);
      setExiting(false);
      const current = available.current;
      if (!vertical || current.stepKey === origin && current.revealFooter && !current.isFlipped) current.onAdvance?.();
    }, reduced ? 0 : 230);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (isFlipped || exiting || !onAdvance || interactiveCardTarget(event.target)) return;
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    setDragX(Math.max(-240, Math.min(240, event.clientX - startX.current)));
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const moved = event.clientX - startX.current;
    startX.current = null;
    if (moved < -95 && onAdvance) {
      advance();
      return;
    }
    setDragX(0);
    if (moved > 95 && back) {
      setFlipped(true);
      timer.current = window.setTimeout(() => setFlipped(false), 1500);
    }
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || interactiveCardTarget(event.target) || window.getSelection?.()?.toString()) return;
    if (event.key === 'ArrowLeft' && onAdvance && !exiting) {
      event.preventDefault();
      advance();
    } else if (event.key === 'ArrowRight' && back && !flipped) {
      event.preventDefault();
      setFlipped(true);
      timer.current = window.setTimeout(() => setFlipped(false), 1500);
    }
  }

  if (vertical) {
    const atEnd = (node: HTMLElement) => node.scrollTop >= node.scrollHeight - node.clientHeight - 2;
    const canLeave = (target: EventTarget) => {
      // A large scene may be both tappable and the feed's swipe surface. This
      // explicit opt-in never enables scrolling through answer tiles or inputs.
      const surface = (target as HTMLElement).closest?.('[data-feed-surface]');
      const sceneSurface = surface?.getAttribute?.('data-feed-surface') === 'true';
      return Boolean(onAdvance && revealFooter && (!interactiveCardTarget(target) || sceneSurface) && !window.getSelection?.()?.toString());
    };
    return <div className={`game-card-anchor card-vertical ${className}`} data-feedback={feedback}>
      <div ref={scrollport} className={`card-vertical-scroll${exiting ? ' is-exiting' : dragX < 0 ? ' is-following-touch' : ''}`} role="region" aria-label="Contenido de la actividad. Desplázate para leer; el botón de avance está fuera del texto cuando puedes seguir." tabIndex={0}
        style={{ transform: `translate3d(0, ${dragX}px, 0)` }}
        onPointerDown={() => { touchStart.current = undefined; }}
        onTouchStart={(event) => { touchStart.current = event.touches.length === 1 && canLeave(event.target) && atEnd(event.currentTarget) ? { x: event.touches[0].clientX ?? 0, y: event.touches[0].clientY } : undefined; }}
        onTouchMove={(event) => {
          if (touchStart.current === undefined || event.touches.length !== 1) return;
          const distance = touchStart.current.y - event.touches[0].clientY;
          const across = Math.abs((event.touches[0].clientX ?? touchStart.current.x) - touchStart.current.x);
          if (across > Math.max(12, distance)) { touchStart.current = undefined; if (!advancing.current) setDragX(0); return; }
          if (!canLeave(event.target) || !atEnd(event.currentTarget)) return;
          if (!advancing.current) setDragX(-Math.min(32, Math.max(0, distance) * .42));
          if (distance >= 48) advance();
        }}
        onTouchCancel={() => { touchStart.current = undefined; if (!advancing.current) setDragX(0); }}
        onTouchEnd={() => { touchStart.current = undefined; if (!advancing.current) setDragX(0); }}
        onWheel={(event) => {
          const now = Date.now();
          const fresh = now - wheelGesture.current.at > 180;
          wheelGesture.current.at = now;
          if (event.ctrlKey || event.deltaY <= 0 || Math.abs(event.deltaX ?? 0) > event.deltaY) { wheelGesture.current.allowed = false; wheelGesture.current.distance = 0; return; }
          // A wheel burst that starts while reading must only scroll, even if
          // inertia reaches the end. A new burst at the end can continue.
          if (fresh) { wheelGesture.current.allowed = canLeave(event.target) && atEnd(event.currentTarget); wheelGesture.current.distance = 0; }
          if (!wheelGesture.current.allowed) return;
          if (!canLeave(event.target) || !atEnd(event.currentTarget)) { wheelGesture.current.allowed = false; wheelGesture.current.distance = 0; return; }
          const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? event.currentTarget.clientHeight : 1);
          wheelGesture.current.distance += pixels;
          if (wheelGesture.current.distance >= 60) advance();
        }}
        onScroll={(event) => {
          // Reading, layout changes and programmatic scroll never navigate.
          if (!atEnd(event.currentTarget)) { touchStart.current = undefined; if (!advancing.current) setDragX(0); }
        }}>
        <article className="game-card-face card-vertical-page"><div className="game-card-body">{children}{back ? <details className="card-vertical-memory"><summary>Recordar la escena</summary>{back}</details> : null}</div></article>
      </div>
      {onAdvance && revealFooter ? <footer className="card-vertical-next"><button type="button" onClick={advance} disabled={exiting} aria-label={verticalAdvanceLabel} title="Desliza hacia arriba o toca para seguir"><span>{verticalAdvanceLabel}</span><span className="feed-next-arrow" aria-hidden="true">↑</span></button></footer> : <div className="card-vertical-rest" aria-hidden="true" />}
    </div>;
  }

  return (
    <div className={`game-card-anchor ${className}`} data-feedback={feedback}>
      <div
        ref={scrollport}
        className={`game-card-swipe ${exiting ? 'is-exiting' : ''}`}
        style={{ transform: `translate3d(${dragX}px, 0, 0) rotate(${Math.max(-10, Math.min(10, dragX / 22))}deg)` }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => { startX.current = null; setDragX(0); }}
        onKeyDown={keyDown}
        tabIndex={onAdvance ? 0 : -1}
        role="group"
        aria-label="Tarjeta de aprendizaje"
      >
        {dragX < -35 && onAdvance ? <span className="game-card-stamp">Continuar</span> : null}
        <div className={`game-card-flip ${isFlipped ? 'is-flipped' : ''}`}>
          <article className="game-card-face game-card-front" aria-hidden={isFlipped}>
            <div className="game-card-body">{children}</div>
            {onAdvance || reserveFooter ? <footer className={`game-card-footer ${revealFooter ? '' : 'is-pending'}`} aria-hidden={!revealFooter}>{advanceControl ? <button type="button" className="card-advance" disabled={!onAdvance || !revealFooter || exiting || isFlipped} onClick={advance}>{advanceLabel || 'Continuar'} <span aria-hidden="true">→</span></button> : <span><span className="gesture-touch">{advanceLabel ? `${advanceLabel} · ` : ''}desliza ←</span><span className="gesture-pointer">{advanceLabel ? `${advanceLabel} · ` : ''}arrastra ← <small>o pulsa ←</small></span></span>}<span>{back ? <><span className="gesture-touch">Recuerda la escena →</span><span className="gesture-pointer">Pista · arrastra →</span></> : ''}</span></footer> : null}
          </article>
          {back ? <article className="game-card-face game-card-back" aria-hidden={!isFlipped}>{back}</article> : null}
        </div>
      </div>
    </div>
  );
}
