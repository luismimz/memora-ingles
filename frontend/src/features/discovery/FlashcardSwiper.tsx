import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBox, playNaturalFast, toast } from '../../components/common';
import { useDiscoveryQueue } from './useDiscoveryQueue';
import type { DiscoveryCard, DiscoveryQueueResult } from './discovery.types';
import { AssociationCard } from './AssociationCard';
import { SentenceLaunch } from '../sentences/SentenceLaunch';
import { useNavigate } from 'react-router-dom';
import { AlchemyChallenge } from '../alchemy/AlchemyChallenge';
import { alchemyChallengeFromWord } from '../alchemy/alchemy.types';

export interface FlashcardSwiperProps {
  /** Se llama al pulsar “Crear la mía”; la pantalla padre decide dónde abrir el editor. */
  onCreateOwn?: (card: DiscoveryCard) => void;
  /** Permite que la pantalla padre registre el descarte o abra una explicación. */
  onSkipAssociation?: (card: DiscoveryCard) => void;
  /** Salida directa hacia la misión de frase construida con la ronda. */
  onContinueToSentences?: () => void;
  batchSize?: number;
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 24 };

/** Pantalla inmersiva de descubrimiento, sin esperas entre una tarjeta y la siguiente. */
export function FlashcardSwiper({ onCreateOwn, onSkipAssociation, onContinueToSentences, batchSize = 10 }: FlashcardSwiperProps) {
  const queue = useDiscoveryQueue({ batchSize, preloadAhead: 3, minimumAlternatives: 2 });
  return <FlashcardSwiperView queue={queue} onCreateOwn={onCreateOwn} onSkipAssociation={onSkipAssociation} onContinueToSentences={onContinueToSentences} />;
}

/**
 * Vista pura del swiper. DiscoveryPage la usa para compartir exactamente la
 * misma cola con el interceptor de recuperación, sin montar dos hooks.
 */
export function FlashcardSwiperView({ queue, onCreateOwn, onSkipAssociation, onContinueToSentences }: FlashcardSwiperProps & { queue: DiscoveryQueueResult }) {
  const navigate = useNavigate();
  const { current, status, error, progress, preloaded, swipeRight, swipeLeft, skipCurrent, retryPreload, generateAlternative } = queue;
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [shakeToken, setShakeToken] = useState(0);
  const [showExhausted, setShowExhausted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const leaveMission = () => navigate('/', { replace: true, state: null });

  // La narración empieza al entrar y vuelve a empezar solo cuando cambia la
  // tarjeta/asociación, nunca por cada render de la pantalla.
  useEffect(() => {
    if (status !== 'ready' || !current) return undefined;
    // Kokoro sigue siendo la primera opción; si el endpoint no está
    // configurado o el navegador bloquea el autoplay, la primera interacción
    // debe dejar oír la palabra con una voz disponible en el dispositivo.
    return playNaturalFast(current.audioText, false, 8000, true, current.word.audioUrl);
  }, [current?.association.id, current?.unitId, current?.word.audioUrl, status]);

  useEffect(() => {
    setShowExhausted(false);
    setIsGenerating(false);
    setExitDirection(null);
  }, [current?.association.id, current?.unitId]);

  const decide = (direction: 'left' | 'right') => {
    if (!current || status !== 'ready') return;
    setExitDirection(direction);
    if (direction === 'left') {
      const result = swipeLeft();
      if (result.type === 'accepted') toast('🔥 Asociación conectada. La pondremos a prueba más adelante.');
      return;
    }

    const result = swipeRight();
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

  const generateWithAI = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const result = await generateAlternative();
    setIsGenerating(false);
    if (result.type === 'generated') {
      setShowExhausted(false);
      toast('✨ Nueva asociación generada. Revísala y decide si conecta contigo.');
    } else {
      toast(result.reason);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="discovery-stage" aria-busy="true">
        <DiscoveryTopbar progress={progress} onExit={leaveMission} />
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
        <button type="button" className="mission-exit discovery-screen-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
        <div className="discovery-complete-card">
          <span className="discovery-complete-icon">🧭</span>
          <p className="discovery-card-kicker">CATÁLOGO EN REVISIÓN</p>
          <h1>Estamos preparando tu siguiente tanda.</h1>
          <p>La misión no se ha perdido: vuelve a intentarlo o revisa Hoy mientras se sincroniza tu catálogo.</p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => navigate('/descubrir', { replace: true, state: { startNewRound: true } })}>Reintentar misión →</button>
            <button type="button" className="btn secondary" onClick={() => navigate('/')}>Ir a Hoy</button>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'complete') {
    return (
      <main className="discovery-stage discovery-stage-centered">
        <button type="button" className="mission-exit discovery-screen-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
        <div className="discovery-complete-card">
          <span className="discovery-complete-icon">🏆</span>
          <p className="discovery-card-kicker">RONDA COMPLETADA</p>
          <h1>Tu cerebro ya tiene nuevas conexiones.</h1>
          <p>Ahora conviértelas en una frase que puedas usar de verdad. Así la asociación deja de ser una imagen y pasa a formar parte de tu inglés.</p>
          <SentenceLaunch onContinue={onContinueToSentences ?? (() => navigate('/descubrir'))} />
        </div>
      </main>
    );
  }

  if (status === 'error' || !current) {
    return (
      <main className="discovery-stage discovery-stage-centered">
        <button type="button" className="mission-exit discovery-screen-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
        <div className="discovery-error-card">
          <span className="discovery-complete-icon">🧩</span>
          <h1>No pudimos preparar esta conexión</h1>
          <ErrorBox error={error} />
          <button type="button" className="btn primary" onClick={retryPreload}>Intentarlo de nuevo</button>
        </div>
      </main>
    );
  }

  if (current.special === 'alchemy') {
    return <DiscoveryAlchemyCard card={current} onComplete={queue.completeAlchemy} onExit={leaveMission} />;
  }

  const cardKey = `${current.unitId}-${current.association.id}`;
  const exitX = exitDirection === 'right' ? 600 : exitDirection === 'left' ? -600 : 0;

  return (
    <main className="discovery-stage">
      <DiscoveryTopbar progress={progress} onExit={leaveMission} />
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
            <AssociationCard card={current} onDecision={decide} shakeToken={shakeToken} onAudioUnlock={() => playNaturalFast(current.audioText, false, 8000, true, current.word.audioUrl)} />
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
              <button type="button" className="btn primary" onClick={generateWithAI} disabled={isGenerating}>{isGenerating ? 'Generando…' : '✨ Generar con IA'}</button>
              <button type="button" className="btn secondary" onClick={createOwn}>✍️ Crear la mía</button>
              <button type="button" className="btn ghost" onClick={skip}>Sin asociación</button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="discovery-keyboard-hint">Desliza o usa <kbd>←</kbd> <kbd>→</kbd></p>
    </main>
  );
}

function DiscoveryAlchemyCard({ card, onComplete, onExit }: { card: DiscoveryCard; onComplete: DiscoveryQueueResult['completeAlchemy']; onExit: () => void }) {
  const challenge = alchemyChallengeFromWord({
    id: card.word.id,
    en: card.word.en,
    es: card.word.es,
    kind: card.word.kind,
    target_sentence_en: card.word.targetSentenceEn,
  });
  return (
    <main className="discovery-stage discovery-alchemy-stage">
      <DiscoveryTopbar progress={{ current: card.position + 1, total: card.total, accepted: 0 }} onExit={onExit} />
      <AlchemyChallenge
        challenge={challenge}
        showDock={false}
        onComplete={() => toast(`⚗️ ${challenge.targetEn} preparado para tu memoria.`)}
        onNext={() => { void onComplete().then(() => toast(`🔥 ${challenge.targetEn} conectado. Sigue con la siguiente tarjeta.`)); }}
        onExit={onExit}
      />
    </main>
  );
}

function DiscoveryTopbar({ progress, onExit }: { progress: { current: number; total: number; accepted: number }; onExit: () => void }) {
  const percentage = progress.total ? Math.min(100, ((progress.current - 1) / progress.total) * 100) : 0;
  return (
    <header className="discovery-topbar">
      <div>
        <p className="discovery-brand">MEMORA <span>DISCOVERY</span></p>
        <p className="discovery-progress-copy">{Math.max(0, progress.current - 1)} de {progress.total} · {progress.accepted} conectadas</p>
      </div>
      <button type="button" className="mission-exit" onClick={onExit}>✕ Salir al Inicio</button>
      <div className="discovery-progress-track" role="progressbar" aria-valuenow={progress.current - 1} aria-valuemin={0} aria-valuemax={progress.total}>
        <motion.div animate={{ width: `${percentage}%` }} transition={{ duration: 0.35 }} />
      </div>
    </header>
  );
}
