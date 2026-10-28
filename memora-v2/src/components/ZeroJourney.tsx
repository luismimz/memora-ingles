import { useEffect, useRef, useState } from 'react';
import { zeroJourney, zeroSteps, zeroWords, zeroMessages, zeroFrames, zeroCoffeePieces, zeroNoWaterPieces, zeroTask, nextZeroStep, zeroAccepts, zeroCorrection, zeroDraftCue, zeroSpellingRepair, zeroWritingGuide, dueZeroReviews, freshZeroJourney, resumeZeroJourney } from '../domain/zeroJourney';
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
import { WritingSpellingRepair } from './WritingSpellingRepair';
import { WritingGuide } from './WritingGuide';
import { PlayGrammarToy } from './PlayGrammarToy';
import { PlayArcade } from './PlayArcade';
import { piece } from '../domain/grammarLesson';
import './zeroJourney.css';

/** New presentation/sequence, using the existing journal, checkpoint, SRS and controls. */
export function ZeroJourney({ userId, inspection = false, onExit, onNext }: { userId: string; inspection?: boolean; onExit: () => void; onNext: () => void }) {
  const [state, setState] = useState(() => {
    const saved = !inspection && resumeZeroJourney(readTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version));
    // An unfinished draft wins over newly due reviews. A finished route can
    // return directly to known scenes, without showing their English models.
    if (saved && saved.checkId === 'complete') {
      const reviews = dueZeroReviews(userId);
      return reviews.length ? freshZeroJourney(reviews) : saved;
    }
    return saved || freshZeroJourney();
  });
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
  const repairing = writing && state.continuation?.phase === 'build';
  const repairFailures = state.continuation?.failures ?? 0;
  const model = !solved && ((state.checkFailures ?? 0) >= 2 || repairing && repairFailures >= 2);
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
      promptLanguage: arcade ? 'en' : 'es', responseLanguage: step === 'arcade-refusal-action' ? 'es' : 'en',
      ...value });
  }
  function advance() {
    const current = live.current;
    if (current.stage !== state.stage || !ready || clock.paused || step === 'complete') return;
    stopSpeech();
    const pending = current.review?.pending.slice(1);
    let nextStep = pending ? (pending[0] ?? 'complete') as typeof step : current.resumeAfter === 'not-want' ? 'not-want' : nextZeroStep(step);
    if (!pending && nextStep === 'write-cold' && readLearningActivities(userId).some((event) => event.unitId === zeroJourney.id && event.activityId === `zero:${current.episodeId}:write-cold` && event.source === 'learner' && event.correct === true && zeroAccepts(event.response, zeroMessages.cold.en))) nextStep = 'use-refusal';
    const next = zeroSteps.indexOf(nextStep);
    save({ stage: next, checkId: zeroSteps[next], input: '', order: [], feedback: 'idle', helped: false, checkFailures: 0, previousAttemptId: undefined, correctionResponse: undefined, resumeAfter: undefined, continuation: undefined, promptStartedAt: new Date().toISOString(), ...(pending ? { review: { pending, total: current.review!.total } } : {}) });
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
    if (!inspection && !readLearningActivities(userId).some((event) => event.unitId === zeroJourney.id && event.activityId === activityId)) record({ activityId, phase: 'completion', source: 'learner', response: state.review ? 'Repaso de escenas registrado con sus ayudas. Próximas oportunidades según el SRS.' : 'Pedido, estado, rechazo y llave practicados. Recuerdo diferido pendiente.', responseLanguage: 'es', expected: '', correct: null, helped: false });
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
  function cueDraft(value: string, hint: string) {
    const current = live.current;
    if (current.stage !== state.stage || current.input !== value || current.feedback !== 'idle' || clock.paused) return;
    record({ source: 'authored', response: hint, responseLanguage: 'es', expected: '', correct: null, helped: true, feedback: 'Pista de borrador: no es un envío ni un error.' });
    // Idle + helped records a neutral cue, separately from a submitted attempt.
    save({ helped: true, correctionResponse: value });
  }
  function startRepair() {
    const current = live.current;
    if (!writing || current.stage !== state.stage || current.feedback === 'correct' || clock.paused || current.continuation) return;
    record({ source: 'authored', phase: 'construction', modality: 'choice', response: expected, expected: '', correct: null, helped: true, feedback: 'Modelo espejo consultado para armar, no escritura independiente.' });
    if (!inspection) recordSentenceExposure(userId, zeroJourney.id, task.message);
    save({ feedback: 'idle', helped: true, continuation: { phase: 'build', sentenceIndex: 0, filledSlots: 0, modelUsed: true, failures: 0, order: [] } });
  }
  function repairAnswer(value: string, kind: 'pieces' | 'spelling' = 'pieces') {
    const current = live.current;
    if (!writing || current.stage !== state.stage || current.feedback === 'correct' || clock.paused) return;
    if (kind === 'pieces' && (!current.continuation || (current.continuation.failures ?? 0) >= 2)) return;
    if (kind === 'spelling' && zeroSpellingRepair(step, current.input)?.corrected !== value) return;
    const correct = zeroAccepts(value, expected);
    const event = record({ phase: 'construction', modality: 'choice', response: value, correct, helped: true, parentAttemptId: current.previousAttemptId, responseDelayMs: Math.max(0, Date.now() - Date.parse(current.promptStartedAt!)), feedback: kind === 'spelling' ? 'El alumno aplica la corrección propuesta, con ayuda.' : 'Montaje con modelo espejo, con ayuda.' });
    if (!inspection) recordGrammarAttempt(userId, { unitId: zeroJourney.id, skill: task.skill, check: step, kind: 'choose', correct, helped: true, at: new Date().toISOString() });
    if (correct) {
      if (!inspection) recordSentenceExposure(userId, zeroJourney.id, task.message);
      playSnap(); save({ input: value, helped: true, feedback: 'correct', previousAttemptId: undefined });
    } else if (current.continuation) {
      save({ feedback: 'help', helped: true, previousAttemptId: event?.id, continuation: { ...current.continuation, failures: Math.min(2, (current.continuation.failures ?? 0) + 1) } });
    }
  }
  function repairOrder(order: number[]) {
    const current = live.current, size = zeroWritingGuide(step).pieces.length;
    if (current.stage !== state.stage || current.feedback === 'correct' || !current.continuation || (current.continuation.failures ?? 0) >= 2 || clock.paused || new Set(order).size !== order.length || order.some((index) => !Number.isInteger(index) || index < 0 || index >= size)) return;
    save({ feedback: 'idle', continuation: { ...current.continuation, filledSlots: order.length, order } });
  }
  function restart() {
    stopSpeech(); handedOff.current = false;
    const next = freshZeroJourney(); live.current = next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId, zeroJourney.id, zeroJourney.version, next);
  }
  const word = zeroWords[step === 'coffee' ? 1 : step === 'cold' ? 2 : step === 'key' ? 3 : 0];
  const rejection = ['not-want', 'build-no-water', 'arcade-refusal', 'arcade-refusal-action', 'use-refusal'].includes(step);
  const iced = step === 'cold-order' || step === 'write-cold-water';
  const door = ['key', 'have', 'have-meaning', 'write-key'].includes(step);
  const choiceClass = (value: string) => solved && value === expected ? 'is-answer-correct' : state.feedback === 'help' && value === state.correctionResponse ? 'is-answer-wrong' : undefined;
  const position = state.review ? (state.review.total - state.review.pending.length) / state.review.total : (state.resumeAfter ? zeroSteps.indexOf('not-want') : state.stage) / (zeroSteps.length - 1);
  const draftHint = state.feedback === 'idle' && state.helped && state.input === state.correctionResponse ? zeroDraftCue(step, state.input) : undefined;
  const spelling = writing && !solved && !repairing && (draftHint || state.feedback === 'help') ? zeroSpellingRepair(step, state.input) : undefined;
  const writingFeedback = spelling ? <WritingSpellingRepair repair={spelling} onApply={() => repairAnswer(spelling.corrected, 'spelling')} /> : draftHint ?? (state.feedback === 'help' && !solved ? zeroCorrection(step, state.input) : undefined);
  const label = state.review ? 'RECUERDA' : arcade ? '⚡ ARCADE' : discovery ? 'DESCUBRE' : teaching ? 'TRANSFORMA' : writing ? 'TU TURNO' : 'JUEGA CON EL MENSAJE';
  const title = discovery ? step === 'water' ? 'Byte tiene sed.' : step === 'coffee' ? 'Algo caliente.' : step === 'key' ? 'Una puerta cerrada.' : 'La col tiene un plan.'
    : step === 'want' ? 'Haz tu primer pedido.' : step === 'be' ? 'Dale voz al frío.' : step === 'not-want' ? 'No era tu pedido.' : step === 'cold-order' ? 'Cambia la temperatura.' : step === 'have' ? 'Ahora está en tu mano.'
    : step === 'build-coffee' ? 'Ahora, pide café.' : step === 'build-no-water' ? 'Esta vez, sin agua.' : step === 'contrast' ? 'Byte está helado.' : step === 'have-meaning' ? 'La llave ya es tuya.'
    : step === 'arcade-water' ? 'Sirve su pedido.' : step === 'arcade-refusal-action' ? '¿Se queda o se va?' : step === 'arcade-refusal' ? '¿Qué está rechazando?'
    : step === 'write-cold-water' ? 'Ahora, agua bien fría.' : step === 'write-cold' ? 'Tú también tienes frío.' : step === 'use-refusal' ? 'Te ofrecen café. No quieres.' : step === 'write-key' ? 'Tu amigo necesita una llave.' : 'Ahora, pide café.';
  const toy = step === 'cold-order'
    ? { before: { en: 'I WANT', es: 'quiero' }, after: { en: 'COFFEE', es: 'café' }, token: piece('COLD', 'context'), meaning: 'frío', target: zeroMessages.coldCoffee.es, insight: 'COLD va delante: COLD COFFEE, café frío.' }
    : { before: { en: 'I', es: 'yo' }, after: { en: frame.object, es: frame.meaning }, token: piece(frame.verb, 'verb'), meaning: frame.gloss, target: frame.sentence.es, insight: frame.insight };
  return <main className={`zero-journey${arcade ? ' zero-arcade' : ''}${coldScene ? ' zero-winter' : ''}${rejection ? ' zero-rejection' : ''}${door ? ' zero-door' : ''}`}>
    <header className="zero-header">
      <span className="zero-brand"><span className="zero-brand-mark">M</span><span>MEMORA / PLAY</span></span>
      <div className="zero-position" role="progressbar" aria-label="Posición en este episodio; no mide dominio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position * 100)}><span style={{ width: `${position * 100}%` }} /></div>
      <details className="zero-menu" onKeyDown={menu.onKeyDown} onClick={(event) => { if ((event.target as HTMLElement).closest?.('button')) event.currentTarget.open = false; }}>
        <summary ref={menu.trigger} aria-label="Pausa, ayuda y recorrido anterior">•••</summary><nav>
          <button type="button" onClick={clock.togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button>
          <button type="button" aria-pressed={calm} onClick={() => { setCalm(!calm); if (!inspection) writeArcadeCalm(userId, !calm); }}>Modo tranquilo</button>
          {!teaching ? <button type="button" onClick={() => showModel()}>Ver una ayuda</button> : null}
          <button type="button" onClick={restart}>Volver al comienzo de este episodio</button>
          <button type="button" onClick={() => { stopSpeech(); onExit(); }}>Recorrido anterior</button>
          <small>Salir conserva tu práctica. El puente español ayuda a recordar; el audio modela el sonido inglés.</small>
        </nav>
      </details>
    </header>
    {clock.paused ? <aside className="zero-paused"><span>Ⅱ</span><h1>En pausa</h1><button type="button" onClick={clock.togglePause}>Reanudar</button></aside> : <GameCard vertical showAdvanceButton={false} key={`${state.episodeId}:${step}`} stepKey={step} onAdvance={ready ? advance : undefined} feedback={solved ? 'correct' : model ? 'model' : state.feedback === 'help' ? 'retry' : undefined} className="zero-card">
      <div className={`zero-content${discovery ? ' is-discovery' : teaching ? ' is-grammar' : ''}${writing ? ' is-writing' : ''}${repairing ? ' is-repairing' : ''}`}>
        <p className="zero-kicker">{label}{state.review ? ' · SIN VOLVER A MIRAR' : ''}</p>
        <h1>{title}</h1>
        {discovery ? <>
          <button type="button" data-feed-surface="true" className="zero-world" onClick={activate} aria-label={step === 'key' ? 'Girar el kiwi y descubrir KEY' : step === 'cold' ? 'Abrigar la col y descubrir COLD' : step === 'coffee' ? 'Servir café y descubrir COFFEE' : 'Hacer estornudar el wáter y descubrir WATER'}>
            {door ? <ZeroDoorScene mnemonic discovered={revealed} /> : <ZeroJourneyScene drink={step === 'coffee' ? 'coffee' : 'water'} active={revealed} cold={step === 'cold'} mnemonic={step === 'water' ? 'water' : step === 'coffee' ? 'coffee' : undefined} />}
            {!revealed ? <span className="zero-touch-cue">{step === 'key' ? '🥝 Gira el kiwi: toca' : step === 'cold' ? 'Toca la col' : step === 'water' ? 'Toca el wáter' : 'Toca la taza'} <b aria-hidden="true">↗</b></span> : null}
          </button>
          {revealed ? <div className="zero-discovery"><div><strong lang="en">{word.en}</strong><span>{word.es}</span><SpeechModelButton text={word.en} label={`Escuchar ${word.en}`} /></div><p>{word.scene}</p></div> : <p className="zero-whisper">Toca y descubre qué pasa.</p>}
        </> : teaching ? <>
          <div className="zero-teaching-scene">{door ? <ZeroDoorScene discovered owned={revealed} /> : <ZeroJourneyScene cold={coldScene} active={coldScene || revealed} drink={rejection || iced ? 'coffee' : 'water'} served={revealed || rejection || iced} rejected={rejection && revealed} iced={iced && revealed} />}</div>
          <PlayGrammarToy {...toy} revealed={revealed} onDiscover={activate} />
          {revealed ? <SpeechModelButton text={step === 'cold-order' ? zeroMessages.coldCoffee.en : frame.sentence.en} label="Escuchar el mensaje" /> : null}
        </> : <>
          {!arcade ? door ? <ZeroDoorScene discovered={step === 'have-meaning' || solved} owned={step === 'have-meaning'} opened={step === 'write-key' && solved} /> : <ZeroJourneyScene drink={step === 'write-cold-water' || step === 'build-no-water' ? 'water' : 'coffee'} cold={coldScene} active={solved} celebrate={solved} served={rejection} rejected={rejection && solved} iced={iced && solved} /> : null}
          {repairing ? <WritingGuide target={target} guide={zeroWritingGuide(step)} order={state.continuation?.order ?? []} locked={solved || repairFailures >= 2} onOrder={repairOrder} onAnswer={repairAnswer} />
            : model ? <div className="zero-model" role="status"><p>Vamos con ayuda</p><strong lang="en">{modelMessage}</strong>{arcade ? <p>{step === 'arcade-water' ? 'Quiere agua, no café.' : 'No quiere café: lo retiramos.'}</p> : null}<SpeechModelButton text={modelMessage} />{spelling ? <WritingSpellingRepair repair={spelling} onApply={() => repairAnswer(spelling.corrected, 'spelling')} /> : null}</div>
            : step === 'build-coffee' || step === 'build-no-water' ? <div className="zero-phrase-game"><p className="zero-native">{target}</p><GrammarOrder puzzle autoCheck pieces={step === 'build-coffee' ? zeroCoffeePieces : zeroNoWaterPieces} selected={state.order ?? []} locked={solved} onChange={(order) => { if (!solved) save({ order }); }} onAnswer={answer} /></div>
            : arcade ? <>
              {!calm ? <ArcadeClock durationMs={10000} remaining={clock.remaining} paused={clock.paused} revealed={solved} /> : <span className="zero-calm-tag">A tu ritmo</span>}
              {step === 'arcade-refusal' ? <><p className="zero-order" lang="en">{target}</p><div className="zero-drinks">{['COFFEE', 'WATER'].map((value) => <button key={value} type="button" className={choiceClass(value)} aria-pressed={Boolean(choiceClass(value))} disabled={solved} onClick={() => answer(value)}><span aria-hidden="true">{value === 'WATER' ? '💧' : '☕'}</span>{value === 'WATER' ? 'Agua' : 'Café'}</button>)}</div></>
                : <PlayArcade kind={step === 'arcade-refusal-action' ? 'remove' : 'serve'} message={target} presentationKey={`${state.episodeId}:${step}`} selected={solved ? expected : state.correctionResponse ?? ''} feedback={state.feedback} onAnswer={answer} />}
            </>
            : step === 'contrast' || step === 'have-meaning' ? <div className="zero-meaning-game"><p className="zero-native">{target}</p><p className="zero-order" lang="en">I <span className="zero-missing">{solved ? expected : '…'}</span> {door ? 'A KEY' : 'COLD'}</p><div className="zero-verb-options">{(door ? ['HAVE', 'WANT'] : ['WANT', 'AM']).map((value) => <button key={value} type="button" className={choiceClass(value)} aria-pressed={Boolean(choiceClass(value))} disabled={solved} onClick={() => answer(value)}>{value}<small>{value === 'WANT' ? 'quiero' : value === 'HAVE' ? 'tengo' : 'estoy'}</small></button>)}</div></div>
            : writing ? <AnswerStudio id="zero-answer" taskKey={`${state.episodeId}:${step}`} target={target} value={state.input} onChange={(input) => save({ input, feedback: 'idle' })} onAnswer={answer} accepts={(value) => zeroAccepts(value, expected)} repeatDraftCues draftCue={(value) => zeroDraftCue(step, value)} onDraftCue={cueDraft} feedback={writingFeedback} disabled={solved} /> : null}
          {solved ? <p className="zero-reaction" role="status">✓ {step === 'write-key' ? 'Tu amigo ya puede entrar.' : step === 'have-meaning' ? 'La llave ya está en tu mano.' : step === 'write-cold' ? 'Byte te trae una bufanda.' : step === 'write-cold-water' ? 'Tu vaso llega con hielo.' : step === 'build-no-water' ? 'El agua sale del pedido.' : rejection ? 'El café sale del pedido.' : step === 'write-coffee' || step === 'build-coffee' ? 'Byte te sirve café.' : 'Te ha entendido.'}</p> : state.feedback === 'help' && !model && !writing ? <p className="zero-retry" role="status">{step === 'have-meaning' ? 'HAVE: ya la tienes. WANT: la quieres.' : step === 'contrast' ? 'Aquí cuentas cómo estás: AM.' : step === 'build-no-water' ? "DON’T WANT viaja junto: no quiero." : rejection ? 'No quiere café: retíralo.' : 'Busca la bebida de su mensaje.'}</p> : null}
        </>}
        {writing && !solved && !repairing ? <button type="button" className="zero-inline-help" onClick={startRepair}>🧩 Armar juntos</button> : null}
        {repairing && !solved && state.feedback === 'help' ? <p className="zero-retry" role="status">{repairFailures >= 2 ? 'El modelo queda a la vista. Puedes deslizar y seguir sin repetir.' : 'Sigue las piezas del modelo: quién → lo que dices → el resto.'}</p> : null}
        {writing && solved && state.helped ? <span className="zero-support-note">Con ayuda · práctica registrada</span> : null}
        {ready && (!solved || calm) ? <p className="zero-swipe"><span aria-hidden="true">↑</span> Desliza para descubrir lo siguiente</p> : null}
      </div>
    </GameCard>}
  </main>;
}
