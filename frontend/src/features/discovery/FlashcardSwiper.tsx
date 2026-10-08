import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBox, playNaturalFast, toast } from '../../components/common';
import { useDiscoveryQueue } from './useDiscoveryQueue';
import type { DiscoveryCard, DiscoveryQueueResult } from './discovery.types';
import { AssociationCard } from './AssociationCard';
import { SentenceLaunch } from '../sentences/SentenceLaunch';
import { useNavigate } from 'react-router-dom';

export interface FlashcardSwiperProps {
  /** Se llama al pulsar “Crear la mía”; la pantalla padre decide dónde abrir el editor. */
  onCreateOwn?: (card: DiscoveryCard) => void;
  /** Permite que la pantalla padre registre el descarte o abra una explicación. */
  onSkipAssociation?: (card: DiscoveryCard) => void;
  /** Salida directa hacia la misión de frase construida con la ronda. */
  onContinueToSentences?: () => void;
  /** Nodo especial para convertir un phrasal verb en una fusión jugable. */
  onOpenAlchemy?: () => void;
  batchSize?: number;
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 24 };

/** Pantalla inmersiva de descubrimiento, sin esperas entre una tarjeta y la siguiente. */
export function FlashcardSwiper({ onCreateOwn, onSkipAssociation, onContinueToSentences, onOpenAlchemy, batchSize = 10 }: FlashcardSwiperProps) {
  const queue = useDiscoveryQueue({ batchSize, preloadAhead: 3, minimumAlternatives: 2 });
  return <FlashcardSwiperView queue={queue} onCreateOwn={onCreateOwn} onSkipAssociation={onSkipAssociation} onContinueToSentences={onContinueToSentences} onOpenAlchemy={onOpenAlchemy} />;
}

/**
 * Vista pura del swiper. DiscoveryPage la usa para compartir exactamente la
 * misma cola con el interceptor de recuperación, sin montar dos hooks.
 */
export function FlashcardSwiperView({ queue, onCreateOwn, onSkipAssociation, onContinueToSentences, onOpenAlchemy }: FlashcardSwiperProps & { queue: DiscoveryQueueResult }) {
  const navigate = useNavigate();
  const { current, status, error, progress, preloaded, swipeRight, swipeLeft, skipCurrent, retryPreload } = queue;
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [shakeToken, setShakeToken] = useState(0);
  const [showExhausted, setShowExhausted] = useState(false);

  // La narración empieza al entrar y vuelve a empezar solo cuando cambia la
  // tarjeta/asociación, nunca por cada render de la pantalla.
  useEffect(() => {
    if (status !== 'ready' || !current) return undefined;
    return playNaturalFast(current.audioText);
  }, [current?.association.id, current?.unitId, status]);

  useEffect(() => {
    setShowExhausted(false);
    setExitDirection(null);
  }, [current?.association.id, current?.unitId]);

  const decide = (direction: 'left' | 'right') => {
    if (!current || status !== 'ready') return;
    setExitDirection(direction);
    if (direction === 'right') {
      const result = swipeRight();
      if (result.type === 'accepted') toast('🔥 Asociación conectada. La pondremos a prueba más adelante.');
      return;
    }

    const result = swipeLeft();
    if (result.type === 'alternatives-exhausted') {
      setExitDirection(null);
      setShakeToken((value) => value + 1);
      setShowExhausted(true);
    }
  };

  const skip = () => {
    if (!current) return;
    onSkipAssociation?.(current);
    const result = skipCurrent();
    if (result.type === 'skipped') toast('Tarjeta apartada. Volveremos a ella con otra perspectiva.');
    setShowExhausted(false);
  };

  const createOwn = () => {
    if (!current) return;
    if (onCreateOwn) onCreateOwn(current);
    else toast('Aquí podrás crear una asociación que tenga sentido para ti.');
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="discovery-stage" aria-busy="true">
        <DiscoveryTopbar progress={progress} />
        <div className="discovery-loading" role="status">
          <motion.div className="discovery-loading-orb" animate={{ scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            🧠
          </motion.div>
          <h1>Calentando tu primera conexión…</h1>
          <p>Estamos dejando listas la voz y las siguientes tres asociaciones.</p>
          <div className="discovery-loading-skeleton" />
        </div>
      </main>
    );
  }

  if (status === 'empty') {
    return (
      <main className="discovery-stage discovery-stage-centered">
        <div className="discovery-complete-card">
          <span className="discovery-complete-icon">🧭</span>
          <p className="discovery-card-kicker">RUTA EN ESPERA</p>
          <h1>Aún no hay conexiones listas.</h1>
          <p>Vuelve a Hoy para preparar tu siguiente lote de palabras.</p>
          <button type="button" className="btn primary" onClick={() => navigate('/')}>Ir a Hoy →</button>
        </div>
      </main>
    );
  }

  if (status === 'complete') {
    return (
      <main className="discovery-stage discovery-stage-centered">
        <div className="discovery-complete-card">
          <span className="discovery-complete-icon">🏆</span>
          <p className="discovery-card-kicker">RONDA COMPLETADA</p>
          <h1>Tu cerebro ya tiene nuevas conexiones.</h1>
          <p>Ahora conviértelas en una frase que puedas usar de verdad. Así la asociación deja de ser una imagen y pasa a formar parte de tu inglés.</p>
          <SentenceLaunch onContinue={onContinueToSentences ?? (() => navigate('/constructor-frases'))} />
          {onOpenAlchemy ? <button type="button" className="btn secondary alchemy-discovery-link" onClick={onOpenAlchemy}>⚗️ Fusionar un phrasal verb</button> : null}
        </div>
      </main>
    );
  }

  if (status === 'error' || !current) {
    return (
      <main className="discovery-stage discovery-stage-centered">
        <div className="discovery-error-card">
          <span className="discovery-complete-icon">🧩</span>
          <h1>No pudimos preparar esta conexión</h1>
          <ErrorBox error={error} />
          <button type="button" className="btn primary" onClick={retryPreload}>Intentarlo de nuevo</button>
        </div>
      </main>
    );
  }

  const cardKey = `${current.unitId}-${current.association.id}`;
  const exitX = exitDirection === 'right' ? 600 : exitDirection === 'left' ? -600 : 0;

  return (
    <main className="discovery-stage">
      <DiscoveryTopbar progress={progress} />
      <div className="discovery-deck" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={cardKey}
            className="discovery-card-frame"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, x: exitX, rotate: exitDirection === 'right' ? 12 : -12 }}
            transition={SPRING}
          >
            <AssociationCard card={current} onDecision={decide} shakeToken={shakeToken} />
          </motion.div>
        </AnimatePresence>
        <div className="discovery-preload-dots" aria-label={`${preloaded.length} tarjetas precargadas`}>
          {[0, 1, 2].map((index) => <span key={index} className={index < preloaded.length ? 'is-ready' : ''} />)}
        </div>
      </div>

      <AnimatePresence>
        {showExhausted ? (
          <motion.div className="discovery-contextual-action" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <p>Esta asociación no te ayuda todavía.</p>
            <div>
              <button type="button" className="btn primary" onClick={createOwn}>✍️ Crear la mía</button>
              <button type="button" className="btn ghost" onClick={skip}>Sin asociación</button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="discovery-keyboard-hint">Desliza o usa <kbd>←</kbd> <kbd>→</kbd></p>
    </main>
  );
}

function DiscoveryTopbar({ progress }: { progress: { current: number; total: number; accepted: number } }) {
  const percentage = progress.total ? Math.min(100, ((progress.current - 1) / progress.total) * 100) : 0;
  return (
    <header className="discovery-topbar">
      <div>
        <p className="discovery-brand">MEMORA <span>DISCOVERY</span></p>
        <p className="discovery-progress-copy">{Math.max(0, progress.current - 1)} de {progress.total} · {progress.accepted} conectadas</p>
      </div>
      <div className="discovery-progress-track" role="progressbar" aria-valuenow={progress.current - 1} aria-valuemin={0} aria-valuemax={progress.total}>
        <motion.div animate={{ width: `${percentage}%` }} transition={{ duration: 0.35 }} />
      </div>
    </header>
  );
}
