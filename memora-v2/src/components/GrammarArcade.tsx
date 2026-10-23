import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';
import { useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';
import { arcadeSessionLength, distinctGrammarMessages } from '../domain/arcadeSession';
import { recordLearningActivity } from '../domain/learningActivity';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { chunkKey, recordChunkExposure, recordChunkRecall } from '../domain/memory';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { GrammarText } from './GrammarText';
import { ArcadeClock, ArcadeCheckpoint } from './ArcadeClock';
import { useArcadeClock } from './useArcadeClock';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { GrammarSituation } from './GrammarSituation';

/** Same cards and flip as recall. The pool is prepared before entering this component. */
export function GrammarArcade({ units, userId, inspection, onExit, onWords, initialRound = 0, onRoundAdvance, automatic = false }: { units: AtomicUnit[]; userId: string; inspection: boolean; onExit: () => void; onWords: () => void; initialRound?: number; onRoundAdvance?: (completed: number) => void; automatic?: boolean }) {
  const [rounds] = useState(() => distinctGrammarMessages(grammarArcadeRounds(userId, units, inspection)).slice(0, automatic ? 3 : 15));
  const [index, setIndex] = useState(initialRound);
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const startRound = useRef(initialRound).current;
  const [result, setResult] = useState<'correct' | 'rescue' | null>(null);
  const [combo, setCombo] = useState(0);
  const [selected, setSelected] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const locked = useRef(false);
  const localIndex = index - startRound;
  const limit = arcadeSessionLength(rounds.length, automatic);
  const round = rounds[localIndex % rounds.length];
  function listenToSituation() {
    if (!round?.situation || clock.paused) return;
    if (!inspection) recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:grammar-audio:${index}`, skill: round.skill, phase: 'arcade', source: 'authored', modality: 'choice', prompt: round.slot.es, response: 'Modelo inglés solicitado; no acredita escucha ni pronunciación.', expected: '', correct: null, helped: true });
    void playEnglish(round.situation.situation!.message);
  }
  const text = (value: string, language: 'en' | 'es' = 'en') => round?.form ? <GrammarText text={value} form={round.form} language={language} /> : <span lang={language}>{value}</span>;
  function answer(response: string | null) {
    if (!round || locked.current) return;
    locked.current = true;
    const correct = response === round.slot.en;
    setSelected(response ?? ''); setResult(correct ? 'correct' : 'rescue'); setCombo((value) => correct ? value + 1 : 0);
    if (!inspection) {
      const now = new Date();
      recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:grammar:${index}`, skill: round.skill, phase: 'arcade', source: 'learner', modality: 'choice', prompt: round.conceptual ? round.slot.es : round.sentence.es, response: response ?? '(sin respuesta)', expected: round.slot.en, correct: response === null ? null : correct, helped: true, feedback: correct ? 'Pieza reconocida entre opciones.' : round.slot.note ?? `Recuerda: ${round.slot.es} → ${round.slot.en}` });
      if (response !== null) recordGrammarAttempt(userId, { skill: round.skill, unitId: round.unit.id, check: `arcade:${round.slotIndex}`, kind: 'choose', correct, helped: true, at: now.toISOString() });
      if (!round.conceptual && response !== null) {
        recordChunkExposure(userId, round.unit.id, round.sentence, round.slotIndex);
        recordChunkRecall(userId, chunkKey(round.unit.id, round.sentence, round.slotIndex), correct ? 'hesitant' : 'missed', now);
      }
    }
    if (correct) playSnap();
    if (!round.conceptual) void playEnglish(round.sentence.en);
  }
  const sceneCalm = calm || Boolean(round?.situation);
  const clock = useArcadeClock(localIndex, result !== null, Boolean(round), () => answer(null), () => {
    // Let the answer/rescue finish before returning to the adventure. Never loop a tiny pool to 15.
    if (automatic && localIndex + 1 >= limit) { onExit(); return; }
    locked.current = false; setResult(null); setSelected(''); setIndex((value) => value + 1); onRoundAdvance?.(index + 1);
  }, result === 'correct' ? 1400 : 3200, 6000, limit, sceneCalm);
  const reminder = round ? <div className="recall-content arcade-reminder"><p className="eyebrow">RECUERDA LA PIEZA</p><SceneVisual word={round.unit.words[0]} compact /><h1>{text(round.slot.en)}</h1><p>{round.slot.es}</p><p className="arcade-reminder-story">{round.slot.note ?? round.form?.memoryTrick?.explanation ?? `Relaciona «${round.slot.es}» con «${round.slot.en}».`}</p>{!round.conceptual ? <p lang="en">{text(round.sentence.en)}</p> : null}<small>{calm ? 'Pulsa Seguir cuando quieras' : 'Siguiente…'}</small></div> : undefined;
  return <div className="arcade-grammar-shell"><div className="arcade-stream-tools"><button type="button" className="quiet-action" aria-label="Jugar sin cuenta atrás" aria-pressed={calm} onClick={() => { stopSpeech(); const next = !calm; writeArcadeCalm(userId, next); setCalm(next); }}>{calm ? 'Sin reloj ✓' : 'Sin reloj'}</button>{calm && !round?.situation && (result !== null) && !clock.checkpoint ? <button type="button" className="quiet-action" disabled={clock.paused} onClick={clock.advanceNow}>Seguir →</button> : null}<button type="button" className="quiet-action" onClick={() => { stopSpeech(); clock.togglePause(); }}>{clock.paused ? 'Seguir' : 'Pausar'}</button><button type="button" className="quiet-action" onClick={onWords}>Asociaciones</button></div><GameCard vertical={Boolean(round?.situation)} stepKey={`arcade-scene:${index}`} onAdvance={round?.situation && result !== null && !clock.paused && !clock.checkpoint ? clock.advanceNow : undefined} advanceLabel={automatic && localIndex + 1 >= limit ? 'Volver a la aventura' : 'Siguiente reto'} className={`arcade-stream-card arcade-grammar-card ${result === 'correct' ? 'recall-correct' : 'recall-calm'}`} showBack={!clock.checkpoint && result === 'rescue' && !round?.situation} back={reminder}>
    {clock.checkpoint ? <ArcadeCheckpoint rounds={limit} onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, un truco.</h1><button type="button" onClick={onWords}>Volver a las asociaciones</button></div> : <div className="recall-content"><p className="eyebrow">GRAMÁTICA · {localIndex % limit + 1}/{limit} <span>COMBO x{Math.max(1, combo)}</span></p>{sceneCalm ? <p role="status">Sin cuenta atrás · a tu ritmo</p> : <ArcadeClock remaining={clock.remaining} paused={clock.paused} revealed={result !== null} onPause={clock.togglePause} />}{round.situation ? <><h1>Haz que la escena cuente el mensaje</h1><fieldset className="arcade-situation"><legend className="sr-only">Elige la acción que significa el mensaje</legend><GrammarSituation disabled={result !== null || clock.paused} listenDisabled={clock.paused} check={round.situation} selected={selected} feedback={result === 'correct' ? 'correct' : result === 'rescue' ? 'help' : 'idle'} onAnswer={answer} onListen={listenToSituation} /></fieldset>{result === 'rescue' ? <p className="arcade-reminder-story" role="status">{round.slot.note} Modelo: {round.slot.en}</p> : null}</> : <><SceneVisual word={round.unit.words[0]} compact /><h1>{text(round.conceptual ? round.slot.es : round.sentence.es, 'es')}</h1>{!round.conceptual ? <p className="arcade-grammar-prompt" lang="en">{round.sentence.slots.map((slot, slotIndex) => <span key={slotIndex}>{slotIndex === round.slotIndex ? <b className="grammar-gap">?</b> : text(slot.en)}{' '}</span>)}</p> : null}<div className="recall-choices arcade-grammar-options">{(index % 2 ? [...round.slot.choices].reverse() : round.slot.choices).map((choice) => <button type="button" key={choice} disabled={result !== null || clock.paused} className={selected === choice && result === 'correct' ? 'is-correct' : ''} onClick={() => answer(choice)}>{choice}</button>)}</div></>}</div>}
  </GameCard></div>;
}
