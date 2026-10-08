import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '../../components/common';
import { FlashcardSwiperView } from './FlashcardSwiper';
import { QuickChallenge } from './QuickChallenge';
import { useDiscoveryQueue } from './useDiscoveryQueue';
import { useStore } from '../../store';
import { useLocation, useNavigate } from 'react-router-dom';
import { sentenceMissionFromWord, type SentenceMission } from '../sentences/sentenceMission';
import { isDue } from '../../lib/srs';

/** Controlador de la ruta: alterna asociación y recuperación sin duplicar la cola. */
export function DiscoveryPage() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { startNewRound?: boolean; warmupDone?: boolean } | null;
  const startNewRound = Boolean(routeState?.startNewRound);
  const warmupDone = Boolean(routeState?.warmupDone || startNewRound);
  const queue = useDiscoveryQueue({ batchSize: 10, preloadAhead: 3, minimumAlternatives: 2, startNewBatch: startNewRound });
  const [activeRecoveryId, setActiveRecoveryId] = useState<number | null>(null);
  const [dismissedRecoveryId, setDismissedRecoveryId] = useState<number | null>(null);
  const [sentenceMissions, setSentenceMissions] = useState<SentenceMission[]>([]);
  const autoLaunchRef = useRef(false);
  const dueCount = [...store.progress.values()].filter((progress) => progress.status !== 'known' && isDue(progress)).length;

  const ready = queue.readyForRecovery;
  const activeItem = ready.find((item) => item.wordId === activeRecoveryId) ?? null;
  const distractors = useMemo(
    () => queue.recoveryQueue.filter((item) => item.wordId !== activeRecoveryId),
    [activeRecoveryId, queue.recoveryQueue],
  );
  const sentenceMissionsForQueue = useMemo(() => {
    const touched = queue.recoveryQueue.map((item) => sentenceMissionFromWord({
      en: item.en,
      es: item.es,
      exampleEn: item.exampleEn,
    }));
    return [...sentenceMissions, ...touched]
      .filter((mission, index, all) => all.findIndex((candidate) => candidate.id === mission.id) === index)
      .slice(0, 3);
  }, [queue.recoveryQueue, sentenceMissions]);

  // Solo abre una recuperación cuando el hook ya la ha desbloqueado. Tras un
  // fallo queda fuera hasta que el usuario avance al menos una tarjeta.
  useEffect(() => {
    if (dismissedRecoveryId !== null && !ready.some((item) => item.wordId === dismissedRecoveryId)) {
      setDismissedRecoveryId(null);
      return;
    }
    if (activeRecoveryId !== null) return;
    const next = ready.find((item) => item.wordId !== dismissedRecoveryId);
    if (next) setActiveRecoveryId(next.wordId);
  }, [activeRecoveryId, dismissedRecoveryId, ready]);

  // Cuando la tanda ya produjo frases, el Constructor es la siguiente sala
  // del juego. Se mantiene el CTA manual en la vista completa como respaldo
  // para rondas sin frases o para usuarios que entren directamente a ella.
  useEffect(() => {
    if (autoLaunchRef.current || activeItem || queue.status !== 'complete' || !sentenceMissionsForQueue.length) return;
    autoLaunchRef.current = true;
    navigate('/constructor-frases', { replace: true, state: { missions: sentenceMissionsForQueue } });
  }, [activeItem, navigate, queue.status, sentenceMissionsForQueue]);

  const resolveChallenge = async (result: 'ok' | 'fail', ms: number) => {
    if (!activeItem) return;
    const wordId = activeItem.wordId;
    try {
      const resolved = await queue.resolveRecovery(wordId, result, ms);
      setDismissedRecoveryId(wordId);
      setActiveRecoveryId(null);
      if (resolved.type === 'recovered') {
        setSentenceMissions((missions) => {
          const next = sentenceMissionFromWord(activeItem);
          return [next, ...missions.filter((mission) => mission.id !== next.id)].slice(0, 3);
        });
        void store.addXp(resolved.xp);
        toast(`⚡ +${resolved.xp} XP · ${activeItem.en} ya está en tu ruta de memoria.`);
      } else if (resolved.type === 'requeued') {
        toast(`🌱 ${activeItem.en} vuelve a la cola. La recuperarás después de avanzar.`);
      }
    } catch {
      // Conserva el item en la cola y deja que el usuario continúe; no
      // mostramos un falso acierto si Directus no respondió.
      setDismissedRecoveryId(wordId);
      setActiveRecoveryId(null);
      toast('No pudimos guardar la recuperación. La palabra queda pendiente.');
    }
  };

  if (dueCount > 0 && !warmupDone) {
    return <MissionWarmup dueCount={dueCount} onStart={() => navigate('/arcade')} onExit={() => navigate('/', { replace: true, state: null })} />;
  }

  return (
    <div className="discovery-page-controller">
      <div className="discovery-xp-pill" aria-label={`${store.xp} puntos de experiencia`}>⚡ {store.xp} XP</div>
      <AnimatePresence mode="wait" initial={false}>
        {activeItem ? (
          <motion.div
            key={`recovery-${activeItem.wordId}`}
            className="discovery-flow-screen"
            initial={{ opacity: 0, scale: .88, filter: 'brightness(1.5)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
            exit={{ opacity: 0, scale: 1.08, filter: 'brightness(1.35)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <QuickChallenge item={activeItem} distractors={distractors} onResolve={resolveChallenge} />
          </motion.div>
        ) : (
          <motion.div
            key="discovery-swiper"
            className="discovery-flow-screen"
            initial={{ opacity: 0, scale: .98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: .2 }}
          >
            <FlashcardSwiperView
              queue={queue}
              onContinueToSentences={() => navigate('/constructor-frases', { state: { missions: sentenceMissionsForQueue } })}
              onOpenAlchemy={() => navigate('/alquimia')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MissionWarmup({ dueCount, onStart, onExit }: { dueCount: number; onStart: () => void; onExit: () => void }) {
  return (
    <main className="discovery-stage discovery-stage-centered mission-warmup">
      <button type="button" className="mission-exit discovery-screen-exit" onClick={onExit}>✕ Salir al Inicio</button>
      <section className="discovery-complete-card mission-warmup-card">
        <span className="discovery-complete-icon">🔁</span>
        <p className="discovery-card-kicker">MICRO-CALENTAMIENTO</p>
        <h1>Primero recuperamos lo que ya aprendiste.</h1>
        <p>Tienes <strong>{dueCount} {dueCount === 1 ? 'palabra vencida' : 'palabras vencidas'}</strong>. Una ráfaga de 60 segundos las reactiva y después desbloqueamos palabras nuevas.</p>
        <button type="button" className="btn big sentence-next" onClick={onStart}>🎮 Calentar en Arcade →</button>
      </section>
    </main>
  );
}
