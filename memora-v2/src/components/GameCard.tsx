import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './verticalEpisode.css';

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
  /** Native vertical scroll within a prepared episode, never an answer. */
  vertical?: boolean;
  stepKey?: string;
}

/** La misma superficie y física para asociaciones, recompensas y gramática. */
export function GameCard({ children, back, onAdvance, advanceLabel = 'Conecta', reserveFooter = false, revealFooter = true, className = '', showBack, advanceControl = false, vertical = false, stepKey = '' }: GameCardProps) {
  const [dragX, setDragX] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startX = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const advancing = useRef(false);
  const isFlipped = showBack ?? flipped;
  const scrollport = useRef<HTMLDivElement>(null);
  const armed = useRef(false);
  const touchStart = useRef<number>();
  const wheelGesture = useRef({ at: -Infinity, allowed: false });
  const available = useRef({ onAdvance, revealFooter, isFlipped, stepKey });
  available.current = { onAdvance, revealFooter, isFlipped, stepKey };

  useEffect(() => {
    armed.current = false;
    touchStart.current = undefined;
    if (scrollport.current) scrollport.current.scrollTop = 0;
  }, [vertical, stepKey]);
  useEffect(() => { armed.current = false; touchStart.current = undefined; }, [Boolean(onAdvance), revealFooter]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  function advance() {
    if (!onAdvance || advancing.current || vertical && (!revealFooter || isFlipped)) return;
    advancing.current = true;
    if (vertical) { armed.current = false; touchStart.current = undefined; wheelGesture.current.allowed = false; }
    const origin = stepKey;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setDragX(reduced ? 0 : -800);
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
    if (isFlipped || exiting || !onAdvance || (event.target as HTMLElement).closest('button,input,textarea,select,a')) return;
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
    if ((event.target as HTMLElement).closest('button,input,textarea,select,a')) return;
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
    const interactive = (target: EventTarget) => Boolean((target as HTMLElement).closest?.('button,input,textarea,select,a,summary,[contenteditable="true"],[draggable="true"],[role="button"]'));
    const arm = (target: EventTarget) => { armed.current = Boolean(onAdvance && revealFooter && !interactive(target) && !window.getSelection?.()?.toString()); };
    return <div className={`game-card-anchor card-vertical ${className}`}>
      <div ref={scrollport} className={`card-vertical-scroll${exiting ? ' is-exiting' : ''}`} role="region" aria-label="Encuentro de aprendizaje. Desplázate hacia arriba para continuar cuando esté preparado." tabIndex={0}
        style={{ transform: `translate3d(0, ${dragX}px, 0)` }}
        onPointerDown={() => { armed.current = false; }}
        onTouchStart={(event) => { armed.current = false; touchStart.current = event.touches.length === 1 && !interactive(event.target) ? event.touches[0].clientY : undefined; }}
        onTouchMove={(event) => {
          if (touchStart.current === undefined || event.touches.length !== 1) return;
          const distance = touchStart.current - event.touches[0].clientY;
          if (distance < 8) return;
          arm(event.target);
          const node = scrollport.current;
          if (armed.current && distance > 75 && node && node.scrollTop >= node.scrollHeight - node.clientHeight - 2) { armed.current = false; advance(); }
        }}
        onTouchCancel={() => { touchStart.current = undefined; armed.current = false; }}
        onWheel={(event) => {
          if (event.deltaY <= 0) { armed.current = false; return; }
          const now = Date.now();
          const fresh = now - wheelGesture.current.at > 180;
          wheelGesture.current.at = now;
          if (fresh) wheelGesture.current.allowed = Boolean(onAdvance && revealFooter);
          if (!wheelGesture.current.allowed) return;
          arm(event.target);
          const node = scrollport.current;
          if (armed.current && event.deltaY >= 40 && node && node.scrollTop >= node.scrollHeight - node.clientHeight - 2) { armed.current = false; advance(); }
        }}
        onKeyDown={(event) => { if (!event.repeat && ['ArrowDown', 'PageDown', 'End', ' '].includes(event.key) && !interactive(event.target)) arm(event.target); }}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (!armed.current || !onAdvance || !revealFooter || window.getSelection?.()?.toString()) return;
          if (node.scrollHeight > node.clientHeight && node.scrollTop >= node.scrollHeight - node.clientHeight - 2) { armed.current = false; advance(); }
        }}>
        <article className="game-card-face card-vertical-page"><div className="game-card-body">{children}{back ? <details className="card-vertical-memory"><summary>Recordar la escena</summary>{back}</details> : null}</div></article>
        {onAdvance && revealFooter ? <footer className="card-vertical-next"><button type="button" onClick={advance} disabled={exiting} aria-label={advanceLabel}><span aria-hidden="true">↑</span> Desliza para continuar<span className="sr-only"> o pulsa aquí. {advanceLabel}</span></button></footer> : null}
      </div>
    </div>;
  }

  return (
    <div className={`game-card-anchor ${className}`}>
      <div
        className={`game-card-swipe ${exiting ? 'is-exiting' : ''}`}
        style={{ transform: `translate3d(${dragX}px, 0, 0) rotate(${Math.max(-10, Math.min(10, dragX / 22))}deg)` }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => { startX.current = null; setDragX(0); }}
        onKeyDown={keyDown}
        tabIndex={onAdvance ? 0 : undefined}
        role="group"
        aria-label="Tarjeta de aprendizaje"
      >
        {dragX < -35 && onAdvance ? <span className="game-card-stamp">🔥 CONECTA</span> : null}
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
