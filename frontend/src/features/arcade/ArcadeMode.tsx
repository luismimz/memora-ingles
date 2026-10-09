import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBox, playNaturalFast, toast } from '../../components/common';
import { items } from '../../lib/api';
import { useStore } from '../../store';
import { useArcadeEngine } from './useArcadeEngine';
import { Link, useNavigate } from 'react-router-dom';
import { SentenceLaunch } from '../sentences/SentenceLaunch';
import { sentenceMissionFromWord, type SentenceMission } from '../sentences/sentenceMission';
import { playSentenceSound } from '../sentences/sentenceGameFeel';

const CARD_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Modo Time Attack: oído primero, elección táctil y siguiente tarjeta inmediata. */
export function ArcadeMode() {
  const navigate = useNavigate();
  const store = useStore();
  const engine = useArcadeEngine(60_000);
  const { status, phase, current, timeLeftMs, timeLimitMs, stimulusTimeLimitMs, combo, maxCombo, score, xp, correct, answered, totalDue, recentWords, feedback, error, start, beginReaction, answer, restart } = engine;
  const scoreSaved = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const ratio = timeLimitMs ? Math.max(0, Math.min(1, timeLeftMs / timeLimitMs)) : 0;
  const hot = combo >= 3;

  useEffect(() => {
    if (status !== 'running' || phase !== 'audio' || !current) return undefined;
    const prompt = `Is it ${current.promptWord}?`;
    let armed = false;
    const armReaction = () => {
      if (armed) return;
      armed = true;
      beginReaction();
    };
    // El proveedor natural y speechSynthesis no comparten un evento ended.
    // Este retardo seguro deja terminar una locución corta antes de abrir la
    // ventana jugable; beginReaction() evita cualquier doble disparo.
    const safeDelay = Math.min(3_100, Math.max(1_250, 560 + prompt.length * 48));
    const timer = window.setTimeout(armReaction, safeDelay);
    const stop = playNaturalFast(prompt, false, 8000, true);
    return () => { window.clearTimeout(timer); stop(); };
  }, [beginReaction, current?.promptWord, current?.word.id, phase, status]);

  useEffect(() => {
    if (feedback?.result === 'ok') playSentenceSound('snap');
  }, [feedback]);

  useEffect(() => {
    setVoiceSupported(Boolean(speechRecognitionConstructor()));
    return () => recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    if (phase !== 'reaction') {
      recognitionRef.current?.stop();
      setVoiceListening(false);
    }
  }, [phase]);

  const startVoiceSnap = () => {
    const Constructor = speechRecognitionConstructor();
    if (!Constructor || !current || status !== 'running' || phase !== 'reaction') return;
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = String(event.results[0]?.[0]?.transcript ?? '').trim().toLowerCase();
      const target = current.promptWord.toLowerCase();
      const affirmative = transcript.includes(target) || /\b(yes|yeah|yep|sí|si|correct)\b/.test(transcript);
      answer(affirmative ? 'yes' : 'no');
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setVoiceSupported(false);
      recognition.stop();
    };
    recognition.onend = () => setVoiceListening(false);
    recognitionRef.current = recognition;
    setVoiceListening(true);
    try { recognition.start(); } catch { setVoiceListening(false); setVoiceSupported(false); }
  };

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

  if (status === 'empty') return <ArcadeShell><div className="arcade-panel arcade-panel-centered"><div className="arcade-panel-icon">✨</div><h1>No hay palabras vencidas</h1><p>Cuando una palabra llegue a su siguiente checkpoint aparecerá aquí para una ráfaga de recuerdo.</p><div className="row"><Link to="/descubrir" className="btn primary">Descubrir palabras</Link><Link to="/galeria" className="btn secondary">Ver colección</Link></div></div></ArcadeShell>;

  if (status === 'ready') return <ArcadeShell><ArcadeIntro totalDue={totalDue} onStart={start} /></ArcadeShell>;
  if (status === 'finished') {
    const missions = (recentWords.length ? recentWords : current ? [current.word] : [])
      .map((word) => sentenceMissionFromWord(word))
      .filter((mission): mission is SentenceMission => Boolean(mission))
      .filter((mission, index, all) => all.findIndex((candidate) => candidate.id === mission.id) === index)
      .slice(0, 3);
    return <ArcadeShell><ArcadeSummary xp={xp} score={score} correct={correct} answered={answered} maxCombo={maxCombo} missions={missions} onRestart={restart} onContinueToMission={() => navigate('/descubrir', { replace: true, state: { missions } })} onContinueToDiscovery={() => navigate('/descubrir', { state: { startNewRound: true } })} /></ArcadeShell>;
  }
  if (!current) return null;

  const stageTone = feedback?.result === 'ok' ? 'has-success' : feedback?.result === 'fail' ? 'has-failure' : '';
  const sceneIcon = current.word.scene_es?.trim().match(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u)?.[0]
    || current.mnemonic?.emoji?.trim()
    || '🔊';
  const reactionSeconds = (stimulusTimeLimitMs / 1000).toFixed(1).replace('.', ',');
  return (
    <main className={`arcade-stage ${hot ? 'is-hot' : ''} arcade-phase-${phase} ${stageTone}`} style={hot ? { boxShadow: 'inset 0 0 70px rgba(255,105,65,.22)' } : undefined}>
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
        <AnimatePresence initial={false} mode="wait">
          <motion.section
            key={current.word.id}
            className={`arcade-card ${stageTone}`}
            initial={{ opacity: 0, x: 130, scale: .9, rotate: 4 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: -440, scale: .78, rotate: -12 }}
            transition={CARD_SPRING}
          >
            <p className="arcade-card-kicker">{phase === 'audio' ? '🔊 PREPARACIÓN · ESCUCHA LA PREGUNTA' : phase === 'reaction' ? `⚡ REACCIÓN · ${reactionSeconds}s PARA EL SNAP` : '🧊 FEEDBACK · RESULTADO CONGELADO'}</p>
            <div className="arcade-scene-visual">
              <div className="arcade-scene-icon" aria-hidden="true">{sceneIcon}</div>
            </div>
            <div className="arcade-ballistic-prompt">
              <span>{phase === 'audio' ? 'La voz está preparando el reto…' : phase === 'reaction' ? '¡Responde ahora!' : 'Tu respuesta ha quedado registrada'}</span>
              <strong>Is it <em>{current.promptWord}</em>?</strong>
            </div>
            <div className="arcade-audio-actions">
              <button type="button" className="btn secondary arcade-replay" onClick={() => playNaturalFast(`Is it ${current.promptWord}?`, false, 8000, true)}>🔊 Escuchar de nuevo</button>
            </div>
            <motion.div key={`${current.word.id}-${answered}-${phase}`} className="arcade-ballistic-track" initial={{ scaleX: 1 }} animate={{ scaleX: phase === 'reaction' ? 0 : 1 }} transition={{ duration: phase === 'reaction' ? stimulusTimeLimitMs / 1000 : .15, ease: 'linear' }} aria-label={phase === 'reaction' ? `Ventana de respuesta de ${reactionSeconds} segundos` : 'Temporizador en pausa'} />
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="arcade-ballistic-options" aria-label="Respuesta rápida">
        {(['no', 'yes'] as const).map((option) => {
          const label = option === 'yes' ? '✓ SÍ / YES' : '✕ NO';
          const answerLabel = option === 'yes' ? 'YES' : 'NO';
          const sameCard = feedback?.wordId === current.word.id;
          const active = sameCard && feedback?.choice === option;
          const reveal = sameCard && feedback?.result === 'fail' && feedback?.correctAnswer === answerLabel;
          return <motion.button key={option} type="button" disabled={phase !== 'reaction'} className={`arcade-ballistic-option ${active && feedback?.result !== 'fail' ? 'is-correct' : ''} ${active && feedback?.result === 'fail' ? 'is-wrong' : ''} ${reveal ? 'is-reveal' : ''}`} whileTap={{ scale: .92 }} animate={active && feedback?.result === 'ok' ? { scale: [1, 1.1, 1] } : undefined} onClick={() => answer(option)}>{label}</motion.button>;
        })}
        {voiceSupported ? <button type="button" disabled={phase !== 'reaction'} className={`arcade-voice-snap ${voiceListening ? 'is-listening' : ''}`} onClick={startVoiceSnap} aria-label="Responder con voz">{voiceListening ? '🎙️ Escuchando…' : '🎙️ Voice Snap'}</button> : null}
      </div>
      <AnimatePresence>{feedback ? <motion.div className={`arcade-feedback ${feedback.result}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{feedback.result === 'ok' ? `⚡ ¡Reflejo Balístico! x3 · +${feedback.xp} XP` : feedback.result === 'doubt' ? `✅ Correcto x1 · la respuesta era ${feedback.correctAnswer}` : `💥 ¡No, era ${feedback.correctAnswer}!`}</motion.div> : null}</AnimatePresence>
      <AnimatePresence>{feedback?.result === 'ok' ? <motion.div className="arcade-snap-confetti" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--confetti': index } as CSSProperties}>✦</i>)}</motion.div> : null}</AnimatePresence>
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
  return <section className="arcade-panel arcade-panel-centered"><div className="arcade-panel-icon">⚡</div><p className="arcade-eyebrow">TIME ATTACK · 60 SEGUNDOS</p><h1>¿Cuántas conexiones sobreviven a la ráfaga?</h1><p>Primero escucha “Is it…?”. Después tendrás 4 segundos para calibrar las primeras respuestas y 3 segundos cuando entres en flujo. Si reaccionas antes de 1 segundo, activas el Reflejo Balístico. Tienes {totalDue} cartas listas.</p><div className="arcade-rules"><span>👂 Audio antes del reloj</span><span>🔥 Reflejo desde &lt;1s</span><span>🧠 SRS se actualiza</span></div><button type="button" className="btn big arcade-start" onClick={onStart}>Empezar la ráfaga →</button></section>;
}

function ArcadeSummary({ xp, score, correct, answered, maxCombo, missions, onRestart, onContinueToMission, onContinueToDiscovery }: { xp: number; score: number; correct: number; answered: number; maxCombo: number; missions: SentenceMission[]; onRestart: () => void; onContinueToMission: () => void; onContinueToDiscovery: () => void }) {
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  return <section className="arcade-panel arcade-summary"><div className="arcade-panel-icon">🏆</div><p className="arcade-eyebrow">FIN DE LA RÁFAGA</p><h1>Tu cerebro no se quedó quieto.</h1><div className="arcade-summary-grid"><div><strong>{xp}</strong><span>XP ganados</span></div><div><strong>{accuracy}%</strong><span>precisión</span></div><div><strong>x{maxCombo}</strong><span>combo máximo</span></div><div><strong>{score}</strong><span>puntos</span></div></div><p className="arcade-summary-copy">Cada respuesta ya se ha enviado al calendario SRS. Ahora vamos a usar esas palabras para fabricar lenguaje.</p>{missions.length ? <><p className="arcade-summary-mission">Siguiente misión: <strong>{missions.length} frases con tus últimas palabras</strong></p><SentenceLaunch onContinue={onContinueToMission} /></> : <p className="arcade-summary-copy">No hay frases enriquecidas disponibles para estas palabras todavía. Completa el catálogo curado en Directus para desbloquear el constructor.</p>}<button type="button" className="btn big arcade-start arcade-discovery-next" onClick={onContinueToDiscovery}>⚡ Continuar con palabras nuevas</button><button type="button" className="btn big arcade-start arcade-secondary-action" onClick={onRestart}>Otra ráfaga →</button><Link to="/" className="btn ghost">Volver a Hoy</Link></section>;
}
