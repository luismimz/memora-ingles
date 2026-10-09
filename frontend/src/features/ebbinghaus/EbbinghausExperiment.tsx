import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playNaturalFast, shuffle } from '../../components/common';
import type { Word } from '../../types';

type ExperimentPhase = 'idle' | 'playing' | 'done';

/**
 * Microexperimento de recuperación tras una ausencia larga. No sustituye al
 * SRS: hace visible la diferencia entre releer y recuperar activamente.
 */
export function EbbinghausExperiment({ words, absentDays = 3 }: { words: Word[]; absentDays?: number }) {
  const [phase, setPhase] = useState<ExperimentPhase>('idle');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const timerRef = useRef<number | null>(null);
  const current = words[index] ?? null;
  const options = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(words.filter((word) => word.id !== current.id)).slice(0, 2).map((word) => word.en);
    return shuffle([current.en, ...distractors]);
  }, [current, words]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const start = () => {
    setIndex(0);
    setAnswers([]);
    setOptionsVisible(false);
    setLastResult(null);
    setPhase('playing');
  };

  const answer = (choice: string) => {
    if (!current || lastResult !== null) return;
    const correct = choice.toLowerCase() === current.en.toLowerCase();
    setLastResult(correct);
    setAnswers((previous) => [...previous, correct]);
    void playNaturalFast(current.en, false, 8000, true, current.audio_url);
    timerRef.current = window.setTimeout(() => {
      if (index + 1 >= words.length) {
        setPhase('done');
        setOptionsVisible(false);
        setLastResult(null);
      } else {
        setIndex((value) => value + 1);
        setOptionsVisible(false);
        setLastResult(null);
      }
    }, 420);
  };

  if (!words.length) return null;

  if (phase === 'idle') {
    return (
      <section className="ebbinghaus-experiment" aria-labelledby="ebbinghaus-title">
        <div className="ebbinghaus-banner-copy">
          <span className="eyebrow">🧪 EXPERIMENTO DE MEMORIA</span>
          <h2 id="ebbinghaus-title">Han pasado unos días. ¿Qué sigue vivo?</h2>
          <p>🧪 Llevas {Math.max(1, Math.floor(absentDays))} días fuera. Según la curva científica estándar, deberías haber olvidado el 65% de estas palabras. ¿Funcionó la mnemotecnia?</p>
        </div>
        <button type="button" className="btn primary ebbinghaus-start" onClick={start}>Desafiar la curva →</button>
      </section>
    );
  }

  if (phase === 'done') {
    const accuracy = answers.length ? Math.round((answers.filter(Boolean).length / answers.length) * 100) : 0;
    const prediction = 35;
    return (
      <section className="ebbinghaus-experiment ebbinghaus-results" aria-live="polite">
        <span className="eyebrow">CURVA MEDIDA</span>
        <h2>{accuracy >= 70 ? 'Tu memoria aguantó la caída.' : 'Hemos encontrado qué rescatar.'}</h2>
        <div className="ebbinghaus-bars">
          <div><span>Predicción sin Memora</span><strong>{prediction}%</strong><i style={{ width: `${prediction}%` }} /></div>
          <div><span>Tu retención real</span><strong>{accuracy}% 🔥</strong><i className="is-real" style={{ width: `${accuracy}%` }} /></div>
        </div>
        <button type="button" className="btn secondary" onClick={start}>Repetir experimento</button>
      </section>
    );
  }

  return (
    <motion.section className="ebbinghaus-experiment ebbinghaus-playing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
      <div className="spread"><span className="eyebrow">RECUPERACIÓN {index + 1}/{words.length}</span><span className="ebbinghaus-clock">Ebbinghaus · {Math.max(0, answers.filter(Boolean).length)} aciertos</span></div>
      <h2>¿Qué palabra completa esta escena?</h2>
      <p className="ebbinghaus-scene">{current?.scene_es || current?.target_sentence_es || current?.es}</p>
      {!optionsVisible ? (
        <button type="button" className="btn primary" onClick={() => setOptionsVisible(true)}>Estoy listo · mostrar opciones</button>
      ) : (
        <div className="ebbinghaus-options">
          {options.map((option) => <motion.button key={option} type="button" className={lastResult !== null && option.toLowerCase() === current?.en.toLowerCase() ? 'is-correct' : lastResult === false ? 'is-wrong' : ''} whileTap={{ scale: .96 }} onClick={() => answer(option)}>{option}</motion.button>)}
        </div>
      )}
    </motion.section>
  );
}
