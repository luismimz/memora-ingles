import { useRef, useState } from 'react';
import { getPlayableGrammar, getUnitSentences, type AtomicUnit } from '../domain/unit';
import { recordLearningActivity } from '../domain/learningActivity';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { chunkKey, recordChunkExposure, recordChunkRecall } from '../domain/memory';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { GrammarText } from './GrammarText';
import { ArcadeClock, ArcadeCheckpoint } from './ArcadeClock';
import { useArcadeClock } from './useArcadeClock';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';

/** Same cards and flip as recall. The pool is prepared before entering this component. */
export function GrammarArcade({ units, userId, inspection, onExit, onWords }: { units: AtomicUnit[]; userId: string; inspection: boolean; onExit: () => void; onWords: () => void }) {
  const [rounds] = useState(() => units.flatMap((unit) => getUnitSentences(unit).flatMap((sentence) => sentence.slots.map((slot, slotIndex) => ({ unit, sentence, slot, slotIndex, form: getPlayableGrammar(unit)[0] })))));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<'correct' | 'rescue' | null>(null);
  const [combo, setCombo] = useState(0);
  const [selected, setSelected] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const locked = useRef(false);
  const round = rounds[index % rounds.length];
  function answer(response: string | null) {
    if (!round || locked.current) return;
    locked.current = true;
    const correct = response === round.slot.en;
    setSelected(response ?? ''); setResult(correct ? 'correct' : 'rescue'); setCombo((value) => correct ? value + 1 : 0);
    if (!inspection) {
      const now = new Date();
      recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:grammar:${index}`, skill: round.form.id, phase: 'arcade', source: 'learner', modality: 'choice', prompt: round.sentence.es, response: response ?? '(sin respuesta)', expected: round.slot.en, correct: response === null ? null : correct, helped: true, feedback: correct ? 'Pieza reconocida entre opciones.' : round.slot.note ?? `Recuerda: ${round.slot.es} → ${round.slot.en}` });
      if (response !== null) recordGrammarAttempt(userId, { skill: round.form.lesson?.id ?? round.form.id, unitId: round.unit.id, check: `arcade:${round.slotIndex}`, kind: 'choose', correct, helped: true, at: now.toISOString() });
      recordChunkExposure(userId, round.unit.id, round.sentence, round.slotIndex);
      recordChunkRecall(userId, chunkKey(round.unit.id, round.sentence, round.slotIndex), correct ? 'hesitant' : 'missed', now);
    }
    if (correct) playSnap();
    void playEnglish(round.sentence.en);
  }
  const clock = useArcadeClock(index, result !== null, Boolean(round), () => answer(null), () => { locked.current = false; setResult(null); setSelected(''); setIndex((value) => value + 1); }, result === 'correct' ? 1400 : 3200);
  const reminder = round ? <div className="recall-content arcade-reminder"><p className="eyebrow">RECUERDA LA PIEZA</p><SceneVisual word={round.unit.words[0]} compact /><h1><GrammarText text={round.slot.en} form={round.form} /></h1><p>{round.slot.es}</p><p className="arcade-reminder-story">{round.slot.note ?? round.form.memoryTrick?.explanation ?? `Relaciona «${round.slot.es}» con «${round.slot.en}».`}</p><p lang="en"><GrammarText text={round.sentence.en} form={round.form} /></p><small>Siguiente…</small></div> : undefined;
  return <div className="arcade-grammar-shell"><div className="arcade-stream-tools"><button type="button" className="quiet-action" onClick={() => { stopSpeech(); clock.togglePause(); }}>{clock.paused ? 'Seguir' : 'Pausar'}</button><button type="button" className="quiet-action" onClick={onWords}>Asociaciones</button></div><GameCard className={`arcade-stream-card arcade-grammar-card ${result === 'correct' ? 'recall-correct' : 'recall-calm'}`} showBack={!clock.checkpoint && result === 'rescue'} back={reminder}>
    {clock.checkpoint ? <ArcadeCheckpoint onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, un truco.</h1><button type="button" onClick={onWords}>Volver a las asociaciones</button></div> : <div className="recall-content"><p className="eyebrow">GRAMÁTICA · {index % 15 + 1}/15 <span>COMBO x{Math.max(1, combo)}</span></p><ArcadeClock remaining={clock.remaining} paused={clock.paused} revealed={result !== null} onPause={clock.togglePause} /><SceneVisual word={round.unit.words[0]} compact /><h1><GrammarText text={round.sentence.es} form={round.form} language="es" /></h1><p className="arcade-grammar-prompt" lang="en">{round.sentence.slots.map((slot, slotIndex) => <span key={slotIndex}>{slotIndex === round.slotIndex ? <b className="grammar-gap">?</b> : <GrammarText text={slot.en} form={round.form} />}{' '}</span>)}</p><div className="recall-choices arcade-grammar-options">{(index % 2 ? [...round.slot.choices].reverse() : round.slot.choices).map((choice) => <button type="button" key={choice} disabled={result !== null || clock.paused} className={selected === choice && result === 'correct' ? 'is-correct' : ''} onClick={() => answer(choice)}>{choice}</button>)}</div></div>}
  </GameCard></div>;
}
