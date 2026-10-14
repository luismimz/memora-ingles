import { useEffect, useRef, useState } from 'react';
import { microRounds, type MicroRound } from '../domain/microArcade';
import { commitMicroAttempt, commitMicroTimeout } from '../domain/microArcadeProgress';
import { recordLearningActivity } from '../domain/learningActivity';
import type { AtomicUnit } from '../domain/unit';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { ArcadeWordReminder } from './ArcadeWordReminder';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import './microArcade.css';
import { useArcadeClock } from './useArcadeClock';
import { ArcadeClock, ArcadeCheckpoint } from './ArcadeClock';

/** Una ronda optativa de asociación; reconocer entre opciones no cuenta como recuerdo autónomo. */
export function MicroArcade({ userId, units, inspection, onExit, onUse, onOnlyWords, onMix, onGrammar }: { userId: string; units: AtomicUnit[]; inspection: boolean; onExit: () => void; onUse?: () => void; onOnlyWords?: () => void; onMix?: () => void; onGrammar?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [candidates] = useState(() => inspection
    ? units.flatMap((unit) => unit.words.map((word) => ({ unit, word, phrase: { en: unit.sentence.en, es: unit.sentence.es, key: '' }, options: [] as string[], due: false })))
    : microRounds(userId, units));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [usedHint, setUsedHint] = useState(inspection);
  const [feedback, setFeedback] = useState('');
  const [combo, setCombo] = useState(0);
  const [chosen, setChosen] = useState('');
  const answered = useRef(false);
  const [result, setResult] = useState<'correct' | 'rescue' | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [choiceSeed] = useState(() => Math.floor(Math.random() * 100000));
  const previous = useRef<string>();
  const round: MicroRound | undefined = candidates[index % candidates.length];
  const knownOptions = [...new Set(candidates.map((candidate) => candidate.word.en))];
  const baseOptions = round ? [...new Set([round.word.en, ...knownOptions.filter((value) => value !== round.word.en)])].slice(0, 3) : [];
  const offset = (choiceSeed + index * 7) % Math.max(1, baseOptions.length);
  const options = [...baseOptions.slice(offset), ...baseOptions.slice(0, offset)];
  useEffect(() => { dialog.current?.showModal(); return () => { dialog.current?.close(); stopSpeech(); }; }, []);
  const clock = useArcadeClock(index, revealed, Boolean(round), () => {
    if (!round || answered.current) return;
    answered.current = true;
    if (!inspection) commitMicroTimeout(userId, round, crypto.randomUUID(), `${sessionId}:${index}`);
    setRevealed(true); setUsedHint(true); setResult('rescue'); setCombo(0); setFeedback('Recupera el puente.');
    void playEnglish(round.word.en, round.word.audioUrl);
  }, () => { if (onUse && (index + 1) % 4 === 0) onUse(); else another(); }, result === 'correct' ? 1000 : 3200);

  function remember() {
    if (!round || revealed || answered.current || clock.paused) return;
    answered.current = true;
    setUsedHint(true);
    setRevealed(true);
    setResult('rescue');
    setFeedback('Recupera tu puente y escucha la palabra.');
    if (!inspection) recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:${index}:mnemonic`, skill: round.word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: round.word.es, response: round.word.scene, expected: round.word.en, correct: null, helped: true });
    void playEnglish(round.word.en, round.word.audioUrl);
  }

  function choose(choice: string) {
    if (!round || revealed || answered.current || clock.paused) return;
    answered.current = true;
    setChosen(choice);
    const correct = choice === round.word.en;
    if (!inspection) previous.current = commitMicroAttempt(userId, round, 'word', choice, correct, usedHint, true, crypto.randomUUID(), `${sessionId}:${index}`, previous.current).id;
    if (!correct) {
      setFeedback('Vuelve a la historia y prueba otra vez.');
      setUsedHint(true); setCombo(0);
      setRevealed(true); setResult('rescue');
      void playEnglish(round.word.en, round.word.audioUrl);
      return;
    }
    setRevealed(true);
    setResult('correct'); setCombo((value) => value + 1);
    setFeedback(usedHint ? 'Reconocida con ayuda.' : '¡La reconociste!');
    playSnap();
    void playEnglish(round.word.en, round.word.audioUrl);
  }

  function another() {
    answered.current = false; setResult(null);
    setIndex((value) => value + 1); setChosen('');
    setRevealed(false);
    setUsedHint(inspection);
    setFeedback('');
    previous.current = undefined;
  }

  const reminder = round ? <ArcadeWordReminder word={round.word} paused={clock.paused} /> : undefined;
  return <dialog ref={dialog} className="micro-dialog" aria-label="Arcade de asociaciones" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen micro-screen arcade-stream-screen"><header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Salir</button><span>MEMORA ARCADE</span><div className="arcade-stream-tools"><button type="button" className="quiet-action" aria-pressed={clock.paused} onClick={() => { stopSpeech(); clock.togglePause(); }}>{clock.paused ? 'Seguir' : 'Pausar'}</button>{onGrammar ? <button type="button" className="quiet-action" onClick={onGrammar}>Gramática</button> : null}{onOnlyWords ? <button type="button" className="quiet-action" onClick={onOnlyWords}>Solo palabras</button> : onMix ? <button type="button" className="quiet-action" onClick={onMix}>Mixto</button> : null}</div></header>
    <section className="game-stage"><GameCard className={`arcade-stream-card ${result === 'correct' ? 'recall-correct' : 'recall-calm'}`} showBack={!clock.checkpoint && result === 'rescue'} back={reminder}>
    {clock.checkpoint ? <ArcadeCheckpoint onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, una asociación.</h1><button type="button" className="primary-action" onClick={onExit}>Aprender palabras →</button></div> : <div className="recall-content"><p className="eyebrow">RECUERDA · {index % 15 + 1}/15 <span className={combo >= 3 ? 'combo-hot' : ''}>COMBO x{Math.max(1, combo)}</span></p><ArcadeClock remaining={clock.remaining} paused={clock.paused} revealed={revealed} onPause={clock.togglePause} /><SceneVisual word={round.word} hideAnswer /><h1>¿Cómo se dice <em>{round.word.es}</em>?</h1><div className="recall-choices" aria-label={inspection ? 'Palabras de prueba' : 'Palabras aprendidas'}>{options.map((choice) => <button type="button" disabled={revealed || clock.paused} className={chosen === choice && result === 'correct' ? 'is-correct' : ''} key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div><div className="arcade-stream-foot"><button type="button" className="quiet-action" disabled={revealed || clock.paused} onClick={remember}>Recordar el puente</button>{inspection ? <small>Prueba · no guarda</small> : null}<span className="sr-only" role="status">{feedback}</span></div></div>}
    </GameCard></section></div></dialog>;
}
