import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../../components/common';
import { useStore } from '../../store';
import { FlashcardSwiperView } from './FlashcardSwiper';
import { QuickChallenge } from './QuickChallenge';
import { useDiscoveryQueue } from './useDiscoveryQueue';
import type { MissionPhase } from './discovery.types';
import { sentenceMissionFromWord, type SentenceMission } from '../sentences/sentenceMission';
import { LootPack, SentenceBuilder } from '../sentences/SentenceBuilder';
import { ArcadeMode } from '../arcade/ArcadeMode';

interface MissionRouteState {
  startNewRound?: boolean;
  missions?: SentenceMission[];
  arcade?: boolean;
}

/**
 * Controlador único de la misión. Las cinco fases viven en la misma ruta para
 * que el aprendizaje no salte entre aplicaciones ni pierda su contexto.
 */
export function DiscoveryPage() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as MissionRouteState | null;
  const startNewRound = Boolean(routeState?.startNewRound);
  // Diez cartas mantienen el objetivo original de Memora: una tanda útil y
  // medible sin volver a reciclar las primeras palabras del catálogo. La
  // siguiente ronda avanza el cursor de Directus.
  const roundSize = 10;
  const queue = useDiscoveryQueue({
    batchSize: roundSize,
    preloadAhead: 3,
    minimumAlternatives: 2,
    startNewBatch: startNewRound,
    batchKey: startNewRound ? location.key : 'resume',
  });
  const [phase, setPhase] = useState<MissionPhase>(routeState?.arcade ? 'ARCADE' : routeState?.missions?.length ? 'SENTENCE' : 'DISCOVERY');
  const [activeRecoveryId, setActiveRecoveryId] = useState<number | null>(null);
  const [dismissedRecoveryId, setDismissedRecoveryId] = useState<number | null>(null);
  const [sentenceMissions, setSentenceMissions] = useState<SentenceMission[]>(routeState?.missions ?? []);
  const [lootMission, setLootMission] = useState<SentenceMission | null>(null);
  const [lootXp, setLootXp] = useState(0);
  const [warmupCount, setWarmupCount] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const ready = queue.readyForRecovery;
  const activeItem = ready.find((item) => item.wordId === activeRecoveryId) ?? null;
  const distractors = useMemo(
    () => queue.recoveryQueue.filter((item) => item.wordId !== activeRecoveryId),
    [activeRecoveryId, queue.recoveryQueue],
  );
  const recoveredMissions = useMemo(() => {
    return [...sentenceMissions]
      .filter((mission, index, all) => all.findIndex((candidate) => candidate.id === mission.id) === index)
      .slice(0, 3);
  }, [sentenceMissions]);

  // Si Arcade entrega frases preparadas, entramos directamente en la segunda
  // mitad de la misión sin abrir otra ruta ni volver a pedir las palabras.
  useEffect(() => {
    if (routeState?.missions?.length) {
      setSentenceMissions(routeState.missions);
      setPhase('SENTENCE');
    }
    if (routeState?.arcade) setPhase('ARCADE');
  }, [location.key, routeState?.arcade, routeState?.missions]);

  // La recuperación es un interceptor del descubrimiento, nunca una cola
  // separada. Al cerrar un reto, el siguiente estado siempre es explícito.
  useEffect(() => {
    if (phaseRef.current === 'SENTENCE' || phaseRef.current === 'LOOT' || phaseRef.current === 'ARCADE') return;
    if (dismissedRecoveryId !== null && !ready.some((item) => item.wordId === dismissedRecoveryId)) {
      setDismissedRecoveryId(null);
    }
    if (activeRecoveryId !== null) return;
    const next = warmupCount < 3 ? ready.find((item) => item.wordId !== dismissedRecoveryId) : null;
    if (next) {
      setActiveRecoveryId(next.wordId);
      setWarmupCount((count) => count + 1);
      setPhase('WARMUP');
    } else if (phaseRef.current === 'WARMUP') {
      setPhase('DISCOVERY');
    }
  }, [activeRecoveryId, dismissedRecoveryId, phase, ready, warmupCount]);

  useEffect(() => {
    if (phase !== 'DISCOVERY' || queue.status !== 'complete') return;
    if (recoveredMissions.length) setPhase('SENTENCE');
  }, [phase, queue.status, recoveredMissions.length]);

  const leaveMission = () => navigate('/', { replace: true, state: null });

  const resolveChallenge = async (result: 'ok' | 'fail', ms: number) => {
    if (!activeItem) return;
    const wordId = activeItem.wordId;
    try {
      const resolved = await queue.resolveRecovery(wordId, result, ms);
      setDismissedRecoveryId(wordId);
      setActiveRecoveryId(null);
      setPhase('DISCOVERY');
      if (resolved.type === 'recovered') {
        const mission = sentenceMissionFromWord({
          en: activeItem.en,
          es: activeItem.es,
          ipa: activeItem.ipa,
          bridge_word: activeItem.bridgeWord,
          scene_es: activeItem.sceneEs,
          target_sentence_es: activeItem.targetSentenceEs,
          target_sentence_en: activeItem.targetSentenceEn,
          distractor: activeItem.distractor,
          irregular_forms: activeItem.irregularForms,
        });
        if (mission) setSentenceMissions((missions) => [mission, ...missions.filter((item) => item.id !== mission.id)].slice(0, 3));
        void store.addXp(resolved.xp);
        toast(`⚡ +${resolved.xp} XP · ${activeItem.en} ya está en tu ruta de memoria.`);
      } else if (resolved.type === 'requeued') {
        toast(`🌱 ${activeItem.en} vuelve a la cola. La recuperarás después de avanzar.`);
      }
    } catch {
      setDismissedRecoveryId(wordId);
      setActiveRecoveryId(null);
      setPhase('DISCOVERY');
      toast('No pudimos guardar la recuperación. La palabra queda pendiente.');
    }
  };

  const openSentences = () => {
    if (!recoveredMissions.length) {
      toast('Completa una conexión y su reto para desbloquear una frase real.');
      return;
    }
    setSentenceMissions(recoveredMissions);
    setPhase('SENTENCE');
  };

  const completeSentenceRound = (mission: SentenceMission, xp: number) => {
    setLootMission(mission);
    setLootXp(xp);
    setPhase('LOOT');
  };

  const nextRound = () => {
    setLootMission(null);
    setLootXp(0);
    setSentenceMissions([]);
    setActiveRecoveryId(null);
    setDismissedRecoveryId(null);
    setWarmupCount(0);
    setPhase('DISCOVERY');
    navigate('/descubrir', { replace: true, state: { startNewRound: true } });
  };

  const renderPhase = () => {
    if (phase === 'WARMUP' && activeItem) {
      return (
        <motion.div key={`challenge-${activeItem.wordId}`} className="discovery-flow-screen" initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <QuickChallenge item={activeItem} distractors={distractors} onResolve={resolveChallenge} />
        </motion.div>
      );
    }
    if (phase === 'SENTENCE') {
      return (
        <motion.div key="sentence-builder" className="discovery-flow-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
          <SentenceBuilder key={sentenceMissions.map((mission) => mission.id).join('|')} missions={sentenceMissions} onExit={leaveMission} onRoundComplete={completeSentenceRound} />
        </motion.div>
      );
    }
    if (phase === 'ARCADE') {
      return <motion.div key="mission-arcade" className="discovery-flow-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ArcadeMode /></motion.div>;
    }
    if (phase === 'LOOT' && lootMission) {
      return (
        <motion.main key="loot-pack" className="sentence-stage is-complete" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="sentence-shell"><LootPack mission={lootMission} words={sentenceMissions.length} xp={lootXp} onDiscover={nextRound} onHome={leaveMission} /></div>
        </motion.main>
      );
    }
    return (
      <motion.div key="discovery" className="discovery-flow-screen" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: .2 }}>
        <FlashcardSwiperView queue={queue} onContinueToSentences={openSentences} />
      </motion.div>
    );
  };

  return (
    <div className="discovery-page-controller" data-mission-phase={phase} data-queue-status={queue.status}>
      <div className="discovery-xp-pill" aria-label={`${store.xp} puntos de experiencia`}>⚡ {store.xp} XP</div>
      <AnimatePresence mode="wait" initial={false}>{renderPhase()}</AnimatePresence>
    </div>
  );
}
