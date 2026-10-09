import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { playNaturalFast } from '../../components/common';
import { shuffle } from '../../components/common';
import { useStore } from '../../store';
import type { SentenceMission } from './sentenceMission';
import { haptic, playSentenceSound } from './sentenceGameFeel';

interface SentenceTile {
  id: string;
  word: string;
  normalized: string;
}

export type { SentenceMission } from './sentenceMission';

interface SentenceBuilderProps {
  mission?: SentenceMission;
  missions?: SentenceMission[];
  onComplete?: (xp: number) => void;
  onExit?: () => void;
  /** Cuando existe, el controlador de Misión toma el relevo en la fase LOOT. */
  onRoundComplete?: (mission: SentenceMission, xp: number) => void;
}

/**
 * Constructor táctil: el usuario ordena fichas para producir una frase útil.
 * Puede funcionar como componente autónomo o como fase controlada por la misión.
 */
export function SentenceBuilder({ mission, missions, onComplete, onExit, onRoundComplete }: SentenceBuilderProps) {
  const store = useStore();
  const navigate = useNavigate();
  const missionQueue = useMemo(() => {
    const supplied = missions?.length ? missions : [];
    return (supplied.length ? supplied : mission ? [mission] : [])
      .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
      .slice(0, 3);
  }, [mission, missions]);
  const [queueIndex, setQueueIndex] = useState(0);
  const activeMission = missionQueue[Math.min(queueIndex, missionQueue.length - 1)] ?? null;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistake, setMistake] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const completionHandled = useRef(false);
  const activeMissionRef = useRef(activeMission?.id ?? '');
  const lastCorrectAt = useRef<number | null>(null);
  const comboRef = useRef(0);
  const comboBonus = useRef(0);

  const acceptedSequences = useMemo(() => {
    const raw = activeMission?.acceptedSentences?.length
      ? activeMission.acceptedSentences
      : activeMission ? [activeMission.targetSentenceEn] : [];
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
    for (const word of acceptedSequences[0] ?? activeMission?.correctWords ?? []) addAnswerWord(word);
    for (const sequence of acceptedSequences) for (const word of sequence) addAnswerWord(word);

    const correct = answerWords.map((word, index) => ({
      id: `${activeMission?.id ?? 'empty'}-correct-${index}`,
      word,
      normalized: normalizeToken(word),
    }));
    const distractors = (activeMission?.distractors ?? []).map((word, index) => ({
      id: `${activeMission?.id ?? 'empty'}-distractor-${index}`,
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
    setSelectedIds([]);
    setMistake(null);
    setCompleted(false);
    setEarnedXp(0);
    setCombo(0);
    comboRef.current = 0;
    lastCorrectAt.current = null;
    comboBonus.current = 0;
    completionHandled.current = false;
  }, [activeMission?.id]);

  useEffect(() => {
    // Al pasar a la siguiente misión todavía hay un render intermedio con
    // `completed=true`; no debemos premiar dos veces antes de que el reset
    // de la nueva tarjeta se aplique.
    if (!activeMission) return;
    if (activeMissionRef.current !== activeMission.id) {
      activeMissionRef.current = activeMission.id;
      return;
    }
    if (!activeMission || !completed || completionHandled.current) return;
    completionHandled.current = true;
    const xp = (activeMission.xp ?? 25) + comboBonus.current;
    setEarnedXp(xp);
    setRoundXp((value) => value + xp);
    void store.addXp(xp);
    playSentenceSound('fanfare');
    const stopAudio = playNaturalFast(activeMission.targetSentenceEn);
    onComplete?.(xp);
    return stopAudio;
  }, [activeMission, completed, onComplete, store.addXp]);

  const markMistake = (tile: SentenceTile) => {
    setMistake(tile.id);
    playSentenceSound('wrong');
    haptic(35);
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
    const now = Date.now();
    const nextCombo = lastCorrectAt.current !== null && now - lastCorrectAt.current < 2500
      ? Math.min(comboRef.current + 1, 5)
      : 1;
    lastCorrectAt.current = now;
    comboRef.current = nextCombo;
    setCombo(nextCombo);
    comboBonus.current = Math.min(Math.max(nextCombo - 1, 0) * 5, 25);
    playSentenceSound('snap');
    haptic(15);
    setSelectedIds(nextSelected.map((candidate) => candidate.id));
    if (isAcceptedSentence(nextSelected)) {
      setCompleted(true);
      haptic([35, 45, 70]);
    }
  };

  const liftTile = () => playSentenceSound('lift');

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
  const leaveMission = onExit ?? (() => navigate('/', { replace: true, state: null }));

  if (!activeMission) {
    return (
      <main className="sentence-stage sentence-stage-empty">
        <div className="sentence-shell">
          <header className="sentence-topbar">
            <button type="button" className="sentence-back mission-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
          </header>
          <section className="sentence-final-summary" aria-live="polite">
            <strong>No hay frases preparadas todavía.</strong>
            <p>Completa una conexión enriquecida en Directus para desbloquear el constructor.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={`sentence-stage ${completed ? 'is-complete' : ''}`}>
      <div className="sentence-shell">
        <header className="sentence-topbar">
          <button type="button" className="sentence-back mission-exit" onClick={leaveMission}>✕ Salir al Inicio</button>
          <div className="sentence-topbar-right">
            {combo > 0 ? <motion.span className={`sentence-combo-hud ${combo >= 3 ? 'is-hot' : ''}`} animate={{ scale: combo >= 2 ? [1, 1.12, 1] : 1 }} transition={{ duration: .35 }}>COMBO x{combo}{combo >= 3 ? ' 🔥' : ''}</motion.span> : null}
            <span className="sentence-xp">Frase {queueIndex + 1}/{missionQueue.length} · ⚡ +{earnedXp || activeMission.xp || 25} XP</span>
          </div>
        </header>

        <section className="sentence-hero" aria-live="polite">
          <p className="sentence-eyebrow">OUTPUT MAGNÉTICO · PASO 5</p>
          <h1>{completed ? '¡La frase ya es tuya!' : 'Pon la escena en orden.'}</h1>
          <p className="sentence-context">Toca o arrastra cada ficha para decir exactamente lo que ocurre. Sin copiar: tú controlas el ritmo.</p>
        </section>

        <section className="sentence-mission-card">
          <span className="sentence-mission-label">🎬 ESCENA CÓMICA · DI ESTO EXACTAMENTE</span>
          <em>{activeMission.context}</em>
          <strong>{activeMission.promptEs}</strong>
          {activeMission.sourceWord ? <span className="sentence-source">Conexión activa: <b>{activeMission.sourceWord}</b></span> : null}
        </section>

        <>
        <section ref={dropzoneRef} className={`sentence-dropzone ${completed ? 'is-complete' : ''}`} aria-label="Zona para ordenar la frase">
          {selectedTiles.length ? selectedTiles.map((tile) => (
            <motion.button
              key={tile.id}
              type="button"
              layoutId={tile.id}
              className="sentence-answer-token"
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: [0.72, 1.12, 1], opacity: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
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
                onClick={() => { liftTile(); pickTile(tile); }}
                onDragStart={liftTile}
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
            {combo >= 2 ? <div className="sentence-combo-reward">⚡ Racha rápida: +{comboBonus.current} XP</div> : null}
            {combo >= 2 ? <div className="sentence-combo-sparks" aria-hidden="true">{[0, 1, 2, 3, 4].map((spark) => <i key={spark} style={{ '--spark': spark } as CSSProperties}>✦</i>)}</div> : null}
            {queueIndex + 1 < missionQueue.length
              ? <button type="button" className="btn big sentence-next" onClick={() => setQueueIndex((index) => index + 1)}>Siguiente frase →</button>
              : onRoundComplete
                ? <button type="button" className="btn big sentence-next" onClick={() => onRoundComplete(activeMission, roundXp || earnedXp)}>Abrir sobre de colección →</button>
                : <LootPack mission={activeMission} words={missionQueue.length} xp={roundXp} onDiscover={() => navigate('/descubrir', { replace: true, state: { startNewRound: true } })} onHome={leaveMission} />}
          </motion.div>
        ) : (
          <p className="sentence-hint">Puedes tocar una ficha o arrastrarla a la línea. Si te equivocas, vuelve a intentarlo sin perder la racha.</p>
        )}
        </>
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

export function LootPack({ mission, words, xp, onDiscover, onHome }: { mission: SentenceMission; words: number; xp: number; onDiscover: () => void; onHome: () => void }) {
  const [opened, setOpened] = useState(false);
  const rarity = mission.rarity ?? 'common';
  const rarityLabel = rarity === 'legendary' ? 'Legendaria holográfica' : rarity === 'rare' ? 'Rara' : 'Común';

  useEffect(() => {
    if (!opened) return;
    return playNaturalFast(mission.targetSentenceEn, false, 8000, true);
  }, [mission, opened]);

  return (
    <section className={`sentence-final-summary ${opened ? 'is-open' : ''}`} aria-live="polite">
      <div className="sentence-loot-heading">
        <span className="sentence-final-icon">🏁</span>
        <div><strong>Ronda completada</strong><small>{words} palabras usadas · +{xp} XP · has desbloqueado un sobre.</small></div>
      </div>
      {!opened ? (
        <motion.button
          type="button"
          className="sentence-loot-pack"
          onClick={() => { setOpened(true); haptic([18, 35, 18]); playSentenceSound('fanfare'); }}
          animate={{ y: [0, -4, 0], rotate: [-1, 1, -1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-label="Abrir sobre de colección"
        >
          <span className="sentence-loot-seal">M</span>
          <b>Sobre de colección</b>
          <small>Toca para abrir tu recompensa</small>
        </motion.button>
      ) : (
        <motion.div className={`sentence-loot-card rarity-${rarity}`} initial={{ opacity: 0, scale: .75, rotateY: -16 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
          <div className="sentence-loot-particles" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--particle': index } as CSSProperties}>✦</i>)}</div>
          <span className="sentence-loot-rarity">{rarityLabel}</span>
          <span className="sentence-loot-art">{mission.illustration ?? '🧠'}</span>
          <strong>{mission.sourceWord ?? mission.correctWords[0]}</strong>
          <small>{mission.pronunciation ?? mission.correctWords.join(' ')}</small>
          <em>Escena recuperada · audio reproducido</em>
        </motion.div>
      )}
      <div className="row sentence-next-actions">
        <button type="button" className="btn big sentence-next" onClick={onDiscover}>🔥 SIGUIENTE RONDA (+10 NUEVAS)</button>
        <button type="button" className="btn secondary" onClick={onHome}>🏠 Volver al Inicio</button>
      </div>
    </section>
  );
}
