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
import { playSnap, stopSpeech } from '../services/audio';
import { GrammarSituation } from './GrammarSituation';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';

/** Same cards and flip as recall. The pool is prepared before entering this component. */
export function GrammarArcade({ units, userId, inspection, onExit, onWords, initialRound = 0, onRoundAdvance, automatic = false }: { units: AtomicUnit[]; userId: string; inspection: boolean; onExit: () => void; onWords: () => void; initialRound?: number; onRoundAdvance?: (completed: number) => void; automatic?: boolean }) {
  const [rounds] = useState(() => distinctGrammarMessages(grammarArcadeRounds(userId, units, inspection)).slice(0, automatic ? 3 : 15));
  const [index, setIndex] = useState(initialRound);
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const startRound = useRef(initialRound).current;
  const [result, setResult] = useState<'correct' | 'rescue' | null>(null);
  const modelAudio = useSpeechPlayback();
  const [selected, setSelected] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const locked = useRef(false);
  const localIndex = index - startRound;
  const limit = arcadeSessionLength(rounds.length, automatic);
  const round = rounds[localIndex % rounds.length];
  function listenToSituation() {
    if (!round?.situation || clock.paused) return;
    if (!inspection) recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:grammar-audio:${index}`, skill: round.skill, phase: 'arcade', source: 'authored', modality: 'choice', prompt: round.slot.es, response: 'Modelo inglés solicitado; no acredita escucha ni pronunciación.', expected: '', correct: null, helped: true });
    void modelAudio.listen(round.situation.situation!.message);
  }
  const text = (value: string, language: 'en' | 'es' = 'en') => round?.form ? <GrammarText text={value} form={round.form} language={language} /> : <span lang={language}>{value}</span>;
  function answer(response: string | null) {
    if (!round || locked.current || clock.paused || clock.checkpoint) return;
    locked.current = true;
    const correct = response === round.slot.en;
    setSelected(response ?? ''); setResult(correct ? 'correct' : 'rescue');
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
    if (!round.conceptual) void modelAudio.listen(round.sentence.en);
  }
  const sceneCalm = calm || inspection || Boolean(round?.situation) || modelAudio.audio?.status === 'preparing' || modelAudio.audio?.status === 'playing';
  const clock = useArcadeClock(localIndex, result !== null, Boolean(round), () => answer(null), () => {
    // Let the answer/rescue finish before returning to the adventure. Never loop a tiny pool to 15.
    if (automatic && localIndex + 1 >= limit) { modelAudio.reset(); stopSpeech(); onExit(); return; }
    modelAudio.reset(); stopSpeech(); locked.current = false; setResult(null); setSelected(''); setIndex((value) => value + 1); onRoundAdvance?.(index + 1);
  }, 0, 10000, limit, sceneCalm, true);
  const reminder = round ? <div className="arcade-correction" role="status"><strong>{text(round.slot.en)}</strong><p>{round.slot.note ?? round.form?.memoryTrick?.explanation ?? `Relaciona «${round.slot.es}» con «${round.slot.en}».`}</p></div> : undefined;
  return <div className="arcade-grammar-shell">
    <div className="arcade-stream-tools">
      <span className="arcade-mark" aria-hidden="true">✦</span>
      <button type="button" className="quiet-action" onClick={() => { modelAudio.reset(); stopSpeech(); clock.togglePause(); }}>{clock.paused ? 'Seguir' : 'Pausar'}</button>
      <details className="arcade-mode-options"><summary>Opciones</summary>
        <button type="button" className="quiet-action" aria-label="Jugar sin cuenta atrás" aria-pressed={calm} onClick={() => { stopSpeech(); const next = !calm; writeArcadeCalm(userId, next); setCalm(next); }}>{calm ? 'Sin reloj ✓' : 'Sin reloj'}</button>
        <button type="button" className="quiet-action" onClick={onWords}>Asociaciones</button>
      </details>
    </div>
    <GameCard feedback={result === 'correct' ? 'correct' : result === 'rescue' ? 'model' : undefined} vertical stepKey={`arcade-scene:${index}`} onAdvance={clock.checkpoint ? onExit : result !== null && !clock.paused ? clock.advanceNow : undefined} advanceLabel={clock.checkpoint ? 'Volver al recorrido' : automatic && localIndex + 1 >= limit ? 'Volver a la aventura' : 'Siguiente reto'} className={`arcade-stream-card arcade-grammar-card ${result === 'correct' ? 'recall-correct' : 'recall-calm'}`}>
    {clock.checkpoint ? <ArcadeCheckpoint inFeed rounds={limit} onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, un truco.</h1><button type="button" onClick={onWords}>Volver a las asociaciones</button></div> : <div className="recall-content"><p className="eyebrow">GRAMÁTICA · {localIndex % limit + 1}/{limit}</p>{sceneCalm ? <span className="sr-only" role="status">Sin cuenta atrás · a tu ritmo</span> : <ArcadeClock durationMs={10000} remaining={clock.remaining} paused={clock.paused} revealed={result !== null} />}{round.situation ? <><h1>Elige la escena</h1><fieldset className="arcade-situation"><legend className="sr-only">Elige la acción que significa el mensaje</legend><GrammarSituation disabled={result !== null || clock.paused} listenDisabled={clock.paused} check={round.situation} selected={selected} feedback={result === 'correct' ? 'correct' : result === 'rescue' ? 'help' : 'idle'} onAnswer={answer} onListen={listenToSituation} /></fieldset>{result === 'rescue' ? <p className="arcade-reminder-story" role="status">{round.slot.note} Modelo: {round.slot.en}</p> : null}</> : <><SceneVisual word={round.unit.words[0]} compact /><h1>{text(round.conceptual ? round.slot.es : round.sentence.es, 'es')}</h1>{!round.conceptual ? <p className="arcade-grammar-prompt" lang="en">{round.sentence.slots.map((slot, slotIndex) => <span key={slotIndex}>{slotIndex === round.slotIndex ? <b className="grammar-gap">?</b> : text(slot.en)}{' '}</span>)}</p> : null}<div className="recall-choices arcade-grammar-options">{(index % 2 ? [...round.slot.choices].reverse() : round.slot.choices).map((choice) => <button type="button" key={choice} disabled={result !== null || clock.paused} className={result !== null && choice === round.slot.en ? result === 'correct' ? 'is-correct' : 'is-model' : result === 'rescue' && selected === choice ? 'is-wrong' : ''} onClick={() => answer(choice)}>{choice}</button>)}</div>{result === 'rescue' ? reminder : null}{result === 'correct' ? <p className="arcade-result-status" role="status">✓ Mensaje conectado</p> : null}</>}<AssociationAudioStatus state={modelAudio.audio} compact /></div>}
  </GameCard></div>;
}
