import { type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion';
import type { DiscoveryCard } from './discovery.types';
import { DiscoveryCardContent } from './DiscoveryCard';

export interface AssociationCardProps {
  card: DiscoveryCard;
  /** Se ejecuta cuando el gesto supera el umbral de decisión. */
  onDecision: (direction: 'left' | 'right') => void;
  /** Cambia cada vez que la UI necesita reforzar el estado de “sin alternativa”. */
  shakeToken?: number;
  /** Reintenta el audio tras el primer gesto, cuando el navegador bloqueó el autoplay. */
  onAudioUnlock?: () => void;
}

/**
 * Carta de descubrimiento. La capa exterior solo se ocupa del gesto; el
 * contenido interior puede hacer el pequeño shake sin pelearse con el
 * MotionValue de arrastre.
 */
export function AssociationCard({ card, onDecision, shakeToken = 0, onAudioUnlock }: AssociationCardProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-8, 0, 8]);
  // Izquierda acepta la asociación; derecha solicita otra opción.
  const connectOpacity = useTransform(x, [-190, -100, -24], [1, 0.55, 0]);
  const anotherOpacity = useTransform(x, [24, 100, 190], [0, 0.55, 1]);

  const resetPosition = () => {
    void animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 100) {
      resetPosition();
      return;
    }
    onDecision(info.offset.x > 0 ? 'right' : 'left');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    onAudioUnlock?.();
    onDecision(event.key === 'ArrowRight' ? 'right' : 'left');
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Prevent a long-press from selecting text while the card is being moved.
    if (event.pointerType === 'touch') event.currentTarget.style.userSelect = 'none';
    onAudioUnlock?.();
  };

  return (
    <motion.div
      className="discovery-card-shell"
      drag="x"
      dragConstraints={{ left: -280, right: 280 }}
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      role="group"
      aria-label={`${card.word.en}: ${card.word.es}`}
      tabIndex={0}
      style={{ x, rotate }}
    >
      <motion.div className="discovery-swipe-stamp discovery-swipe-stamp-left" style={{ opacity: connectOpacity }} aria-hidden="true">
        <span>🔥</span> Conecta
      </motion.div>
      <motion.div className="discovery-swipe-stamp discovery-swipe-stamp-right" style={{ opacity: anotherOpacity }} aria-hidden="true">
        <span>🔄</span> Otra opción
      </motion.div>

      <motion.article
        key={`${card.association.id}-${shakeToken}`}
        className="discovery-card-surface"
        animate={shakeToken > 0 && !reduceMotion ? { x: [0, -13, 13, -9, 9, 0] } : { x: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: 'easeInOut' }}
      >
        <DiscoveryCardContent card={card} onAudioUnlock={onAudioUnlock} />

        <footer className="discovery-card-footer">
          <span>← Conecta (desliza izquierda)</span>
          <span>Otra opción (desliza derecha) →</span>
        </footer>
      </motion.article>
    </motion.div>
  );
}
