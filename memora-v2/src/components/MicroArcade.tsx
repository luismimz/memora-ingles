import { AnswerStudio } from './AnswerStudio';
import { useEffect, useRef, useState } from 'react';
import { arcadePairs, microRounds, type MicroRound } from '../domain/microArcade';
import { ArcadePairs } from './ArcadePairs';
import { ArcadeTrail } from './ArcadeTrail';
import { commitMicroAttempt, commitMicroTimeout } from '../domain/microArcadeProgress';
import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';
import { recordLearningActivity } from '../domain/learningActivity';
import type { AtomicUnit } from '../domain/unit';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { ArcadeWordReminder } from './ArcadeWordReminder';
import { playEnglish, playSnap, stopSpeech, prefetchSpeech, type PlaybackResult } from '../services/audio';
import './microArcade.css';
import './playFlow.css';
import { useArcadeClock } from './useArcadeClock';
import { ArcadeClock, ArcadeCheckpoint } from './ArcadeClock';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { arcadeSessionLength } from '../domain/arcadeSession';
import { useDisclosureDismissal } from './useDisclosureDismissal';
import { isAssociationRejected } from '../domain/associationPreference';

/** Una ronda optativa de asociación; reconocer entre opciones no cuenta como recuerdo autónomo. */
export function MicroArcade({ userId, units, inspection, onExit, onUse, onOnlyWords, onMix, onGrammar, initialRound = 0, onRoundAdvance, automatic = false }: { userId: string; units: AtomicUnit[]; inspection: boolean; onExit: () => void; onUse?: () => void; onOnlyWords?: () => void; onMix?: () => void; onGrammar?: () => void; initialRound?: number; onRoundAdvance?: (completed: number) => void; automatic?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const optionsMenu = useDisclosureDismissal();
  const [candidates] = useState(() => inspection
    ? units.flatMap((unit) => unit.words.map((word) => ({ unit, word, phrase: { en: unit.sentence.en, es: unit.sentence.es, key: '' }, options: [] as string[], due: false })))
    : microRounds(userId, units));
  const [index, setIndex] = useState(initialRound);
  const startRound = useRef(initialRound).current;
  const [revealed, setRevealed] = useState(false);
  const [usedHint, setUsedHint] = useState(inspection);
  const usedHintRef = useRef(usedHint);
  const [input, setInput] = useState('');
  const [showChoices, setShowChoices] = useState(false);
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | PlaybackResult['status']>('idle');
  const audioRequest = useRef(0);
  const auditoryMode = useRef(false);
  const writing = index % 3 === 2 && !showChoices;
  const answered = useRef(false);
  const [result, setResult] = useState<'correct' | 'rescue' | 'paired' | 'paired-model' | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [choiceSeed] = useState(() => Math.floor(Math.random() * 100000));
  const previous = useRef<string>();
  const round: MicroRound | undefined = candidates[index % candidates.length];
  const pairs = index % 3 === 0 && !showChoices && !round?.pendingModel ? arcadePairs(candidates, index) : [];
  const paired = useRef(new Set<string>());
  const pairAssistance = useRef(false);
  const meanings = new Map<string, MicroRound>();
  const sound = (word: MicroRound['word']) => word.ipa?.replace(/[\/\[\]\sˈˌ]/gu, '').toLocaleLowerCase('en');
  const targetSound = round && sound(round.word);
  if (round) meanings.set(normalizeSentenceAnswer(round.word.es), round);
  for (const candidate of candidates) {
    const meaning = normalizeSentenceAnswer(candidate.word.es);
    if (meaning && sound(candidate.word) && sound(candidate.word) !== targetSound && !meanings.has(meaning) && candidate.word.en !== round?.word.en) meanings.set(meaning, candidate);
  }
  const auditoryRound = index % 3 === 1 && Boolean(targetSound) && meanings.size >= 2;
  const listening = auditoryRound && !showChoices;
  auditoryMode.current = listening;
  const listeningBase = [...meanings.values()].slice(0, 3);
  const listeningOffset = (choiceSeed + index * 7) % Math.max(1, listeningBase.length);
  const listeningOptions = [...listeningBase.slice(listeningOffset), ...listeningBase.slice(0, listeningOffset)];
  const limit = arcadeSessionLength(candidates.length, automatic);
  const knownOptions = [...new Set(candidates.map((candidate) => candidate.word.en))];
  const baseOptions = round ? [...new Set([round.word.en, ...knownOptions.filter((value) => value !== round.word.en)])].slice(0, 3) : [];
  const offset = (choiceSeed + index * 7) % Math.max(1, baseOptions.length);
  const options = [...baseOptions.slice(offset), ...baseOptions.slice(0, offset)];
  useEffect(() => { dialog.current?.showModal(); return () => { audioRequest.current++; dialog.current?.close(); stopSpeech(); }; }, []);
  useEffect(() => { if (listening && round) prefetchSpeech(round.word.en, round.word.audioUrl); }, [index, listening]);
  // Only prepared single-choice retrieval is timed. New models, matching,
  // typing, help and the audio channel are not races.
  const timed = Boolean(round && !round.pendingModel && !inspection && !calm && !pairs.length && !writing && !usedHint && options.length >= 2);
  const waitingForAudio = listening && audioStatus !== 'played';
  const clock = useArcadeClock(index, revealed, Boolean(round), () => {
    if (!timed || waitingForAudio || answered.current) return;
    if (!inspection) commitMicroTimeout(userId, round!, crypto.randomUUID(), `${sessionId}:${index}`);
    remember();
  }, () => {
    if (automatic && index - startRound + 1 >= limit) { onExit(); return; }
    if (onUse && (index + 1) % 4 === 0) onUse(); else another();
  }, 0, 10000, 15, !timed || waitingForAudio, true);

  function remember() {
    if (!round || revealed || answered.current || clock.paused) return;
    answered.current = true;
    usedHintRef.current = true; setUsedHint(true);
    setRevealed(true);
    setResult('rescue');
    if (!inspection) recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:${index}:mnemonic`, skill: round.word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: round.word.es, response: isAssociationRejected(userId, round.word) ? `${round.word.en}: ${round.word.es}` : round.word.scene, expected: round.word.en, correct: null, helped: true });
    void playEnglish(round.word.en, round.word.audioUrl);
  }

  async function listen(replayResult = false) {
    if (!round || clock.paused || (revealed || answered.current) && !replayResult) return;
    const request = ++audioRequest.current;
    setAudioStatus('loading');
    const result = await Promise.resolve(playEnglish(round.word.en, round.word.audioUrl, true, () => {
      if (request === audioRequest.current) setAudioStatus('playing');
    })).catch(() => ({ status: 'unavailable' as const, source: null }));
    if (request === audioRequest.current && (replayResult || !answered.current)) {
      setAudioStatus(result?.status === 'cancelled' ? 'idle' : result?.status ?? 'unavailable');
      // An unavailable channel changes the presentation, never traps the learner
      // behind disabled auditory options or pretends they heard the word.
      if (!replayResult && auditoryMode.current && ['blocked', 'unavailable'].includes(result?.status ?? 'unavailable')) useTextOptions();
    }
  }

  function choose(choice: string, meaning?: string) {
    if (!round || revealed || answered.current || clock.paused || listening && (audioStatus !== 'played' || !auditoryMode.current)) return;
    answered.current = true;
    audioRequest.current++;
    const correct = normalizeSentenceAnswer(choice) === normalizeSentenceAnswer(round.word.en);
    if (!inspection) previous.current = commitMicroAttempt(userId, round, 'word', choice, correct, usedHintRef.current, !writing, crypto.randomUUID(), `${sessionId}:${index}`, previous.current, listening ? meaning : undefined).id;
    if (!correct) {
      usedHintRef.current = true; setUsedHint(true);
      setRevealed(true); setResult('rescue');
      void playEnglish(round.word.en, round.word.audioUrl);
      return;
    }
    setRevealed(true);
    setResult('correct');
    playSnap();
  }

  function useTextOptions() {
    audioRequest.current++; auditoryMode.current = false; usedHintRef.current = true;
    stopSpeech(); setUsedHint(true); setShowChoices(true);
  }
  function another() {
    stopSpeech();
    audioRequest.current++; setAudioStatus('idle');
    answered.current = false; setResult(null);
    paired.current.clear();
    pairAssistance.current = false;
    setIndex((value) => value + 1);
    setInput(''); setShowChoices(false);
    setRevealed(false);
    usedHintRef.current = inspection; setUsedHint(inspection);
    previous.current = undefined;
    onRoundAdvance?.(index + 1);
  }
  function togglePause() {
    audioRequest.current++;
    if (listening && !revealed) setAudioStatus('idle');
    else if (audioStatus === 'loading' || audioStatus === 'playing') setAudioStatus('cancelled');
    stopSpeech(); clock.togglePause();
  }

  const reminder = round ? <div className="arcade-rescue"><ArcadeWordReminder userId={userId} word={round.word} paused={clock.paused} manual vertical /></div> : undefined;
  const canContinue = Boolean(round && result && !clock.checkpoint && !clock.paused);
  const nextLabel = result === 'rescue' ? 'Seguir con ayuda' : automatic && index - startRound + 1 >= limit ? 'Seguir la aventura' : 'Siguiente reto';
  return <dialog ref={dialog} className="micro-dialog" aria-label="Arcade de asociaciones" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen play-flow micro-screen arcade-stream-screen">
    <header className="game-topbar play-header arcade-header">
      <button type="button" className="activity-back" onClick={onExit}>← Volver</button><span className="play-intention">Arcade</span>
      <div className="arcade-stream-tools">
        <button type="button" className="quiet-action" aria-pressed={clock.paused} onClick={togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button>
        <details className="play-options" onKeyDown={optionsMenu.onKeyDown}>
          <summary ref={optionsMenu.trigger} aria-label="Opciones del repaso">•••</summary>
          <div className="play-options-panel">
            <button type="button" className="quiet-action" aria-label="Jugar sin cuenta atrás" aria-pressed={calm} onClick={() => { const next = !calm; writeArcadeCalm(userId, next); setCalm(next); }}>{calm ? 'Sin reloj ✓' : 'Sin reloj'}</button>
            {onGrammar ? <button type="button" className="quiet-action" onClick={onGrammar}>Gramática</button> : null}
            {onOnlyWords ? <button type="button" className="quiet-action" onClick={onOnlyWords}>Solo palabras</button> : onMix ? <button type="button" className="quiet-action" onClick={onMix}>Mixto</button> : null}
          </div>
        </details>
      </div>
    </header>
    {round ? <ArcadeTrail current={pairs.length ? 0 : listening ? 1 : writing ? 2 : 0} /> : null}
    <section className="game-stage"><GameCard feedback={result === 'correct' || result === 'paired' ? 'correct' : result === 'rescue' || result === 'paired-model' ? 'model' : undefined} vertical stepKey={`${index}:${result === 'rescue' ? 'rescue' : 'challenge'}:${clock.checkpoint}`} onAdvance={clock.checkpoint ? onExit : canContinue ? clock.advanceNow : undefined} advanceLabel={clock.checkpoint ? 'Volver al recorrido' : nextLabel} className="arcade-stream-card recall-calm">
    {clock.checkpoint ? <ArcadeCheckpoint inFeed onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, una asociación.</h1><button type="button" className="primary-action" onClick={onExit}>Aprender palabras →</button></div> : pairs.length ? <ArcadePairs key={index} rounds={pairs} seed={choiceSeed + index} paused={clock.paused} onPair={(target, answer, correct) => {
      const key = target.word.en;
      if (paired.current.has(key) || clock.paused) return;
      paired.current.add(key);
      if (!correct) pairAssistance.current = true;
      if (!inspection) commitMicroAttempt(userId, target, 'word', answer.word.en, correct, true, true, crypto.randomUUID(), `${sessionId}:${index}:pair:${key}`, undefined, undefined, { selectedMeaning: answer.word.es });
      if (correct) playSnap();
    }} onModel={(target) => {
      const key = target.word.en;
      if (paired.current.has(key) || clock.paused) return;
      paired.current.add(key);
      pairAssistance.current = true;
      if (!inspection) recordLearningActivity(userId, { unitId: target.unit.id, unitTitle: target.unit.title, contentVersion: target.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:${index}:pair-model:${key}`, skill: key, phase: 'arcade', source: 'authored', modality: 'choice', prompt: target.word.es, response: key, expected: key, correct: null, helped: true });
    }} onComplete={() => { answered.current = true; setRevealed(true); setResult(pairAssistance.current ? 'paired-model' : 'paired'); }} /> : result === 'rescue' ? reminder : <div className="recall-content arcade-challenge">
      <p className="eyebrow">{listening ? 'ESCUCHA Y CONECTA' : writing ? 'SIN OPCIONES' : 'RECUERDA'} · {automatic ? index - startRound + 1 : index % 15 + 1}/{automatic ? limit : 15}</p>
      {timed && !waitingForAudio ? <ArcadeClock remaining={clock.remaining} durationMs={10000} paused={clock.paused} revealed={revealed} /> : null}
      {round?.pendingModel ? <p role="status">Primero la practicamos sin reloj · sin prisas</p> : null}
      {!writing && !listening && !isAssociationRejected(userId, round.word) ? <SceneVisual word={round.word} hideAnswer /> : null}{!writing ? <h1>{result === 'correct' ? 'Conexión correcta' : listening ? 'Escucha y elige lo que significa.' : <>¿Cómo se dice <em>{round.word.es}</em>?</>}</h1> : null}
      {listening ? <>
        <button type="button" className="primary-action" disabled={clock.paused} aria-busy={audioStatus === 'loading'} onClick={() => void listen(result === 'correct')}>{result === 'correct' ? '🔊 Escuchar de nuevo' : '🔊 Reproducir palabra inglesa'}</button>
        <p className="arcade-audio-cue" role="status">{audioStatus === 'playing' ? 'Escucha la palabra…' : audioStatus === 'loading' ? 'Preparando el audio. No hay cuenta atrás.' : ['blocked', 'unavailable'].includes(audioStatus) ? result === 'correct' ? 'No se completó el audio. Puedes continuar con la palabra escrita.' : 'No se completó el audio. Puedes repetirlo o practicar con texto.' : result === 'correct' ? '' : audioStatus === 'played' ? 'Reproducción finalizada. Elige el significado.' : 'Primero escucha, después conecta con un significado.'}</p>
        <div className="recall-choices" aria-label="Significados preparados">{listeningOptions.map((candidate) => <button type="button" lang="es" className={result === 'correct' && candidate.word.en === round.word.en ? 'is-correct' : undefined} disabled={revealed || clock.paused || audioStatus !== 'played'} key={candidate.word.en} onClick={() => choose(candidate.word.en, candidate.word.es)}>{candidate.word.es}</button>)}</div>
        <button type="button" className="quiet-action arcade-challenge-help" style={revealed ? { visibility: 'hidden' } : undefined} disabled={revealed || clock.paused} onClick={useTextOptions}>No se oye · usar texto</button>
      </> : writing ? <>
        <AnswerStudio id="arcade-word-answer" taskKey={`${sessionId}:${index}`} instruction={result === 'correct' ? 'Tu respuesta' : 'Escribe en inglés'} target={round.word.es} value={input} onChange={setInput} onAnswer={(value) => choose(value)} accepts={(value) => normalizeSentenceAnswer(value) === normalizeSentenceAnswer(round.word.en)} disabled={revealed || clock.paused} />
        <button type="button" className="quiet-action arcade-challenge-help" style={revealed ? { visibility: 'hidden' } : undefined} disabled={revealed || clock.paused} onClick={useTextOptions}>Ayúdame con opciones</button>
      </> : <div className="recall-choices" aria-label={inspection ? 'Palabras de prueba' : 'Palabras aprendidas'}>{options.map((choice) => <button type="button" className={result === 'correct' && choice === round.word.en ? 'is-correct' : undefined} disabled={revealed || clock.paused} key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div>}
      <div className="arcade-feedback-slot" role="status">{result === 'correct' ? <><p className="arcade-result-status"><span aria-hidden="true">✓</span> {usedHint ? 'Acertaste con ayuda' : 'Acertaste'}</p><p><b lang="en">{round.word.en}</b><span aria-hidden="true"> · </span><span lang="es">{round.word.es}</span></p></> : null}{clock.paused ? <p>En pausa.</p> : null}</div>
      <div className="arcade-stream-foot">
        {result === 'correct' && !listening ? <button type="button" className="quiet-action" disabled={clock.paused} aria-busy={audioStatus === 'loading'} onClick={() => void listen(true)}>🔊 Escuchar de nuevo</button> : <button type="button" className="quiet-action" style={revealed ? { visibility: 'hidden' } : undefined} disabled={revealed || clock.paused} onClick={remember}>{isAssociationRejected(userId, round.word) ? 'Ver palabra' : 'Recordar el puente'}</button>}
        {inspection ? <small>Prueba · no guarda</small> : null}
        {!listening && (audioStatus === 'loading' || audioStatus === 'playing' || ['blocked', 'unavailable'].includes(audioStatus)) ? <span role="status">{audioStatus === 'loading' ? 'Preparando sonido…' : audioStatus === 'playing' ? 'Reproduciendo…' : 'No se completó el audio. Puedes continuar con la palabra escrita.'}</span> : null}
      </div>
    </div>}
    </GameCard></section></div></dialog>;
}
