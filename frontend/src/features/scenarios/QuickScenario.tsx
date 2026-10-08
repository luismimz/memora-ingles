import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { playNaturalFast, SpeakBtn } from '../../components/common';
import type { SentenceMission } from '../sentences/sentenceMission';

export interface ScenarioMission {
  id: string;
  location: string;
  interlocutor: string;
  lineEn: string;
  promptEs: string;
  correct: string;
  distractors: string[];
  xp: number;
}

interface QuickScenarioProps {
  mission: ScenarioMission;
  onComplete: (xp: number) => void;
  onExit: () => void;
}

type Phase = 'answering' | 'success' | 'mistake';

/** Micro-roleplay: la estructura recién construida se usa en una situación real. */
export function QuickScenario({ mission, onComplete, onExit }: QuickScenarioProps) {
  const [phase, setPhase] = useState<Phase>('answering');
  const [selected, setSelected] = useState<string | null>(null);
  const completed = useRef(false);
  const completionTimer = useRef<number | null>(null);
  const options = useMemo(() => shuffleOptions([mission.correct, ...mission.distractors]), [mission]);

  useEffect(() => {
    const stop = playNaturalFast(mission.lineEn);
    return () => {
      stop?.();
      if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
    };
  }, [mission.lineEn]);

  const choose = (answer: string) => {
    if (phase === 'success') return;
    setSelected(answer);
    if (answer !== mission.correct) {
      setPhase('mistake');
      window.setTimeout(() => setPhase('answering'), 650);
      return;
    }
    setPhase('success');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([35, 45, 70]);
    void playNaturalFast(`${mission.lineEn} ${mission.correct}`);
    if (!completed.current) {
      completed.current = true;
      completionTimer.current = window.setTimeout(() => onComplete(mission.xp), 700);
    }
  };

  return (
    <section className={`scenario-card scenario-${phase}`} aria-live="polite">
      <header className="scenario-header">
        <div>
          <span className="scenario-eyebrow">USO EN CONTEXTO · PASO 6</span>
          <h2>{mission.location}</h2>
        </div>
        <button type="button" className="mission-exit" onClick={onExit}>✕ Salir al Inicio</button>
      </header>

      <div className="scenario-dialogue">
        <span className="scenario-avatar" aria-hidden="true">{mission.interlocutor.slice(0, 1)}</span>
        <div><small>{mission.interlocutor} dice…</small><p>{mission.lineEn}</p></div>
        <SpeakBtn text={mission.lineEn} title="Repetir diálogo" />
      </div>

      <div className="scenario-prompt"><span>Tu turno</span><strong>{mission.promptEs}</strong></div>

      <div className="scenario-options" aria-label="Respuestas posibles">
        {options.map((option) => {
          const isCorrect = option === mission.correct;
          const isWrong = phase === 'mistake' && selected === option;
          return (
            <motion.button
              key={option}
              type="button"
              className={`scenario-option ${phase === 'success' && isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
              whileTap={{ scale: .96 }}
              animate={phase === 'success' && isCorrect ? { scale: [1, 1.06, 1] } : isWrong ? { x: [0, -7, 7, 0] } : undefined}
              onClick={() => choose(option)}
            >
              {option}
            </motion.button>
          );
        })}
      </div>

      {phase === 'success' ? <motion.div className="scenario-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><span>🎉</span><div><strong>Eso ya es inglés que puedes usar.</strong><small>Diálogo completo reproducido · +{mission.xp} XP de uso en contexto</small></div></motion.div> : <p className="scenario-hint">Escucha, entiende la situación y elige la respuesta que usarías de verdad.</p>}
      {phase === 'success' ? <Confetti /> : null}
    </section>
  );
}

export function scenarioFromSentence(mission: SentenceMission): ScenarioMission {
  const canonical = mission.acceptedSentences?.[0] || mission.correctWords.join(' ');
  const borrow = mission.sourceWord?.toLowerCase() === 'borrow' || /charger/i.test(canonical);
  if (borrow) {
    return {
      id: `scenario-${mission.id}`,
      location: 'En la cafetería',
      interlocutor: 'Alex',
      lineEn: 'I really need to call my boss, but my battery is dead.',
      promptEs: 'Ofrece tu cargador usando la estructura aprendida.',
      correct: 'You can borrow my charger.',
      distractors: ['I actually lost my charger yesterday.', 'Can you improve my battery?'],
      xp: 25,
    };
  }
  return {
    id: `scenario-${mission.id}`,
    location: 'En la vida real',
    interlocutor: 'Tu compañero',
    lineEn: 'I need to use this idea in a real conversation today.',
    promptEs: mission.promptEs,
    correct: canonical,
    distractors: ['I do not know this word yet.', 'Maybe we can talk about it later.'],
    xp: 25,
  };
}

function shuffleOptions(options: string[]) {
  return [...new Set(options)].sort(() => Math.random() - .5);
}

function Confetti() {
  return <div className="scenario-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return <i key={index} style={{ '--i': index, '--x': `${Math.cos(angle) * 120}px`, '--y': `${Math.sin(angle) * 100}px` } as CSSProperties} />;
  })}</div>;
}
