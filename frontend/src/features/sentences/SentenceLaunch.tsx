import { motion } from 'framer-motion';

interface SentenceLaunchProps {
  onContinue: () => void;
  label?: string;
}

/** Puente manual entre una ronda y el uso real: el alumno decide cuándo continuar. */
export function SentenceLaunch({ onContinue, label = '🔥 Construir Frases (Continúa la racha)' }: SentenceLaunchProps) {
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
      <p>Cuando estés listo, continúa. No hay salto automático.</p>
    </div>
  );
}
