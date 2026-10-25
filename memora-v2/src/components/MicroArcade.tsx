import { AnswerStudio } from './AnswerStudio';
import { useEffect, useRef, useState } from 'react';
import { microRounds, type MicroRound } from '../domain/microArcade';
import { commitMicroAttempt } from '../domain/microArcadeProgress';
import { recordLearningActivity } from '../domain/learningActivity';
import type { AtomicUnit } from '../domain/unit';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import { ArcadeWordReminder } from './ArcadeWordReminder';
import { playEnglish, playSnap, stopSpeech, prefetchSpeech, type PlaybackResult } from '../services/audio';
import './microArcade.css';
import './playFlow.css';
import { useArcadeClock } from './useArcadeClock';
import { ArcadeCheckpoint } from './ArcadeClock';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { arcadeSessionLength } from '../domain/arcadeSession';
import { useDisclosureDismissal } from './useDisclosureDismissal';

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
  const [feedback, setFeedback] = useState('');
  const [input, setInput] = useState('');
  const [showChoices, setShowChoices] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | PlaybackResult['status']>('idle');
  const audioRequest = useRef(0);
  const auditoryMode = useRef(false);
  const writing = index % 3 === 2 && !showChoices;
  const answered = useRef(false);
  const [result, setResult] = useState<'correct' | 'rescue' | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [choiceSeed] = useState(() => Math.floor(Math.random() * 100000));
  const previous = useRef<string>();
  const round: MicroRound | undefined = candidates[index % candidates.length];
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
  const clock = useArcadeClock(index, revealed, Boolean(round), () => {}, () => {
    if (automatic && index - startRound + 1 >= limit) { onExit(); return; }
    if (onUse && (index + 1) % 4 === 0) onUse(); else another();
  }, 0, 0, 15, true, true);

  function remember() {
    if (!round || revealed || answered.current || clock.paused) return;
    answered.current = true;
    usedHintRef.current = true; setUsedHint(true);
    setRevealed(true);
    setResult('rescue');
    setFeedback('Recupera tu puente y escucha la palabra.');
    if (!inspection) recordLearningActivity(userId, { unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:${index}:mnemonic`, skill: round.word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: round.word.es, response: round.word.scene, expected: round.word.en, correct: null, helped: true });
    void playEnglish(round.word.en, round.word.audioUrl);
  }

  async function listen(replayResult = false) {
    if (!round || clock.paused || (revealed || answered.current) && !replayResult) return;
    const request = ++audioRequest.current;
    setAudioStatus('loading');
    const result = await Promise.resolve(playEnglish(round.word.en, round.word.audioUrl, true, () => {
      if (request === audioRequest.current) setAudioStatus('playing');
    })).catch(() => ({ status: 'unavailable' as const, source: null }));
    if (request === audioRequest.current && (replayResult || !answered.current)) setAudioStatus(result?.status ?? 'unavailable');
  }

  function choose(choice: string, meaning?: string) {
    if (!round || revealed || answered.current || clock.paused || listening && (audioStatus !== 'played' || !auditoryMode.current)) return;
    answered.current = true;
    audioRequest.current++;
    const correct = normalizeSentenceAnswer(choice) === normalizeSentenceAnswer(round.word.en);
    if (!inspection) previous.current = commitMicroAttempt(userId, round, 'word', choice, correct, usedHintRef.current, !writing, crypto.randomUUID(), `${sessionId}:${index}`, previous.current, listening ? meaning : undefined).id;
    if (!correct) {
      setFeedback('Vuelve a la historia y prueba otra vez.');
      usedHintRef.current = true; setUsedHint(true);
      setRevealed(true); setResult('rescue');
      void playEnglish(round.word.en, round.word.audioUrl);
      return;
    }
    setRevealed(true);
    setResult('correct');
    setFeedback(usedHintRef.current ? 'Con ayuda.' : 'Bien.');
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
    setIndex((value) => value + 1);
    setInput(''); setShowChoices(false);
    setRevealed(false);
    usedHintRef.current = inspection; setUsedHint(inspection);
    setFeedback('');
    previous.current = undefined;
    onRoundAdvance?.(index + 1);
  }
  function togglePause() {
    audioRequest.current++;
    if (listening && !revealed) setAudioStatus('idle');
    else if (audioStatus === 'loading' || audioStatus === 'playing') setAudioStatus('cancelled');
    stopSpeech(); clock.togglePause();
  }

  const reminder = round ? <div className="arcade-rescue"><ArcadeWordReminder word={round.word} paused={clock.paused} manual vertical /></div> : undefined;
  const canContinue = Boolean(round && result && !clock.checkpoint && !clock.paused);
  const nextLabel = result === 'rescue' ? 'Seguir con ayuda' : automatic && index - startRound + 1 >= limit ? 'Terminar el repaso' : 'Siguiente reto';
  return <dialog ref={dialog} className="micro-dialog" aria-label="Arcade de asociaciones" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen play-flow micro-screen arcade-stream-screen">
    <header className="game-topbar">
      <button type="button" className="activity-back" onClick={onExit}>← Salir</button><span>Repaso</span>
      <div className="arcade-stream-tools">
        <button type="button" className="quiet-action" aria-pressed={clock.paused} onClick={togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button>
        <details className="play-options" onKeyDown={optionsMenu.onKeyDown}>
          <summary ref={optionsMenu.trigger} aria-label="Opciones del repaso">•••</summary>
          <div className="play-options-panel">
            <small>Sin reloj. Responde y desliza hacia arriba para seguir.</small>
            {onGrammar ? <button type="button" className="quiet-action" onClick={onGrammar}>Gramática</button> : null}
            {onOnlyWords ? <button type="button" className="quiet-action" onClick={onOnlyWords}>Solo palabras</button> : onMix ? <button type="button" className="quiet-action" onClick={onMix}>Mixto</button> : null}
          </div>
        </details>
      </div>
    </header>
    <section className="game-stage"><GameCard vertical stepKey={`${index}:${result ?? 'question'}:${clock.checkpoint}`} onAdvance={clock.checkpoint ? onExit : canContinue ? clock.advanceNow : undefined} advanceLabel={clock.checkpoint ? 'Volver al recorrido' : nextLabel} className={`arcade-stream-card ${result === 'correct' ? 'recall-correct' : 'recall-calm'}`}>
    {clock.checkpoint ? <ArcadeCheckpoint inFeed onContinue={clock.continuePlaying} onExit={onExit} /> : !round ? <div className="micro-content"><h1>Primero, una asociación.</h1><button type="button" className="primary-action" onClick={onExit}>Aprender palabras →</button></div> : result === 'correct' ? <div className="micro-content micro-answer-result">
      <p className="arcade-result-status" role="status"><span aria-hidden="true">✓</span> {usedHint ? 'Acertaste con ayuda' : 'Acertaste'}</p><h1 lang="en">{round.word.en}</h1><p lang="es">{round.word.es}</p>
      <button type="button" className="quiet-action" disabled={clock.paused || audioStatus === 'loading' || audioStatus === 'playing'} onClick={() => void listen(true)}>🔊 Escuchar de nuevo</button>
      {audioStatus === 'loading' || audioStatus === 'playing' ? <p role="status">{audioStatus === 'loading' ? 'Preparando sonido…' : 'Reproduciendo…'}</p> : ['blocked', 'unavailable', 'cancelled'].includes(audioStatus) ? <p role="status">No se completó el audio. Puedes continuar con la palabra escrita.</p> : null}
      {clock.paused ? <p role="status">En pausa.</p> : null}
    </div> : result === 'rescue' ? reminder : <div className="recall-content">
      <p className="eyebrow">{listening ? 'ESCUCHA Y CONECTA' : writing ? 'SIN OPCIONES' : 'RECUERDA'} · {automatic ? index - startRound + 1 : index % 15 + 1}/{automatic ? limit : 15}</p>
      {round?.pendingModel ? <p role="status">Primero la practicamos sin reloj · sin prisas</p> : null}
      {!writing && !listening ? <SceneVisual word={round.word} hideAnswer /> : null}{!writing ? <h1>{listening ? 'Escucha y elige lo que significa.' : <>¿Cómo se dice <em>{round.word.es}</em>?</>}</h1> : null}
      {listening ? <><button type="button" className="primary-action" disabled={revealed || clock.paused || (audioStatus === 'loading' || audioStatus === 'playing')} onClick={() => void listen()}>🔊 Reproducir palabra inglesa</button><p role="status">{audioStatus === 'played' ? 'Reproducción finalizada. Elige el significado.' : audioStatus === 'playing' ? 'Escucha la palabra…' : audioStatus === 'loading' ? 'Preparando el audio. No hay cuenta atrás.' : audioStatus === 'idle' ? 'Primero escucha, después conecta con un significado.' : 'No se completó el audio. Puedes repetirlo o practicar con texto.'}</p><div className="recall-choices" aria-label="Significados preparados">{listeningOptions.map((candidate) => <button type="button" lang="es" disabled={revealed || clock.paused || audioStatus !== 'played'} key={candidate.word.en} onClick={() => choose(candidate.word.en, candidate.word.es)}>{candidate.word.es}</button>)}</div><button type="button" className="quiet-action" disabled={revealed || clock.paused} onClick={useTextOptions}>No se oye · usar texto</button></> : writing ? <><AnswerStudio id="arcade-word-answer" taskKey={`${sessionId}:${index}`} target={round.word.es} value={input} onChange={setInput} onAnswer={(value) => choose(value)} accepts={(value) => normalizeSentenceAnswer(value) === normalizeSentenceAnswer(round.word.en)} disabled={revealed || clock.paused} /><button type="button" className="quiet-action" disabled={revealed || clock.paused} onClick={useTextOptions}>Ayúdame con opciones</button></> : <div className="recall-choices" aria-label={inspection ? 'Palabras de prueba' : 'Palabras aprendidas'}>{options.map((choice) => <button type="button" disabled={revealed || clock.paused} key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div>}
      <div className="arcade-stream-foot"><button type="button" className="quiet-action" disabled={revealed || clock.paused} onClick={remember}>Recordar el puente</button>{inspection ? <small>Prueba · no guarda</small> : null}<span role="status">{feedback}</span></div>
    </div>}
    </GameCard></section></div></dialog>;
}
