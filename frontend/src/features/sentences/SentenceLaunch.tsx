import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const AUTO_REDIRECT_MS = 7_000;

interface SentenceLaunchProps {
  onContinue: () => void;
  label?: string;
}

/**
 * Puente común entre una ronda y el uso real. El callback se guarda en un ref
 * para que el contador no se reinicie mientras React actualiza la barra.
 */
export function SentenceLaunch({ onContinue, label = '🔥 Construir Frases (Continúa la racha)' }: SentenceLaunchProps) {
  const [remaining, setRemaining] = useState(7);
  const callbackRef = useRef(onContinue);
  callbackRef.current = onContinue;

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, Math.ceil((AUTO_REDIRECT_MS - elapsed) / 1_000)));
    }, 100);
    const timeout = window.setTimeout(() => callbackRef.current(), AUTO_REDIRECT_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  const progress = Math.max(0, Math.min(100, (remaining / 7) * 100));

  return (
    <div className="sentence-launch">
      <motion.button
        type="button"
        className="btn big sentence-launch-button"
        whileTap={{ scale: 0.97 }}
        animate={{ scale: [1, 1.018, 1] }}
        transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
        onClick={onContinue}
      >
        {label}
      </motion.button>
      <div className="sentence-launch-track" role="progressbar" aria-label="Continuación automática" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={7}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.1, ease: 'linear' }} />
      </div>
      <p>Si no tocas nada, continuamos en {remaining}s</p>
    </div>
  );
}
