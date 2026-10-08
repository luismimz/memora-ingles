import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBox, playNaturalFast, SpeakBtn, toast } from '../../components/common';
import { items } from '../../lib/api';
import { useStore } from '../../store';
import { useArcadeEngine } from './useArcadeEngine';
import { Link, useNavigate } from 'react-router-dom';
import { SentenceLaunch } from '../sentences/SentenceLaunch';
import { DEFAULT_SENTENCE_MISSION, sentenceMissionFromWord, type SentenceMission } from '../sentences/sentenceMission';

const CARD_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };

/** Modo Time Attack: oído primero, elección táctil y siguiente tarjeta inmediata. */
export function ArcadeMode() {
  const navigate = useNavigate();
  const store = useStore();
  const engine = useArcadeEngine(60_000);
  const { status, current, timeLeftMs, timeLimitMs, combo, maxCombo, score, xp, correct, answered, totalDue, recentWords, feedback, error, start, answer, restart } = engine;
  const scoreSaved = useRef(false);
  const ratio = timeLimitMs ? Math.max(0, Math.min(1, timeLeftMs / timeLimitMs)) : 0;
  const hot = combo >= 3;

  useEffect(() => {
    if (status !== 'running' || !current) return undefined;
    return playNaturalFast(current.word.en);
  }, [answered, current?.word.id, status]);

  useEffect(() => {
    if (status !== 'finished') {
      if (status === 'loading' || status === 'ready') scoreSaved.current = false;
      return;
    }
    if (scoreSaved.current) return;
    scoreSaved.current = true;
    const accuracy = answered ? correct / answered : 0;
    void items.create('challenge_scores', {
      display_name: store.user?.first_name || 'Alumno Memora',
      game: 'arcade',
      score,
      total: answered,
      accuracy,
      max_combo: maxCombo,
      seconds: Math.round((timeLimitMs - timeLeftMs) / 1000),
    }).then(() => toast('🏆 Resultado guardado en el ranking')).catch(() => {
      // El Arcade sigue siendo jugable aunque una instalación antigua aún no
      // tenga la colección challenge_scores.
    });
  }, [answered, correct, score, status, store.user?.first_name, timeLeftMs, timeLimitMs]);

  if (status === 'loading') return <ArcadeShell><div className="arcade-loading"><motion.div className="arcade-loading-orb" animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.1 }}>⚡</motion.div><h1>Preparando tu ráfaga…</h1><p>Estamos ordenando tus palabras vencidas y precargando Kokoro.</p></div></ArcadeShell>;

  if (status === 'error') return <ArcadeShell><div className="arcade-panel arcade-panel-centered"><div className="arcade-panel-icon">🧩</div><h1>No se pudo preparar el Arcade</h1><ErrorBox error={error} /><button type="button" className="btn primary" onClick={restart}>Reintentar</button></div></ArcadeShell>;

  if (status === 'empty') return <ArcadeShell><div className="arcade-panel arcade-panel-centered"><div className="arcade-panel-icon">✨</div><h1>No hay palabras vencidas</h1><p>Cuando una palabra llegue a su siguiente checkpoint aparecerá aquí para una ráfaga de recuerdo.</p><div className="row"><Link to="/descubrir" className="btn primary">Descubrir palabras</Link><Link to="/repaso" className="btn secondary">Ver repaso</Link></div></div></ArcadeShell>;

  if (status === 'ready') return <ArcadeShell><ArcadeIntro totalDue={totalDue} onStart={start} /></ArcadeShell>;
  if (status === 'finished') {
    const missions = (recentWords.length ? recentWords : current ? [current.word] : [])
      .map((word) => sentenceMissionFromWord({ en: word.en, es: word.es, exampleEn: word.example_en }))
      .filter((mission, index, all) => all.findIndex((candidate) => candidate.id === mission.id) === index)
      .slice(0, 3);
    const queue = missions.length ? missions : [DEFAULT_SENTENCE_MISSION];
    return <ArcadeShell><ArcadeSummary xp={xp} score={score} correct={correct} answered={answered} maxCombo={maxCombo} missions={queue} onRestart={restart} onContinueToSentences={() => navigate('/constructor-frases', { state: { missions: queue } })} onContinueToDiscovery={() => navigate('/descubrir', { state: { startNewRound: true, warmupDone: true } })} /></ArcadeShell>;
  }
  if (!current) return null;

  return (
    <main className={`arcade-stage ${hot ? 'is-hot' : ''}`} style={hot ? { boxShadow: 'inset 0 0 70px rgba(255,105,65,.22)' } : undefined}>
      <header className="arcade-topbar">
        <div>
          <p className="arcade-brand">MEMORA <span>ARCADE</span></p>
          <p className="arcade-round-copy">{answered + 1} · {totalDue} palabras en la baraja</p>
        </div>
        <motion.div className={`arcade-combo ${hot ? 'is-hot' : ''}`} animate={{ scale: combo >= 2 ? [1, 1.1, 1] : 1 }} transition={combo >= 2 ? { repeat: Infinity, duration: .85 } : { duration: .15 }}>
          <small>COMBO</small>
          <strong>x{combo}</strong>
        </motion.div>
        <MissionExit />
      </header>
      <div className="arcade-time-track" aria-label={`Quedan ${Math.ceil(timeLeftMs / 1000)} segundos`}>
        <motion.div animate={{ width: `${ratio * 100}%` }} transition={{ duration: .08, ease: 'linear' }} />
      </div>
      <div className="arcade-score-row"><span>⚡ {xp} XP</span><span>{Math.ceil(timeLeftMs / 1000)}s</span><span>🏆 {score}</span></div>

      <div className="arcade-deck" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.section
            key={`${current.word.id}-${answered}`}
            className="arcade-card"
            initial={{ opacity: 0, x: 130, scale: .9, rotate: 4 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: -440, scale: .78, rotate: -12 }}
            transition={CARD_SPRING}
          >
            <p className="arcade-card-kicker">👂 ESCUCHA Y ELIGE · MENOS DE 1,5s = COMBO</p>
            <div className="arcade-audio-orb"><span>🔊</span><i /></div>
            <div className="arcade-audio-actions"><button type="button" className="btn secondary" onClick={() => playNaturalFast(current.word.en)}>Repetir audio</button><SpeakBtn text={current.word.en} title="Reproducir otra vez" /></div>
            <p className="arcade-meaning">{current.word.es}</p>
            {current.mnemonic?.keyword ? <p className="arcade-bridge">🧠 puente: <strong>{current.mnemonic.keyword}</strong></p> : null}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="arcade-options" aria-label="Opciones de respuesta">
        {current.options.map((option) => {
          const sameCard = feedback?.wordId === current.word.id;
          const active = sameCard && feedback?.choice === option;
          const reveal = sameCard && feedback?.result === 'fail' && feedback?.correctAnswer === option;
          return <motion.button key={option} type="button" className={`arcade-option ${active && feedback?.result !== 'fail' ? 'is-correct' : ''} ${active && feedback?.result === 'fail' ? 'is-wrong' : ''} ${reveal ? 'is-reveal' : ''}`} whileTap={{ scale: .96 }} animate={active && feedback?.result === 'ok' ? { scale: [1, 1.1, 1] } : undefined} onClick={() => answer(option)}>{option}</motion.button>;
        })}
      </div>
      <AnimatePresence>{feedback ? <motion.div className={`arcade-feedback ${feedback.result}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{feedback.result === 'ok' ? `🔥 +${feedback.xp} XP · ${Math.round(feedback.elapsedMs)} ms` : feedback.result === 'doubt' ? `🤔 Correcta, pero fuera de combo · ${feedback.correctAnswer}` : `💥 Era ${feedback.correctAnswer}`}</motion.div> : null}</AnimatePresence>
    </main>
  );
}

function ArcadeShell({ children }: { children: ReactNode }) {
  return <main className="arcade-stage arcade-stage-centered"><MissionExit />{children}</main>;
}

function MissionExit() {
  const navigate = useNavigate();
  return <button type="button" className="mission-exit arcade-mission-exit" onClick={() => navigate('/', { replace: true, state: null })}>✕ Salir al Inicio</button>;
}

function ArcadeIntro({ totalDue, onStart }: { totalDue: number; onStart: () => void }) {
  return <section className="arcade-panel arcade-panel-centered"><div className="arcade-panel-icon">⚡</div><p className="arcade-eyebrow">TIME ATTACK · 60 SEGUNDOS</p><h1>¿Cuántas conexiones sobreviven a la ráfaga?</h1><p>Escucha la palabra, toca su respuesta y mantén el combo por debajo de 1,5 segundos. Tienes {totalDue} palabras vencidas listas.</p><div className="arcade-rules"><span>👂 Kokoro primero</span><span>🔥 Combo desde x2</span><span>🧠 SRS se actualiza</span></div><button type="button" className="btn big arcade-start" onClick={onStart}>Empezar la ráfaga →</button></section>;
}

function ArcadeSummary({ xp, score, correct, answered, maxCombo, missions, onRestart, onContinueToSentences, onContinueToDiscovery }: { xp: number; score: number; correct: number; answered: number; maxCombo: number; missions: SentenceMission[]; onRestart: () => void; onContinueToSentences: () => void; onContinueToDiscovery: () => void }) {
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  return <section className="arcade-panel arcade-summary"><div className="arcade-panel-icon">🏆</div><p className="arcade-eyebrow">FIN DE LA RÁFAGA</p><h1>Tu cerebro no se quedó quieto.</h1><div className="arcade-summary-grid"><div><strong>{xp}</strong><span>XP ganados</span></div><div><strong>{accuracy}%</strong><span>precisión</span></div><div><strong>x{maxCombo}</strong><span>combo máximo</span></div><div><strong>{score}</strong><span>puntos</span></div></div><p className="arcade-summary-copy">Cada respuesta ya se ha enviado al calendario SRS. Ahora vamos a usar esas palabras para fabricar lenguaje.</p><p className="arcade-summary-mission">Siguiente misión: <strong>{missions.length} frases con tus últimas palabras</strong></p><SentenceLaunch onContinue={onContinueToSentences} /><button type="button" className="btn big arcade-start arcade-discovery-next" onClick={onContinueToDiscovery}>⚡ Continuar con palabras nuevas</button><button type="button" className="btn big arcade-start arcade-secondary-action" onClick={onRestart}>Otra ráfaga →</button><Link to="/" className="btn ghost">Volver a Hoy</Link></section>;
}
