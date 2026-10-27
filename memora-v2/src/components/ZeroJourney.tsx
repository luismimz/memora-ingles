import { useEffect, useRef, useState } from 'react';
import { zeroJourney, zeroSteps, zeroWords, zeroMessages, zeroCoffeePieces, zeroAccepts, freshZeroJourney, resumeZeroJourney } from '../domain/zeroJourney';
import { readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint } from '../domain/trickCheckpoint';
import { contextualCorrection, recordLearningActivity, readLearningActivities } from '../domain/learningActivity';
import { recordSentenceExposure, recordSentenceRecall, recordWordRecall, sentenceKey } from '../domain/memory';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { GrammarOrder } from './GrammarOrder';
import { AnswerStudio } from './AnswerStudio';
import { SpeechModelButton } from './SpeechModelButton';
import { ArcadeClock } from './ArcadeClock';
import { useArcadeClock } from './useArcadeClock';
import { ZeroJourneyScene } from './ZeroJourneyScene';
import './zeroJourney.css';

/** New presentation/sequence, using the existing journal, checkpoint, SRS and controls. */
export function ZeroJourney({ userId, inspection = false, onExit, onNext }: { userId: string; inspection?: boolean; onExit: () => void; onNext: () => void }) {
  const [state, setState] = useState(() => !inspection && resumeZeroJourney(readTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version)) || freshZeroJourney());
  const live = useRef(state); live.current = state;
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const handedOff = useRef(false);
  const step = zeroSteps[state.stage];
  const revealed = state.input === 'revealed';
  const discovery = ['water', 'coffee', 'cold'].includes(step);
  const teaching = discovery || step === 'want' || step === 'be';
  const writing = step === 'write-cold' || step === 'write-coffee';
  const solved = state.feedback === 'correct';
  const model = (state.checkFailures ?? 0) >= 2;
  const ready = teaching ? revealed : solved || model;
  const coldScene = ['cold', 'be', 'contrast', 'write-cold'].includes(step);
  const expected = step === 'build-coffee' || step === 'write-coffee' ? zeroMessages.coffee.en : step === 'contrast' ? 'AM' : step === 'arcade-water' ? 'WATER' : zeroMessages.cold.en;
  const modelMessage = step === 'contrast' ? zeroMessages.cold.en : expected;
  const target = step === 'build-coffee' || step === 'write-coffee' ? zeroMessages.coffee.es : step === 'arcade-water' ? zeroMessages.water.en : zeroMessages.cold.es;
  const clock = useArcadeClock(state.stage, solved || model, step === 'arcade-water', () => { if (live.current.checkId === 'arcade-water') showModel('Tiempo terminado; queda pendiente.'); }, () => {}, 0, 10000, 0, calm, true);

  function save(patch: Partial<TrickCheckpoint>) {
    const next = { ...live.current, ...patch }; live.current = next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, next);
  }
  function record(value: Partial<Parameters<typeof recordLearningActivity>[1]>) {
    if (inspection) return undefined;
    return recordLearningActivity(userId, { unitId: zeroJourney.id, unitTitle: zeroJourney.title, contentVersion: zeroJourney.version,
      activityId: `zero:${state.episodeId}:${step}`, skill: coldScene ? 'zero:be-cold-v1' : 'zero:want-drink-v1', phase: writing ? 'dialogue' : step === 'arcade-water' ? 'arcade' : 'grammar',
      source: 'learner', modality: writing ? 'writing' : 'choice', prompt: target, response: '', expected, correct: null, helped: !writing || state.helped,
      ...value });
  }
  function advance() {
    const current = live.current;
    if (current.stage !== state.stage || !ready || clock.paused || step === 'handoff') return;
    stopSpeech();
    const next = current.stage + 1;
    save({ stage: next, checkId: zeroSteps[next], input: '', order: [], feedback: 'idle', helped: false, checkFailures: 0, previousAttemptId: undefined, correctionResponse: undefined, promptStartedAt: new Date().toISOString() });
  }
  useEffect(() => {
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, live.current);
  }, []);
  useEffect(() => () => stopSpeech(), [state.stage]);
  useEffect(() => {
    if (!solved || calm || clock.paused) return;
    const timer = window.setTimeout(advance, 1300);
    return () => window.clearTimeout(timer);
  }, [state.stage, solved, calm, clock.paused]);
  useEffect(() => {
    if (step !== 'handoff' || handedOff.current) return;
    handedOff.current = true;
    const activityId = `zero:${state.episodeId}:completed`;
    if (!inspection && !readLearningActivities(userId).some((event) => event.unitId === zeroJourney.id && event.activityId === activityId)) record({ activityId, phase: 'completion', source: 'learner', response: 'Primer intercambio practicado. Recuerdo diferido pendiente.', expected: '', correct: null, helped: false });
    onNext();
  }, [step, onNext]);

  function activate() {
    if (clock.paused || live.current.stage !== state.stage) return;
    const word = zeroWords[step === 'coffee' ? 1 : step === 'cold' ? 2 : 0];
    const message = discovery ? word.en : step === 'want' ? zeroMessages.water.en : zeroMessages.cold.en;
    if (live.current.input !== 'revealed') {
      record({ source: 'authored', modality: 'choice', response: message, expected: '', correct: null, helped: true, ...(discovery ? { wordSnapshot: word } : {}) });
      if (!inspection && !discovery) recordSentenceExposure(userId, zeroJourney.id, step === 'want' ? zeroMessages.water : zeroMessages.cold);
      save({ input: 'revealed' });
    }
    void playEnglish(message);
  }
  function answer(value: string) {
    const current = live.current;
    if (current.stage !== state.stage || current.feedback === 'correct' || (current.checkFailures ?? 0) >= 2 || clock.paused) return;
    const correct = zeroAccepts(value, expected);
    const event = record({ response: value, correct, feedback: writing && !correct ? contextualCorrection(value, expected) : undefined, parentAttemptId: current.previousAttemptId, responseDelayMs: Math.max(0, Date.now() - Date.parse(current.promptStartedAt!)) });
    if (!inspection && writing) {
      const sentence = step === 'write-cold' ? zeroMessages.cold : zeroMessages.coffee;
      recordGrammarAttempt(userId, { unitId: zeroJourney.id, skill: coldScene ? 'zero:be-cold-v1' : 'zero:want-drink-v1', check: step, kind: 'write', correct, helped: current.helped, at: new Date().toISOString() });
      if (!correct || !current.helped) {
        recordSentenceRecall(userId, sentenceKey(zeroJourney.id, sentence), correct ? 'hesitant' : 'missed');
        recordWordRecall(userId, zeroWords[step === 'write-cold' ? 2 : 1], correct ? 'hesitant' : 'missed', new Date(), 'production', correct ? undefined : 'meaning', current.helped);
      }
    }
    if (correct) {
      if (!inspection && step === 'build-coffee') recordSentenceExposure(userId, zeroJourney.id, zeroMessages.coffee);
      if (!inspection && step === 'arcade-water') recordWordRecall(userId, zeroWords[0], 'hesitant', new Date(), 'recognition', undefined, true);
      playSnap(); save({ feedback: 'correct', previousAttemptId: undefined });
    } else {
      const failures = (current.checkFailures ?? 0) + 1;
      save({ feedback: 'help', helped: true, checkFailures: failures, previousAttemptId: event?.id, correctionResponse: value });
      if (failures === 2) record({ source: 'authored', response: modelMessage, expected: '', correct: null, helped: true, parentAttemptId: event?.id, feedback: 'Modelo mostrado, no un acierto.' });
    }
  }
  function showModel(reason = 'Modelo consultado, no un acierto.') {
    if (live.current.stage !== state.stage || live.current.feedback === 'correct' || (live.current.checkFailures ?? 0) >= 2) return;
    record({ source: 'authored', response: modelMessage, expected: '', correct: null, helped: true, feedback: reason });
    save({ feedback: 'help', helped: true, checkFailures: 2 });
  }
  function restart() {
    stopSpeech(); handedOff.current = false;
    const next = freshZeroJourney(); live.current = next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, next);
  }
  const word = zeroWords[step === 'coffee' ? 1 : step === 'cold' ? 2 : 0];
  return <main className={`zero-journey${step === 'arcade-water' ? ' zero-arcade' : ''}${coldScene ? ' zero-winter' : ''}`}>
    <header className="zero-header"><span className="zero-brand">M<span>MEMORA / PLAY</span></span><div className="zero-position" aria-label="Posición en este episodio; no mide dominio"><span style={{ width: `${state.stage / (zeroSteps.length - 1) * 100}%` }} /></div><details className="zero-menu"><summary aria-label="Pausa, ayuda y recorrido anterior">•••</summary><nav>
      <button type="button" onClick={clock.togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button>
      <button type="button" aria-pressed={calm} onClick={() => { setCalm(!calm); if (!inspection) writeArcadeCalm(userId, !calm); }}>Modo tranquilo</button>
      {!teaching ? <button type="button" onClick={() => showModel()}>Ver una ayuda</button> : null}
      <button type="button" onClick={restart}>Volver al comienzo de este episodio</button>
      <button type="button" onClick={() => { stopSpeech(); onExit(); }}>Recorrido anterior</button>
      <small>Salir no borra tu práctica. Los puentes españoles ayudan a recordar; el audio enseña el sonido inglés. Teclado: flecha abajo para deslizar.</small>
    </nav></details></header>
    {clock.paused ? <aside className="zero-paused"><span>Ⅱ</span><h1>En pausa</h1><button type="button" onClick={clock.togglePause}>Reanudar</button></aside> : <GameCard vertical showAdvanceButton={false} key={`${state.episodeId}:${step}`} stepKey={step} onAdvance={ready ? advance : undefined} feedback={solved ? 'correct' : model ? 'model' : state.feedback === 'help' ? 'retry' : undefined} className="zero-card">
      <div className="zero-content">
        <p className="zero-kicker">{step === 'arcade-water' ? '⚡ ARCADE / PEDIDO RELÁMPAGO' : coldScene ? '02 / CAMBIA LO QUE DICES' : '01 / UN CAFÉ CON BYTE'}</p>
        {teaching ? <>
          <h1>{discovery ? step === 'water' ? 'Byte tiene sed.' : step === 'coffee' ? 'Ahora, algo caliente.' : 'La col te roba la bufanda.' : step === 'want' ? 'Hazte entender.' : 'No lo quieres. Lo sientes.'}</h1>
          {discovery ? <button type="button" data-feed-surface="true" className="zero-world" onClick={activate} aria-label={step === 'cold' ? 'Abrigar la col y descubrir COLD' : step === 'coffee' ? 'Servir café y descubrir COFFEE' : 'Llenar el vaso y descubrir WATER'}><ZeroJourneyScene drink={step === 'coffee' ? 'coffee' : 'water'} active={revealed} cold={step === 'cold'} /><span>{revealed ? 'Toca para escuchar' : step === 'cold' ? 'Toca la col' : 'Toca la taza'}</span></button> : <ZeroJourneyScene cold={coldScene} active={revealed} />}
          {discovery ? revealed ? <div className="zero-discovery"><div><strong lang="en">{word.en}</strong><span>{word.es}</span></div><p className="zero-memory-actors" aria-hidden="true">{word.emojis.join(' ')}</p><p>{word.scene}</p></div> : <p className="zero-whisper">{step === 'water' ? 'Una acción. Tu primera palabra.' : 'Descubre qué pasa.'}</p> : <>
            <p className="zero-native">{step === 'want' ? 'Quiero agua.' : 'Tengo frío.'}</p>
            <div className="zero-message" lang="en"><span className="zero-subject">I<small>yo</small></span>{revealed ? <span className="zero-verb">{step === 'want' ? 'WANT' : 'AM'}<small>{step === 'want' ? 'quiero' : 'estoy'}</small></span> : <button type="button" className="zero-verb" onClick={activate}>{step === 'want' ? 'QUIERO' : 'ESTOY'}<small>Toca y transforma</small></button>}<span className="zero-object">{step === 'want' ? 'WATER' : 'COLD'}<small>{step === 'want' ? 'agua' : 'frío'}</small></span></div>
            {revealed ? <><p className="zero-insight">{step === 'want' ? 'I + WANT: dices quién quiere algo.' : 'En esta expresión: I AM COLD = tengo frío.'}</p><SpeechModelButton text={step === 'want' ? zeroMessages.water.en : zeroMessages.cold.en} label="Escuchar el mensaje" /></> : null}
          </>}
        </> : <>
          <h1>{step === 'build-coffee' ? 'Pide café. No agua.' : step === 'arcade-water' ? 'Entrega el pedido.' : step === 'contrast' ? 'Byte está helado.' : step === 'write-cold' ? 'Cuéntale qué te pasa.' : 'Ahora pide café.'}</h1>
          {step !== 'arcade-water' ? <ZeroJourneyScene drink="coffee" cold={coldScene} active={solved} celebrate={solved} /> : null}
          {model ? <div className="zero-model" role="status"><p>Vamos con ayuda</p><strong lang="en">{modelMessage}</strong><SpeechModelButton text={modelMessage} /></div> : step === 'build-coffee' ? <GrammarOrder puzzle autoCheck pieces={zeroCoffeePieces} selected={state.order ?? []} locked={solved} onChange={(order) => { if (!solved) save({ order }); }} onAnswer={answer} />
            : step === 'arcade-water' ? <><p className="zero-order" lang="en">I WANT WATER</p>{!calm ? <ArcadeClock durationMs={10000} remaining={clock.remaining} paused={clock.paused} revealed={solved} /> : null}<div className="zero-drinks">{['WATER', 'COFFEE'].map((value) => <button key={value} type="button" disabled={solved} onClick={() => answer(value)}><span aria-hidden="true">{value === 'WATER' ? '💧' : '☕'}</span>{value === 'WATER' ? 'Agua' : 'Café'}</button>)}</div></>
            : step === 'contrast' ? <><p className="zero-order" lang="en">I <span className="zero-missing">{solved ? 'AM' : '…'}</span> COLD</p><p className="zero-native">Tengo frío.</p><div className="zero-verb-options">{['WANT', 'AM'].map((value) => <button key={value} type="button" disabled={solved} onClick={() => answer(value)}>{value}<small>{value === 'WANT' ? 'quiero' : 'estoy'}</small></button>)}</div></>
            : writing ? <AnswerStudio id="zero-answer" taskKey={`${state.episodeId}:${step}`} target={target} value={state.input} onChange={(input) => save({ input })} onAnswer={answer} accepts={(value) => zeroAccepts(value, expected)} disabled={solved} /> : null}
          {solved ? <p className="zero-reaction" role="status">✓ {step === 'write-cold' ? 'Byte te trae una bufanda.' : step === 'write-coffee' || step === 'build-coffee' ? 'Byte te sirve café.' : 'Te ha entendido.'}</p> : state.feedback === 'help' && !model ? <p className="zero-retry" role="status">{step === 'contrast' ? 'Aquí cuentas cómo estás: AM.' : writing ? contextualCorrection(state.correctionResponse ?? '', expected) : 'Prueba otra combinación. Tus piezas siguen aquí.'}</p> : null}
        </>}
        {ready && (!solved || calm) ? <p className="zero-swipe">Desliza ↑</p> : null}
      </div>
    </GameCard>}
  </main>;
}
