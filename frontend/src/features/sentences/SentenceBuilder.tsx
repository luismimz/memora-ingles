import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { playNaturalFast } from '../../components/common';
import { shuffle } from '../../components/common';
import { useStore } from '../../store';
import { DEFAULT_SENTENCE_MISSION, type SentenceMission } from './sentenceMission';

interface SentenceTile {
  id: string;
  word: string;
  normalized: string;
}

export { DEFAULT_SENTENCE_MISSION } from './sentenceMission';
export type { SentenceMission } from './sentenceMission';

interface SentenceBuilderProps {
  mission?: SentenceMission;
  onComplete?: (xp: number) => void;
}

/**
 * Constructor táctil: el usuario ordena fichas para producir una frase útil.
 * Se puede abrir directamente o recibir una misión futura mediante location.state.
 */
export function SentenceBuilder({ mission = DEFAULT_SENTENCE_MISSION, onComplete }: SentenceBuilderProps) {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const missionQueue = useMemo(() => {
    const state = location.state as { mission?: SentenceMission; missions?: SentenceMission[] } | null;
    const supplied = state?.missions?.length ? state.missions : state?.mission ? [state.mission] : [];
    return (supplied.length ? supplied : [mission])
      .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
      .slice(0, 3);
  }, [location.state, mission]);
  const [queueIndex, setQueueIndex] = useState(0);
  const activeMission = missionQueue[Math.min(queueIndex, missionQueue.length - 1)] ?? mission;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistake, setMistake] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const completionHandled = useRef(false);
  const activeMissionRef = useRef(activeMission.id);

  const acceptedSequences = useMemo(() => {
    const raw = activeMission.acceptedSentences?.length
      ? activeMission.acceptedSentences
      : [activeMission.correctWords.join(' ')];
    return raw.map(tokenizeSentence).filter((sequence) => sequence.length > 0);
  }, [activeMission]);

  const tiles = useMemo(() => {
    const maxCounts = new Map<string, number>();
    const display = new Map<string, string>();
    for (const sequence of acceptedSequences) {
      const counts = new Map<string, number>();
      for (const word of sequence) {
        const normalized = normalizeToken(word);
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
        if (!display.has(normalized)) display.set(normalized, word);
      }
      for (const [normalized, count] of counts) maxCounts.set(normalized, Math.max(maxCounts.get(normalized) ?? 0, count));
    }

    const answerWords: string[] = [];
    const usedCounts = new Map<string, number>();
    const addAnswerWord = (word: string) => {
      const normalized = normalizeToken(word);
      if (!normalized || (usedCounts.get(normalized) ?? 0) >= (maxCounts.get(normalized) ?? 0)) return;
      answerWords.push(display.get(normalized) ?? word);
      usedCounts.set(normalized, (usedCounts.get(normalized) ?? 0) + 1);
    };
    for (const word of acceptedSequences[0] ?? activeMission.correctWords) addAnswerWord(word);
    for (const sequence of acceptedSequences) for (const word of sequence) addAnswerWord(word);

    const correct = answerWords.map((word, index) => ({
      id: `${activeMission.id}-correct-${index}`,
      word,
      normalized: normalizeToken(word),
    }));
    const distractors = (activeMission.distractors ?? []).map((word, index) => ({
      id: `${activeMission.id}-distractor-${index}`,
      word,
      normalized: normalizeToken(word),
    }));
    return shuffle([...correct, ...distractors.filter((tile) => !maxCounts.has(tile.normalized))]);
  }, [acceptedSequences, activeMission]);

  const selectedTiles = selectedIds.flatMap((id) => {
    const tile = tiles.find((candidate) => candidate.id === id);
    return tile ? [tile] : [];
  });
  const selectedSet = new Set(selectedIds);
  const nextIndex = selectedIds.length;

  useEffect(() => {
    setQueueIndex(0);
  }, [location.key]);

  useEffect(() => {
    setSelectedIds([]);
    setMistake(null);
    setCompleted(false);
    setEarnedXp(0);
    completionHandled.current = false;
  }, [activeMission.id]);

  useEffect(() => {
    // Al pasar a la siguiente misión todavía hay un render intermedio con
    // `completed=true`; no debemos premiar dos veces antes de que el reset
    // de la nueva tarjeta se aplique.
    if (activeMissionRef.current !== activeMission.id) {
      activeMissionRef.current = activeMission.id;
      return;
    }
    if (!completed || completionHandled.current) return;
    completionHandled.current = true;
    const xp = activeMission.xp ?? 25;
    setEarnedXp(xp);
    void store.addXp(xp);
    const stopAudio = playNaturalFast(activeMission.correctWords.join(' '));
    onComplete?.(xp);
    return stopAudio;
  }, [activeMission, completed, onComplete, store.addXp]);

  const markMistake = (tile: SentenceTile) => {
    setMistake(tile.id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(55);
    window.setTimeout(() => setMistake((value) => (value === tile.id ? null : value)), 620);
  };

  const isAcceptedPrefix = (candidate: SentenceTile[]) => acceptedSequences.some((sequence) => (
    candidate.length <= sequence.length
    && candidate.every((tile, index) => tile.normalized === normalizeToken(sequence[index]))
  ));

  const isAcceptedSentence = (candidate: SentenceTile[]) => acceptedSequences.some((sequence) => (
    candidate.length === sequence.length
    && candidate.every((tile, index) => tile.normalized === normalizeToken(sequence[index]))
  ));

  const pickTile = (tile: SentenceTile) => {
    if (completed || selectedSet.has(tile.id)) return;
    const nextSelected = [...selectedTiles, tile];
    if (!isAcceptedPrefix(nextSelected)) {
      markMistake(tile);
      return;
    }
    setSelectedIds(nextSelected.map((candidate) => candidate.id));
    if (isAcceptedSentence(nextSelected)) {
      setCompleted(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([35, 45, 70]);
    }
  };

  const removeTile = (tileId: string) => {
    if (completed) return;
    // Al retirar una ficha también devolvemos las que estaban después:
    // la línea siempre conserva un prefijo correcto y no puede dejar huecos.
    setSelectedIds((ids) => {
      const index = ids.indexOf(tileId);
      return index >= 0 ? ids.slice(0, index) : ids;
    });
  };

  const handleDrop = (tile: SentenceTile, info: PanInfo) => {
    const rect = dropzoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const inside = info.point.x >= rect.left && info.point.x <= rect.right && info.point.y >= rect.top && info.point.y <= rect.bottom;
    if (inside) pickTile(tile);
  };

  const sentence = selectedTiles.map((tile) => tile.word).join(' ');
  const leaveMission = () => navigate('/', { replace: true, state: null });

  return (
    <main className={`sentence-stage ${completed ? 'is-complete' : ''}`}>
      <div className="sentence-shell">
        <header className="sentence-topbar">
          <button type="button" className="sentence-back mission-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
          <span className="sentence-xp">Frase {queueIndex + 1}/{missionQueue.length} · ⚡ +{earnedXp || activeMission.xp || 25} XP</span>
        </header>

        <section className="sentence-hero" aria-live="polite">
          <p className="sentence-eyebrow">OUTPUT MAGNÉTICO · PASO 5</p>
          <h1>{completed ? '¡La frase ya es tuya!' : 'Construye una frase real.'}</h1>
          <p className="sentence-context">{activeMission.context ?? 'Convierte la conexión en una frase que puedas usar.'}</p>
        </section>

        <section className="sentence-mission-card">
          <span className="sentence-mission-label">DI ESTO EN INGLÉS</span>
          <strong>{activeMission.promptEs}</strong>
          {activeMission.sourceWord ? <span className="sentence-source">Conexión activa: <b>{activeMission.sourceWord}</b></span> : null}
        </section>

        <section ref={dropzoneRef} className={`sentence-dropzone ${completed ? 'is-complete' : ''}`} aria-label="Zona para ordenar la frase">
          {selectedTiles.length ? selectedTiles.map((tile) => (
            <motion.button
              key={tile.id}
              type="button"
              layoutId={tile.id}
              className="sentence-answer-token"
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => removeTile(tile.id)}
              title="Toca para devolver esta palabra"
            >
              {tile.word}
            </motion.button>
          )) : <span className="sentence-drop-placeholder">Toca o arrastra aquí las palabras, en orden</span>}
        </section>

        <p className={`sentence-feedback ${mistake ? 'is-mistake' : ''}`} role="status">
          {mistake ? 'Esa palabra no abre ninguna frase válida todavía. Prueba otra pieza.' : completed ? `✅ ${sentence}` : `Palabra ${Math.min(nextIndex + 1, acceptedSequences[0]?.length ?? activeMission.correctWords.length)} de ${acceptedSequences[0]?.length ?? activeMission.correctWords.length}`}
        </p>

        <section className="sentence-tile-pool" aria-label="Palabras disponibles">
          <AnimatePresence initial={false} mode="popLayout">
            {tiles.filter((tile) => !selectedSet.has(tile.id)).map((tile) => (
              <motion.button
                key={tile.id}
                type="button"
                layoutId={tile.id}
                className={`sentence-tile ${mistake === tile.id ? 'is-mistake' : ''}`}
                drag={!completed}
                dragSnapToOrigin
                dragElastic={0.16}
                whileDrag={{ scale: 1.08, rotate: 2, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => pickTile(tile)}
                onDragEnd={(_, info) => handleDrop(tile, info)}
              >
                {tile.word}
              </motion.button>
            ))}
          </AnimatePresence>
        </section>

        {completed ? (
          <motion.div className="sentence-success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span>🎉</span>
            <div><strong>Conexión convertida en lenguaje.</strong><small>Kokoro acaba de leer tu frase. Repítela en voz alta una vez.</small></div>
            {queueIndex + 1 < missionQueue.length ? <button type="button" className="btn big sentence-next" onClick={() => setQueueIndex((index) => index + 1)}>Siguiente frase →</button> : <FinalMissionSummary onDiscover={() => navigate('/descubrir', { replace: true, state: null })} onHome={leaveMission} />}
          </motion.div>
        ) : (
          <p className="sentence-hint">Puedes tocar una ficha o arrastrarla a la línea. Si te equivocas, vuelve a intentarlo sin perder la racha.</p>
        )}
      </div>
    </main>
  );
}

function tokenizeSentence(value: string) {
  return value.match(/[A-Za-z]+(?:'[A-Za-z]+)?[!?.,]?/g) ?? [];
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[!?.,]/g, '');
}

function FinalMissionSummary({ onDiscover, onHome }: { onDiscover: () => void; onHome: () => void }) {
  return (
    <section className="sentence-final-summary" aria-live="polite">
      <span className="sentence-final-icon">🏁</span>
      <div><strong>Ronda completada</strong><small>Has convertido todas las conexiones de esta cola en frases que puedes usar.</small></div>
      <div className="row sentence-next-actions">
        <button type="button" className="btn big sentence-next" onClick={onDiscover}>⚡ Descubrir 10 palabras NUEVAS</button>
        <button type="button" className="btn secondary" onClick={onHome}>🏠 Volver al Inicio</button>
      </div>
    </section>
  );
}
