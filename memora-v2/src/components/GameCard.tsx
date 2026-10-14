import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

interface GameCardProps {
  children: ReactNode;
  back?: ReactNode;
  onAdvance?: () => void;
  advanceLabel?: string;
  reserveFooter?: boolean;
  revealFooter?: boolean;
  className?: string;
  showBack?: boolean;
}

/** La misma superficie y física para asociaciones, recompensas y gramática. */
export function GameCard({ children, back, onAdvance, advanceLabel = 'Conecta', reserveFooter = false, revealFooter = true, className = '', showBack }: GameCardProps) {
  const [dragX, setDragX] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startX = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const advancing = useRef(false);
  const isFlipped = showBack ?? flipped;

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  function advance() {
    if (!onAdvance || advancing.current) return;
    advancing.current = true;
    setDragX(-800);
    setExiting(true);
    timer.current = window.setTimeout(() => {
      // A step can change inside this same card (not always unmount it).
      // Reset its motion before rendering the destination, or it stays offscreen.
      startX.current = null;
      advancing.current = false;
      setDragX(0);
      setExiting(false);
      onAdvance();
    }, 230);
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
            {onAdvance || reserveFooter ? <footer className={`game-card-footer ${revealFooter ? '' : 'is-pending'}`} aria-hidden={!revealFooter}><span><span className="gesture-touch">{advanceLabel ? `${advanceLabel} · ` : ''}desliza ←</span><span className="gesture-pointer">{advanceLabel ? `${advanceLabel} · ` : ''}arrastra ← <small>o pulsa ←</small></span></span><span>{back ? <><span className="gesture-touch">Recuerda la escena →</span><span className="gesture-pointer">Pista · arrastra →</span></> : ''}</span></footer> : null}
          </article>
          {back ? <article className="game-card-face game-card-back" aria-hidden={!isFlipped}>{back}</article> : null}
        </div>
      </div>
    </div>
  );
}
