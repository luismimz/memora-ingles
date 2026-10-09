import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Rich, SpeakBtn, toast } from '../../components/common';
import { shuffle } from '../../components/common';
import type { RecoveryQueueItem } from './discovery.types';

const LIMIT_MS = 5_000;
const FALLBACK_DISTRACTORS = ['really', 'improve', 'actually', 'enough', 'borrow', 'notice'];
const FALLBACK_ANCHORS = ['JAIBA', 'JARDÍN', 'JALEA', 'JOLÍN', 'PUCHERO', 'PULPO'];

export interface QuickChallengeProps {
  item: RecoveryQueueItem;
  /** Otras palabras aceptadas en esta ronda, usadas como distractores. */
  distractors: RecoveryQueueItem[];
  onResolve: (result: 'ok' | 'fail', ms: number) => void;
}

type ChallengePhase = 'intro' | 'anchor' | 'anchor-correct' | 'anchor-wrong' | 'answering' | 'correct' | 'wrong';

/** Micro-reto táctil de cinco segundos que convierte la asociación en recuerdo. */
export function QuickChallenge({ item, distractors, onResolve }: QuickChallengeProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ChallengePhase>('intro');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const startedAt = useRef(0);
  const phaseRef = useRef<ChallengePhase>('intro');
  const resolveTimer = useRef<number | null>(null);
  const resolveRef = useRef(onResolve);
  resolveRef.current = onResolve;

  const distractorKey = distractors.map((entry) => `${entry.wordId}:${entry.en}`).join('|');
  const options = useMemo(() => {
    const words = [...distractors.map((entry) => entry.en), ...FALLBACK_DISTRACTORS]
      .filter((word) => word.toLowerCase() !== item.en.toLowerCase());
    const unique = [...new Set(words)];
    // La respuesta correcta nunca se recorta: primero elegimos dos
    // distractores y después barajamos las tres opciones completas.
    return shuffle([item.en, ...shuffle(unique).slice(0, 2)]);
  }, [distractorKey, item.en]);

  const anchor = item.keyword?.trim() || item.es;
  const anchorOptions = useMemo(() => {
    const distractorAnchors = FALLBACK_ANCHORS.filter((word) => word.toLowerCase() !== anchor.toLowerCase());
    return shuffle([anchor, ...shuffle(distractorAnchors).slice(0, 2)]);
  }, [anchor]);

  const finish = useCallback((result: 'ok' | 'fail', answer: string | null = null) => {
    if (phaseRef.current !== 'answering') return;
    if (resolveTimer.current !== null) window.clearTimeout(resolveTimer.current);
    phaseRef.current = result === 'ok' ? 'correct' : 'wrong';
    setSelected(answer);
    setPhase(phaseRef.current);
    if (result === 'ok') playSuccessTone();
    else navigator.vibrate?.([35, 30, 55]);
    resolveTimer.current = window.setTimeout(() => {
      resolveRef.current(result, Math.max(1, Date.now() - startedAt.current));
    }, result === 'ok' ? 650 : 900);
  }, []);

  const startAnswering = useCallback(() => {
    if (resolveTimer.current !== null) window.clearTimeout(resolveTimer.current);
    startedAt.current = Date.now();
    phaseRef.current = 'answering';
    setPhase('answering');
    setSelected(null);
    setShowHint(false);
    resolveTimer.current = window.setTimeout(() => finish('fail'), LIMIT_MS);
  }, [finish]);

  useEffect(() => {
    startedAt.current = 0;
    phaseRef.current = 'intro';
    setPhase('intro');
    setSelected(null);
    setSelectedAnchor(null);
    setShowHint(false);
    return () => {
      if (resolveTimer.current !== null) window.clearTimeout(resolveTimer.current);
    };
  }, [item.wordId]);

  const begin = () => {
    if (phaseRef.current !== 'intro') return;
    phaseRef.current = 'anchor';
    setPhase('anchor');
  };

  const chooseAnchor = (value: string) => {
    if (phaseRef.current !== 'anchor') return;
    const isCorrect = value.toLowerCase() === anchor.toLowerCase();
    setSelectedAnchor(value);
    phaseRef.current = isCorrect ? 'anchor-correct' : 'anchor-wrong';
    setPhase(phaseRef.current);
    if (isCorrect) playSuccessTone();
    else navigator.vibrate?.([25, 25, 45]);
    resolveTimer.current = window.setTimeout(startAnswering, isCorrect ? 350 : 900);
  };

  const choose = (word: string) => {
    if (phaseRef.current !== 'answering') return;
    setSelected(word);
    finish(word === item.en ? 'ok' : 'fail', word);
  };

  const scene = item.sceneEs || item.keyword || `Recupera la palabra que significa “${item.es}”.`;

  return (
    <main className="discovery-stage discovery-challenge-stage" aria-live="polite">
      <header className="discovery-challenge-topbar">
        <div>
          <p className="discovery-brand">MEMORA <span>RECUPERACIÓN</span></p>
          <p className="discovery-challenge-caption">Una conexión que acabas de guardar</p>
        </div>
        <button type="button" className="mission-exit" onClick={() => navigate('/', { replace: true, state: null })}>✕ Salir al Inicio</button>
        <span className={`discovery-challenge-status ${phase}`}>
          {phase === 'intro' ? 'Preparado' : phase === 'anchor' ? '🧠 Puente' : phase === 'anchor-correct' ? '✅ Fijado' : phase === 'anchor-wrong' ? '💡 Mira la escena' : phase === 'answering' ? '⚡ 5s' : phase === 'correct' ? '+10 XP' : 'Vuelve a intentarlo'}
        </span>
      </header>
      <div className={`discovery-fire-track ${phase !== 'answering' ? 'is-ready' : ''}`} aria-label={phase === 'answering' ? 'Tiempo restante' : 'El tiempo empieza al recuperar el puente'}>
        <motion.div key={item.wordId} initial={{ width: '100%' }} animate={phase === 'answering' ? { width: '0%' } : { width: '100%' }} transition={{ duration: phase === 'answering' ? LIMIT_MS / 1000 : 0, ease: 'linear' }} />
      </div>

      <section className={`discovery-challenge-card ${phase}`}>
        <p className="discovery-card-kicker">{phase === 'intro' ? 'ANTES DE EMPEZAR' : phase.startsWith('anchor') ? 'FIJA EL PUENTE MNEMOTÉCNICO' : 'RECUPERA LA PALABRA'}</p>
        {phase === 'intro' ? (
          <div className="discovery-challenge-instructions">
            <strong>Vas a recuperar una palabra en inglés.</strong>
            <span>Mira la escena y, cuando pulses «Estoy listo», recupera primero la palabra puente. Después tendrás cinco segundos para elegir el inglés.</span>
          </div>
        ) : null}
        {phase === 'intro' || phase.startsWith('anchor') || showHint ? (
          <div className="discovery-challenge-scene">
            <span className="discovery-challenge-emoji" aria-hidden="true">{item.keyword ? '🧠' : '🧩'}</span>
            <div>
              <small>La escena que acabas de conectar</small>
              <p><Rich text={scene} /></p>
            </div>
          </div>
        ) : (
          <div className="discovery-challenge-memory-closed">🧠 Escena guardada · recupérala desde tu imagen mental</div>
        )}
        {phase === 'anchor' || phase === 'anchor-correct' || phase === 'anchor-wrong' ? (
          <>
            <div className="discovery-challenge-prompt"><span>¿Con qué palabra puente conectamos {item.en.toUpperCase()}?</span></div>
            <div className="discovery-challenge-options discovery-challenge-anchor-options">
              {anchorOptions.map((value) => {
                const correct = value.toLowerCase() === anchor.toLowerCase();
                const wrongPicked = phase === 'anchor-wrong' && selectedAnchor === value && !correct;
                const reveal = phase === 'anchor-wrong' && correct;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    className={`discovery-challenge-option ${phase === 'anchor-correct' && correct ? 'is-correct' : ''} ${wrongPicked ? 'is-wrong' : ''} ${reveal ? 'is-revealed' : ''}`}
                    disabled={phase !== 'anchor'}
                    whileTap={phase === 'anchor' ? { scale: 0.96 } : undefined}
                    animate={phase === 'anchor-correct' && correct ? { scale: [1, 1.08, 1] } : reveal ? { x: [0, -7, 7, 0] } : undefined}
                    onClick={() => chooseAnchor(value)}
                  >
                    {value}
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : phase !== 'intro' ? (
          <>
            <div className="discovery-challenge-prompt">
              <span>Toca la palabra inglesa que corresponde</span>
              <SpeakBtn text={item.en} title="Escuchar la palabra" allowBrowserFallback audioUrl={item.audioUrl} />
            </div>
            <button type="button" className="discovery-challenge-hint" onClick={() => setShowHint((value) => !value)}>
              {showHint ? '▴ Ocultar escena' : '💡 Recordar escena'}
            </button>
            <div className="discovery-challenge-options">
              {options.map((word) => {
                const correct = word === item.en;
                const wrongPicked = phase === 'wrong' && selected === word && !correct;
                const reveal = phase === 'wrong' && correct;
                return (
                  <motion.button
                    key={word}
                    type="button"
                    className={`discovery-challenge-option ${phase === 'correct' && correct ? 'is-correct' : ''} ${wrongPicked ? 'is-wrong' : ''} ${reveal ? 'is-revealed' : ''}`}
                    disabled={phase !== 'answering'}
                    whileTap={phase === 'answering' ? { scale: 0.96 } : undefined}
                    animate={phase === 'correct' && correct ? { scale: [1, 1.1, 1] } : reveal ? { x: [0, -7, 7, 0] } : undefined}
                    onClick={() => choose(word)}
                  >
                    {word}
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : null}
        {phase === 'intro' ? (
          <button type="button" className="btn big discovery-challenge-start" onClick={begin}>Estoy listo · recuperar puente →</button>
        ) : null}
        {phase === 'anchor-correct' ? (
          <motion.p className="discovery-challenge-feedback is-correct" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>✅ {anchor} · puente recuperado. Ahora busca el inglés.</motion.p>
        ) : null}
        {phase === 'anchor-wrong' ? (
          <motion.p className="discovery-challenge-feedback is-wrong" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>La conexión era <strong>{anchor}</strong>. La escena queda como pista y ahora empieza el reto de inglés.</motion.p>
        ) : null}
        {phase === 'correct' ? (
          <motion.p className="discovery-challenge-feedback is-correct" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>🔥 ¡Conexión recuperada! +10 XP</motion.p>
        ) : null}
        {phase === 'wrong' ? (
          <motion.p className="discovery-challenge-feedback is-wrong" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>La palabra era <strong>{item.en}</strong>. La volveremos a poner en tu ruta.</motion.p>
        ) : null}
      </section>
      <p className="discovery-keyboard-hint">Toca una respuesta · sin escribir</p>
      {phase === 'correct' ? <Confetti /> : null}
    </main>
  );
}

function Confetti() {
  return (
    <div className="discovery-confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2;
        return (
          <motion.i
            key={index}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, .7], x: Math.cos(angle) * 150, y: Math.sin(angle) * 150, rotate: 210 }}
            transition={{ duration: .72, delay: index * .018, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

function playSuccessTone() {
  try {
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + .12);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.12, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .24);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .25);
    window.setTimeout(() => { void context.close(); }, 350);
  } catch {
    toast('🔥 ¡Bien! Conexión recuperada.');
  }
}
