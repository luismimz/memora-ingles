import { useEffect, useRef, useState } from 'react';
import { zeroJourney, zeroSteps, zeroWords, zeroMessages, zeroFrames, zeroCoffeePieces, zeroNoWaterPieces, zeroTask, nextZeroStep, zeroAccepts, zeroCorrection, freshZeroJourney, resumeZeroJourney } from '../domain/zeroJourney';
import { readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint } from '../domain/trickCheckpoint';
import { recordLearningActivity, readLearningActivities } from '../domain/learningActivity';
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
import { ZeroDoorScene, ZeroJourneyScene } from './ZeroJourneyScene';
import { useDisclosureDismissal } from './useDisclosureDismissal';
import './zeroJourney.css';

/** New presentation/sequence, using the existing journal, checkpoint, SRS and controls. */
export function ZeroJourney({ userId, inspection = false, onExit, onNext }: { userId: string; inspection?: boolean; onExit: () => void; onNext: () => void }) {
  const [state, setState] = useState(() => !inspection && resumeZeroJourney(readTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version)) || freshZeroJourney());
  const live = useRef(state); live.current = state;
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const handedOff = useRef(false);
  const menu = useDisclosureDismissal();
  const step = zeroSteps[state.stage];
  const revealed = state.input === 'revealed';
  const discovery = ['water', 'coffee', 'cold', 'key'].includes(step);
  const teaching = discovery || ['want', 'be', 'not-want', 'cold-order', 'have'].includes(step);
  const task = zeroTask(step);
  const frame = zeroFrames[step as keyof typeof zeroFrames] ?? zeroFrames.be;
  const { writing, arcade, expected, target } = task;
  const solved = state.feedback === 'correct';
  const model = (state.checkFailures ?? 0) >= 2;
  const ready = teaching ? revealed : solved || model;
  const coldScene = ['cold', 'be', 'contrast', 'write-cold'].includes(step);
  const modelMessage = step === 'contrast' ? zeroMessages.cold.en : step === 'have-meaning' ? zeroMessages.haveKey.en : arcade ? target : expected;
  const clock = useArcadeClock(state.stage, solved || model, arcade, () => { if (live.current.checkId === step) showModel('Tiempo terminado; queda pendiente.'); }, () => {}, 0, 10000, 0, calm, true);

  function save(patch: Partial<TrickCheckpoint>) {
    const next = { ...live.current, ...patch }; live.current = next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, next);
  }
  function record(value: Partial<Parameters<typeof recordLearningActivity>[1]>) {
    if (inspection) return undefined;
    return recordLearningActivity(userId, { unitId: zeroJourney.id, unitTitle: zeroJourney.title, contentVersion: zeroJourney.version,
      activityId: `zero:${state.episodeId}:${step}`, skill: task.skill, phase: writing ? 'dialogue' : arcade ? 'arcade' : 'grammar',
      source: 'learner', modality: writing ? 'writing' : 'choice', prompt: target, response: '', expected, correct: null, helped: !writing || live.current.helped,
      promptLanguage: arcade ? 'en' : 'es', responseLanguage: 'en',
      ...value });
  }
  function advance() {
    const current = live.current;
    if (current.stage !== state.stage || !ready || clock.paused || step === 'complete') return;
    stopSpeech();
    const next = zeroSteps.indexOf(nextZeroStep(step));
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
    if (step !== 'complete' || handedOff.current) return;
    handedOff.current = true;
    const activityId = `zero:${state.episodeId}:cafe-transfer-completed`;
    if (!inspection && !readLearningActivities(userId).some((event) => event.unitId === zeroJourney.id && event.activityId === activityId)) record({ activityId, phase: 'completion', source: 'learner', response: 'Pedido, estado, rechazo y llave practicados. Recuerdo diferido pendiente.', responseLanguage: 'es', expected: '', correct: null, helped: false });
    onNext();
  }, [step, onNext]);

  function activate() {
    if (clock.paused || live.current.stage !== state.stage) return;
    const word = zeroWords[step === 'coffee' ? 1 : step === 'cold' ? 2 : step === 'key' ? 3 : 0];
    const sentence = step === 'want' ? zeroMessages.water : step === 'not-want' ? zeroMessages.noCoffee : step === 'cold-order' ? zeroMessages.coldCoffee : step === 'have' ? zeroMessages.haveKey : zeroMessages.cold;
    const message = discovery ? word.en : sentence.en;
    if (live.current.input !== 'revealed') {
      record({ source: 'authored', modality: 'choice', prompt: discovery ? word.es : sentence.es, response: message, expected: '', correct: null, helped: true, ...(discovery ? { wordSnapshot: word } : {}) });
      if (!inspection && !discovery) recordSentenceExposure(userId, zeroJourney.id, sentence);
      save({ input: 'revealed' });
    }
    void playEnglish(message);
  }
  function answer(value: string) {
    const current = live.current;
    if (current.stage !== state.stage || current.feedback === 'correct' || (current.checkFailures ?? 0) >= 2 || clock.paused) return;
    const correct = zeroAccepts(value, expected);
    const event = record({ response: value, correct, feedback: writing && !correct ? zeroCorrection(step, value) : undefined, parentAttemptId: current.previousAttemptId, responseDelayMs: Math.max(0, Date.now() - Date.parse(current.promptStartedAt!)) });
    if (!inspection && writing) {
      const sentence = task.message;
      recordGrammarAttempt(userId, { unitId: zeroJourney.id, skill: task.skill, check: step, kind: 'write', correct, helped: current.helped, at: new Date().toISOString() });
      if (!correct || !current.helped) {
        // The new combination may not have a sentence memory yet. Exposure is neutral.
        if (correct) recordSentenceExposure(userId, zeroJourney.id, sentence);
        recordSentenceRecall(userId, sentenceKey(zeroJourney.id, sentence), correct ? 'hesitant' : 'missed');
        for (const recalled of task.words) recordWordRecall(userId, recalled, correct ? 'hesitant' : 'missed', new Date(), 'production', correct ? undefined : 'meaning', current.helped);
      }
    }
    if (correct) {
      if (!inspection && ['build-coffee', 'build-no-water'].includes(step)) recordSentenceExposure(userId, zeroJourney.id, task.message);
      if (!inspection && step === 'arcade-water') recordWordRecall(userId, zeroWords[0], 'hesitant', new Date(), 'recognition', undefined, true);
      playSnap(); save({ feedback: 'correct', previousAttemptId: undefined });
    } else {
      const failures = (current.checkFailures ?? 0) + 1;
      save({ feedback: 'help', helped: true, checkFailures: failures, previousAttemptId: event?.id, correctionResponse: value });
      if (failures === 2) {
        if (!inspection && writing) recordSentenceExposure(userId, zeroJourney.id, task.message);
        record({ source: 'authored', response: modelMessage, expected: '', correct: null, helped: true, parentAttemptId: event?.id, feedback: 'Modelo mostrado, no un acierto.' });
      }
    }
  }
  function showModel(reason = 'Modelo consultado, no un acierto.') {
    if (live.current.stage !== state.stage || live.current.feedback === 'correct' || (live.current.checkFailures ?? 0) >= 2) return;
    record({ source: 'authored', response: modelMessage, expected: '', correct: null, helped: true, feedback: reason });
    if (!inspection && writing) recordSentenceExposure(userId, zeroJourney.id, task.message);
    save({ feedback: 'help', helped: true, checkFailures: 2 });
  }
  function restart() {
    stopSpeech(); handedOff.current = false;
    const next = freshZeroJourney(); live.current = next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, next);
  }
  const word = zeroWords[step === 'coffee' ? 1 : step === 'cold' ? 2 : step === 'key' ? 3 : 0];
  const rejection = ['not-want', 'build-no-water', 'arcade-refusal', 'use-refusal'].includes(step);
  const iced = step === 'cold-order' || step === 'write-cold-water';
  const door = ['key', 'have', 'have-meaning', 'write-key'].includes(step);
  const choiceClass = (value: string) => solved && value === expected ? 'is-answer-correct' : state.feedback === 'help' && value === state.correctionResponse ? 'is-answer-wrong' : undefined;
  const temperaturePiece = <button key="temperature" type="button" className="zero-quality" onClick={activate} aria-label={revealed ? 'Escuchar I want cold coffee' : 'Mover FRÍO delante de CAFÉ y descubrir COLD COFFEE'}>{revealed ? 'COLD' : 'FRÍO'}<small>{revealed ? 'frío' : 'Toca para mover ←'}</small></button>;
  const drinkPiece = <span key="drink" className="zero-object">{revealed ? 'COFFEE' : 'CAFÉ'}<small>{revealed ? 'café' : 'la bebida'}</small></span>;
  return <main className={`zero-journey${arcade ? ' zero-arcade' : ''}${coldScene ? ' zero-winter' : ''}${rejection ? ' zero-rejection' : ''}${door ? ' zero-door' : ''}`}>
    <header className="zero-header"><span className="zero-brand">M<span>MEMORA / PLAY</span></span><div className="zero-position" aria-label="Posición en este episodio; no mide dominio"><span style={{ width: `${state.stage / (zeroSteps.length - 1) * 100}%` }} /></div><details className="zero-menu" onKeyDown={menu.onKeyDown} onClick={(event) => { if ((event.target as HTMLElement).closest?.('button')) event.currentTarget.open = false; }}><summary ref={menu.trigger} aria-label="Pausa, ayuda y recorrido anterior">•••</summary><nav>
      <button type="button" onClick={clock.togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button>
      <button type="button" aria-pressed={calm} onClick={() => { setCalm(!calm); if (!inspection) writeArcadeCalm(userId, !calm); }}>Modo tranquilo</button>
      {!teaching ? <button type="button" onClick={() => showModel()}>Ver una ayuda</button> : null}
      <button type="button" onClick={restart}>Volver al comienzo de este episodio</button>
      <button type="button" onClick={() => { stopSpeech(); onExit(); }}>Recorrido anterior</button>
      <small>Salir no borra tu práctica. Los puentes españoles ayudan a recordar; el audio enseña el sonido inglés. Teclado: flecha abajo para deslizar.</small>
    </nav></details></header>
    {clock.paused ? <aside className="zero-paused"><span>Ⅱ</span><h1>En pausa</h1><button type="button" onClick={clock.togglePause}>Reanudar</button></aside> : <GameCard vertical showAdvanceButton={false} key={`${state.episodeId}:${step}`} stepKey={step} onAdvance={ready ? advance : undefined} feedback={solved ? 'correct' : model ? 'model' : state.feedback === 'help' ? 'retry' : undefined} className="zero-card">
      <div className="zero-content">
        <p className="zero-kicker">{arcade ? '⚡ ARCADE / PEDIDO RELÁMPAGO' : door ? '04 / AL OTRO LADO' : state.stage >= zeroSteps.indexOf('not-want') ? '03 / TÚ CAMBIAS EL PEDIDO' : coldScene ? '02 / CAMBIA LO QUE DICES' : '01 / UN CAFÉ CON BYTE'}</p>
        {teaching ? <>
          <h1>{discovery ? step === 'water' ? 'Byte tiene sed.' : step === 'coffee' ? 'Ahora, algo caliente.' : step === 'key' ? 'La puerta no abre.' : 'La col te roba la bufanda.' : step === 'want' ? 'Hazte entender.' : step === 'not-want' ? 'Llegó el pedido equivocado.' : step === 'cold-order' ? 'Cambia la temperatura.' : step === 'have' ? 'Esta vez, ya la tienes.' : 'No lo quieres. Lo sientes.'}</h1>
          {door ? discovery ? <button type="button" data-feed-surface="true" className="zero-world" onClick={activate} aria-label="Girar el kiwi y descubrir KEY"><ZeroDoorScene mnemonic discovered={revealed} /><span>{revealed ? 'Toca para escuchar' : 'Gira el kiwi: toca'}</span></button> : <ZeroDoorScene discovered owned /> : null}
          {door ? null : discovery ? <button type="button" data-feed-surface="true" className="zero-world" onClick={activate} aria-label={step === 'cold' ? 'Abrigar la col y descubrir COLD' : step === 'coffee' ? 'Servir café y descubrir COFFEE' : 'Hacer estornudar el wáter y descubrir WATER'}><ZeroJourneyScene drink={step === 'coffee' ? 'coffee' : 'water'} active={revealed} cold={step === 'cold'} mnemonic={step === 'water' ? 'water' : step === 'coffee' ? 'coffee' : undefined} /><span>{revealed ? 'Toca para escuchar' : step === 'cold' ? 'Toca la col' : step === 'water' ? 'Toca el wáter' : 'Toca la taza'}</span></button> : <ZeroJourneyScene cold={coldScene} active={revealed} drink={step === 'not-want' || step === 'cold-order' ? 'coffee' : 'water'} served={step === 'not-want' || step === 'cold-order'} rejected={step === 'not-want' && revealed} iced={iced && revealed} />}
          {discovery ? revealed ? <div className="zero-discovery"><div><strong lang="en">{word.en}</strong><span>{word.es}</span></div><p>{word.scene}</p></div> : <p className="zero-whisper">{step === 'water' ? 'Una acción. Tu primera palabra.' : 'Descubre qué pasa.'}</p> : step === 'cold-order' ? <>
            <p className="zero-native">Quiero café frío.</p>
            <span className="zero-order" lang={revealed ? 'en' : 'es'}>{revealed ? 'I WANT' : 'Quiero'}</span>
            <div className={`zero-temperature${revealed ? ' is-reversed' : ''}`} role="group" aria-label={revealed ? 'Cold coffee: café frío' : 'Café frío: toca frío para cambiar el orden'} lang={revealed ? 'en' : 'es'}>{revealed ? [temperaturePiece, drinkPiece] : [drinkPiece, temperaturePiece]}</div>
            {revealed ? <p className="zero-insight">La temperatura va delante: COLD COFFEE, café frío.</p> : null}
          </> : <>
            <p className="zero-native">{frame.sentence.es}</p>
            <div className="zero-message" lang="en"><span className="zero-subject">I<small>yo</small></span>{revealed ? <span className="zero-verb">{frame.verb}<small>{frame.gloss}</small></span> : <button type="button" className="zero-verb" onClick={activate}>{frame.mirror}<small>Toca y transforma</small></button>}<span className="zero-object">{frame.object}<small>{frame.meaning}</small></span></div>
            {revealed ? <><p className="zero-insight">{frame.insight}</p><SpeechModelButton text={frame.sentence.en} label="Escuchar el mensaje" /></> : null}
          </>}
        </> : <>
          <h1>{step === 'have-meaning' ? 'Ya tienes la llave.' : step === 'write-key' ? 'Pide una llave para tu amigo.' : step === 'build-coffee' ? 'Pide café. No agua.' : step === 'arcade-water' ? 'Entrega el pedido.' : step === 'arcade-refusal' ? '¿Qué está rechazando?' : step === 'build-no-water' ? 'Retira el agua del pedido.' : step === 'contrast' ? 'Byte está helado.' : step === 'write-cold' ? 'Ahora eres tú quien tiene frío.' : step === 'write-cold-water' ? 'Esta vez, agua bien fría.' : step === 'use-refusal' ? 'Te ofrecen café. No lo quieres.' : 'Ahora pide café.'}</h1>
          {door ? <ZeroDoorScene discovered={step === 'have-meaning' || solved} owned={step === 'have-meaning'} opened={step === 'write-key' && solved} /> : !arcade ? <ZeroJourneyScene drink={step === 'write-cold-water' || step === 'build-no-water' ? 'water' : 'coffee'} cold={coldScene} active={solved} celebrate={solved} served={rejection} rejected={rejection && solved} iced={iced && solved} /> : null}
          {step === 'build-no-water' ? <p className="zero-native">No quiero agua.</p> : null}
          {model ? <div className="zero-model" role="status"><p>Vamos con ayuda</p><strong lang="en">{modelMessage}</strong><SpeechModelButton text={modelMessage} /></div> : step === 'build-coffee' || step === 'build-no-water' ? <GrammarOrder puzzle autoCheck pieces={step === 'build-coffee' ? zeroCoffeePieces : zeroNoWaterPieces} selected={state.order ?? []} locked={solved} onChange={(order) => { if (!solved) save({ order }); }} onAnswer={answer} />
            : arcade ? <><p className="zero-order" lang="en">{target}</p>{!calm ? <ArcadeClock durationMs={10000} remaining={clock.remaining} paused={clock.paused} revealed={solved} /> : null}<div className="zero-drinks">{(step === 'arcade-refusal' ? ['COFFEE', 'WATER'] : ['WATER', 'COFFEE']).map((value) => <button key={value} type="button" className={choiceClass(value)} aria-pressed={Boolean(choiceClass(value))} disabled={solved} onClick={() => answer(value)}><span aria-hidden="true">{value === 'WATER' ? '💧' : '☕'}</span>{value === 'WATER' ? 'Agua' : 'Café'}</button>)}</div></>
            : step === 'contrast' || step === 'have-meaning' ? <><p className="zero-order" lang="en">I <span className="zero-missing">{solved ? expected : '…'}</span> {door ? 'A KEY' : 'COLD'}</p><p className="zero-native">{target}</p><div className="zero-verb-options">{(door ? ['HAVE', 'WANT'] : ['WANT', 'AM']).map((value) => <button key={value} type="button" className={choiceClass(value)} aria-pressed={Boolean(choiceClass(value))} disabled={solved} onClick={() => answer(value)}>{value}<small>{value === 'WANT' ? 'quiero' : value === 'HAVE' ? 'tengo' : 'estoy'}</small></button>)}</div></>
            : writing ? <AnswerStudio id="zero-answer" taskKey={`${state.episodeId}:${step}`} target={target} value={state.input} onChange={(input) => save({ input })} onAnswer={answer} accepts={(value) => zeroAccepts(value, expected)} disabled={solved} /> : null}
          {solved ? <p className="zero-reaction" role="status">✓ {step === 'write-key' ? 'Tu amigo recibe la llave y puede entrar.' : step === 'have-meaning' ? 'La llave ya está en tu mano.' : step === 'write-cold' ? 'Byte te trae una bufanda.' : step === 'write-cold-water' ? 'Tu vaso llega con hielo.' : step === 'build-no-water' ? 'El agua se retira del pedido.' : rejection ? 'El café se retira del pedido.' : step === 'write-coffee' || step === 'build-coffee' ? 'Byte te sirve café.' : 'Te ha entendido.'}</p> : state.feedback === 'help' && !model ? <p className="zero-retry" role="status">{step === 'have-meaning' ? 'Ya está en tu mano: HAVE, tengo.' : step === 'contrast' ? 'Aquí cuentas cómo estás: AM.' : writing ? zeroCorrection(step, state.correctionResponse ?? '') : step === 'build-no-water' ? "I · DON'T WANT · WATER. El bloque central ya dice «no quiero»." : step === 'arcade-refusal' ? "DON'T WANT significa «no quiero». Busca la bebida que rechaza." : 'Prueba otra combinación. Tus piezas siguen aquí.'}</p> : null}
        </>}
        {ready && (!solved || calm) ? <p className="zero-swipe">Desliza ↑</p> : null}
      </div>
    </GameCard>}
  </main>;
}
