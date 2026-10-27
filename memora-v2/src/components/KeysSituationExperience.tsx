import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { keysSituationId, keysSituationSkill, keysSituationStages, prepareKeysSituation, resumeKeysSituation, situationCheckpointVersion, situationRunCompleted } from '../domain/keysSituation';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint } from '../domain/trickCheckpoint';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { recordWordRecall, recordChunkExposure, recordSentenceExposure, recordSentenceRecall, sentenceKey } from '../domain/memory';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';
import type { Appearance } from '../useAppearance';
import type { SyncStatus } from '../services/progressSync';
import { playSnap, stopSpeech } from '../services/audio';
import { PlayHeader } from './PlayHeader';
import { GameCard } from './GameCard';
import { GrammarComparison } from './GrammarComparison';
import { GrammarOrder } from './GrammarOrder';
import { GrammarRow } from './GrammarText';
import { ConversationPractice } from './ConversationPractice';
import { SceneVisual, MnemonicSceneText } from './SceneVisual';
import { KeysSituationScene } from './KeysSituationScene';
import { SceneDelivery } from './GrammarSituation';
import { SpeechModelButton } from './SpeechModelButton';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useArcadeClock } from './useArcadeClock';
import { ArcadeClock } from './ArcadeClock';
import { ArcadePairs } from './ArcadePairs';
import { CausalKeyScene } from './CausalKeyScene';
import { CausalPhoneScene } from './CausalPhoneScene';
import { causalDiscoveryPresentation } from '../domain/causalDiscovery';
import { isAssociationRejected, rememberAssociationPreference } from '../domain/associationPreference';
import { MessageRepair } from './MessageRepair';
import { ExplainBack } from './ExplainBack';
import './keysSituation.css';

type Props = { unit: AtomicUnit; userId: string; appearance: Appearance; onToggleAppearance: () => void; syncStatus?: SyncStatus; onExit: () => void; onNext: () => void; inspection?: boolean; recallOnly?: boolean };
const freshSituation = (recallOnly = false): TrickCheckpoint => ({ stage: recallOnly ? keysSituationStages.indexOf('use') : 0, checkIndex: 0, checkId: recallOnly ? 'use' : 'key', input: '', feedback: 'idle', helped: false, episodeId: crypto.randomUUID(), episodeStartedAt: new Date().toISOString(), promptStartedAt: new Date().toISOString() });
/** One authored situation, existing checkpoint/journal/memory and interaction components. */
export function KeysSituationExperience(props: Props) {
  const prepared = prepareKeysSituation(props.unit);
  if (!prepared) return <main className="gate-screen"><section className="gate-card"><h1>Esta historia ha cambiado</h1><p>Tu progreso sigue guardado. Puedes seguir con las otras actividades.</p><button type="button" onClick={props.onExit}>Volver al recorrido</button></section></main>;
  return <PreparedSituation {...props} prepared={prepared} />;
}
function PreparedSituation({ unit, userId, appearance, onToggleAppearance, syncStatus, onExit, onNext, inspection = false, recallOnly = false, prepared }: Props & { prepared: NonNullable<ReturnType<typeof prepareKeysSituation>> }) {
  const version = situationCheckpointVersion(unit.id, unit.contentVersion ?? '1');
  const [state, setState] = useState<TrickCheckpoint>(() => {
    const saved = !inspection ? resumeKeysSituation(readTrickCheckpoint(userId, keysSituationId, version)) : null;
    const finished = saved && situationRunCompleted(userId, unit.id, unit.contentVersion ?? '1', saved);
    return saved && !finished ? saved : freshSituation(recallOnly);
  });
  const live = useRef(state); live.current = state;
  const stage = keysSituationStages[state.stage];
  const lock = useRef(false), completed = useRef(false);
  const speech = useSpeechPlayback();
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const [textRound, setTextRound] = useState(false);
  const [animated, setAnimated] = useState<string>();
  const [rejected, setRejected] = useState<string[]>(() => prepared.words.filter((word) => isAssociationRejected(userId, word)).map((word) => word.en));
  const discovered = stage === 'key' || stage === 'phone';
  const teaching = ['who', 'action', 'object'].includes(stage);
  const model = (state.checkFailures ?? 0) >= 2;
  const ready = discovered || teaching || state.feedback === 'correct' || model;
  const sound = stage === 'sound';
  const run = state.episodeId ?? state.episodeStartedAt ?? 'legacy';
  const eventId = (part: string) => `${keysSituationId}:${run}:${part}`;
  const soundAvailable = speech.audio?.status === 'ready';
  const clock = useArcadeClock(state.stage, state.feedback !== 'idle' || model, sound, () => {
    if (!soundAvailable || live.current.feedback !== 'idle') return;
    showModel('Tiempo terminado; queda pendiente de recuperación.');
  }, () => {}, 0, 10000, 0, calm || !soundAvailable || state.helped || textRound, true);
  function save(patch: Partial<TrickCheckpoint>) {
    const value = { ...live.current, ...patch }; live.current = value; setState(value);
    if (!inspection) writeTrickCheckpoint(userId, keysSituationId, version, value);
  }
  function restart() {
    stopSpeech(); speech.reset(); setAnimated(undefined); setTextRound(false); lock.current = false; completed.current = false;
    const value = freshSituation(); live.current = value; setState(value);
    if (!inspection) writeTrickCheckpoint(userId, keysSituationId, version, value);
  }
  useEffect(() => { if (!inspection) writeTrickCheckpoint(userId, keysSituationId, version, live.current); }, []);
  useEffect(() => { lock.current = false; setTextRound(stage === 'sound' && live.current.helped); speech.reset(); return () => stopSpeech(); }, [state.stage]);
  const prompt = stage === 'repair' ? `Repara: ${prepared.repair.pieces.map((part) => part.text).join(' ')}` : stage === 'meaning' ? prepared.keys.en : stage === 'change' ? 'Ahora buscas tu móvil.' : stage === 'sound' ? textRound ? 'PHONE significa…' : '¿Qué objeto has oído?' : prepared.keys.es;
  const record = (value: Partial<Parameters<typeof recordLearningActivity>[1]>) => !inspection ? recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: eventId(stage), skill: stage === 'sound' ? 'PHONE' : keysSituationSkill, phase: 'grammar', source: 'learner', modality: 'choice', prompt, response: '', expected: '', correct: null, helped: true, ...value }) : undefined;
  function advance() {
    if (!ready || lock.current && state.feedback !== 'correct' || live.current.stage !== state.stage || stage === 'use') return;
    lock.current = true; stopSpeech();
    save({ stage: state.stage + 1, checkId: keysSituationStages[state.stage + 1], input: '', feedback: 'idle', helped: false, checkFailures: 0, order: [], previousAttemptId: undefined, correctionResponse: undefined, reflection: undefined, promptStartedAt: new Date().toISOString() });
  }
  function answer(response: string, expected: string, phase: 'grammar' | 'construction' | 'transfer' | 'arcade', helped = true) {
    const current = live.current;
    if (lock.current || current.stage !== state.stage || current.feedback === 'correct' || (current.checkFailures ?? 0) >= 2 || clock.paused && sound) return false;
    const correct = normalizeSentenceAnswer(response) === normalizeSentenceAnswer(expected);
    const event = record({ response, expected, phase, correct, helped: helped || current.helped, parentAttemptId: current.previousAttemptId, responseDelayMs: current.promptStartedAt ? Math.max(0, Date.now() - Date.parse(current.promptStartedAt)) : undefined });
    if (correct) {
      lock.current = true; playSnap();
      if (!inspection && stage === 'build') { prepared.keys.slots.forEach((_, index) => recordChunkExposure(userId, unit.id, prepared.keys, index)); recordSentenceExposure(userId, unit.id, prepared.keys); }
      save({ input: response, feedback: 'correct', previousAttemptId: undefined });
    } else {
      const failures = Math.min(2, (current.checkFailures ?? 0) + 1);
      save({ input: response, feedback: 'help', helped: true, checkFailures: failures, previousAttemptId: event?.id });
      if (failures === 2) record({ activityId: `${keysSituationId}:${stage}:model`, source: 'authored', response: expected, correct: null, parentAttemptId: event?.id });
      if (failures === 2 && !inspection && (stage === 'build' || stage === 'change')) recordSentenceExposure(userId, unit.id, stage === 'build' ? prepared.keys : prepared.phone);
    }
    return true;
  }
  function showModel(reason = 'Modelo consultado; no es un acierto.') {
    if (live.current.stage !== state.stage || live.current.feedback === 'correct' || (live.current.checkFailures ?? 0) >= 2) return;
    record({ activityId: `${keysSituationId}:${stage}:model`, source: 'authored', response: stage === 'build' || stage === 'repair' ? prepared.keys.en : stage === 'sound' ? 'PHONE → móvil' : prepared.phone.en, correct: null, feedback: reason });
    if (!inspection && (stage === 'build' || stage === 'change')) recordSentenceExposure(userId, unit.id, stage === 'build' ? prepared.keys : prepared.phone);
    save({ helped: true, checkFailures: 2, feedback: 'help' });
  }
  function finish() {
    if (completed.current) return;
    completed.current = true;
    record({ activityId: `${keysSituationId}:completed:${run}`, phase: 'completion', source: 'learner', response: 'Historia practicada; recuerdo diferido pendiente.', correct: null, helped: false });
    if (!inspection) clearTrickCheckpoint(userId, keysSituationId);
    onNext();
  }
  const roomObject = ['phone', 'change', 'pairs', 'sound', 'use'].includes(stage) ? 'phone' : 'keys';
  const title = discovered ? 'Antes de salir' : teaching ? 'Descubre cómo decirlo' : stage === 'meaning' ? 'Entiende a Nora' : stage === 'build' ? 'Pide ayuda con las llaves' : stage === 'change' ? 'Cambia lo que buscas' : stage === 'repair' ? 'Arcade · detective de mensajes' : ['pairs', 'sound'].includes(stage) ? 'Arcade · encuentra la conexión' : 'Ahora lo dices tú';
  const teachingIndex = state.stage - 2;
  const word = prepared.words[stage === 'phone' ? 1 : 0];
  const exactKey = word.en === 'KEY' && word.bridge === 'KIWI' && word.scene === 'Un KIWI se traga tu LLAVE y huye rodando.';
  const causal = !rejected.includes(word.en) && (exactKey || causalDiscoveryPresentation(word)?.kind === 'phone-fondo');
  const showResult = state.feedback === 'correct' || model;
  const advanceLabel = ['Y ahora, el móvil', 'Cómo pedir ayuda', 'Añade lo que haces', 'Añade lo que buscas', 'Entiende el mensaje', 'Construye tu mensaje', 'Cambia lo que buscas', 'Entra en Arcade', 'Repara un mensaje', 'El oído decide', 'Úsalo sin piezas'][state.stage] ?? 'Sigue la historia';
  const pairRounds = prepared.words.map((word) => ({ unit, word, phrase: { en: prepared.keys.en, es: prepared.keys.es, key: '' }, options: [], due: false }));
  const pairClosed: Record<string, 'correct' | 'model'> = {};
  if (stage === 'pairs' && !inspection) for (const event of readLearningActivities(userId)) {
    const word = prepared.words.find((item) => event.activityId === eventId(`pairs:${item.en}`));
    if (word && event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1') && event.at >= (state.episodeStartedAt ?? '') && event.phase === 'arcade') pairClosed[normalizeSentenceAnswer(word.en)] = event.correct === true ? 'correct' : 'model';
  }
  const pairHelped = Object.values(pairClosed).includes('model');
  return <main className="game-screen play-flow situation-experience" data-play-tone={['pairs', 'repair', 'sound'].includes(stage) ? 'arcade' : teaching ? 'grammar' : stage === 'build' || stage === 'change' ? 'build' : 'associate'}>
    <PlayHeader title={title} progress={state.stage / (keysSituationStages.length - 1) * 100} onExit={onExit} appearance={appearance} onToggleAppearance={onToggleAppearance} syncStatus={syncStatus} inspection={inspection} additionalControls={<><button type="button" onClick={restart}>Reiniciar solo esta historia</button><small>Conserva tus palabras, intentos y recorrido anterior.</small></>} position="HISTORIA · ANTES DE SALIR" />
    <section className="game-stage">
    {stage === 'use' ? <ConversationPractice vertical unit={prepared.conversation} userId={userId} reviewMode={inspection} renderScene={(turn) => <KeysSituationScene object={turn.expected.en.includes("phone") ? "phone" : "keys"} />} checkpointScope={`${keysSituationId}:${run}`} skillId={keysSituationSkill} onWrittenResponse={(turn, correct, helped) => { if (!correct || !helped) { const sentence = turn.expected.en.includes('phone') ? prepared.phone : prepared.keys; recordSentenceRecall(userId, sentenceKey(unit.id, sentence), correct ? 'hesitant' : 'missed'); } }} onContinue={finish} /> : <GameCard key={`${run}:${stage}`} vertical stepKey={`${run}:${stage}`} feedback={state.feedback === 'correct' ? 'correct' : model ? 'model' : state.feedback === 'help' ? 'retry' : undefined} onAdvance={ready ? advance : undefined} advanceLabel={advanceLabel}>
      <div className="situation-episode-content">
        {discovered ? <>
          <p className="eyebrow">{stage === 'key' ? 'NO SALIMOS SIN LAS LLAVES' : 'Y TAMBIÉN NECESITAS EL MÓVIL'}</p>
          {rejected.includes(word.en) ? <KeysSituationScene object={word.en === 'KEY' ? 'keys' : 'phone'} found /> : causal ? <button type="button" className="situation-causal-control" aria-label={exactKey ? 'Haz que el kiwi se trague la llave' : 'Haz que el fondo se trague el móvil'} onClick={() => { setAnimated(word.en); record({ source: 'authored', activityId: `${keysSituationId}:${stage}:scene`, response: word.scene, correct: null }); }}>{exactKey ? <CausalKeyScene active={animated === word.en} /> : <CausalPhoneScene active={animated === word.en} />}<span>{exactKey ? 'Toca el kiwi' : 'Toca el bolsillo'}</span></button> : <SceneVisual word={word} />}
          <div className="situation-word"><h1 lang="en">{word.en}</h1><span>{word.es}</span></div>
          <SpeechModelButton key={stage} text={word.en} staticAudioId={word.audioUrl} label={`Escuchar ${word.en}`} idleLabel="Escuchar" />
          {!rejected.includes(word.en) ? <p className="situation-story"><MnemonicSceneText word={word} /></p> : null}
          <p className="situation-narrator">{stage === 'key' ? 'Nora está en la puerta. Vas a pedirle ayuda para encontrarlas.' : 'Dos objetos. Una misma forma de pedir ayuda.'}</p>
          {!rejected.includes(word.en) ? <button type="button" className="quiet-action" onClick={() => { setRejected((previous) => [...previous, word.en]); if (!inspection) rememberAssociationPreference(userId, word, true); }}>Esta asociación no me ayuda</button> : null}
        </> : <>
          {stage !== 'repair' ? <KeysSituationScene object={roomObject} found={showResult} /> : null}
          {stage === 'repair' ? <>
            <MessageRepair {...prepared.repair} position={state.order?.[0]} result={model ? 'model' : state.feedback === 'help' ? 'retry' : state.feedback === 'correct' ? 'correct' : 'idle'} onPosition={(position) => { if (live.current.stage === state.stage && live.current.feedback !== 'correct' && (live.current.checkFailures ?? 0) < 2) save({ order: [position] }); }} onAnswer={(value) => answer(value, prepared.repair.solution, 'arcade')} />
            {showResult ? <ExplainBack prompt="¿Para qué necesitas FOR aquí?" model="Aquí LOOKING FOR significa «buscando». Conserva FOR dentro de ese bloque." draft={state.reflection?.draft ?? ''} compared={state.reflection?.compared ?? false} onDraft={(draft) => { if (live.current.stage === state.stage) save({ reflection: { draft, compared: false } }); }} onCompare={() => {
              if (live.current.stage !== state.stage || live.current.reflection?.compared) return;
              const response = live.current.reflection?.draft.trim() ?? '';
              if (response) record({ activityId: eventId('explain-back'), phase: 'grammar', source: 'learner', modality: 'writing', prompt: '¿Para qué necesitas FOR aquí?', response, expected: '', correct: null, helped: true, feedback: 'Explicación libre comparada con el modelo; sin evaluación automática.' });
              record({ activityId: eventId('explain-back:model'), phase: 'grammar', source: 'authored', response: 'LOOKING FOR significa buscando en este mensaje.', correct: null });
              save({ reflection: { draft: response, compared: true } });
            }} /> : null}
          </> : null}
          {teaching ? <><p className="eyebrow">{stage === 'who' ? 'QUIÉN + CÓMO ESTÁ' : stage === 'action' ? 'LA ACCIÓN VIAJA EN UN BLOQUE' : 'EL OBJETO QUE NECESITAS'}</p><GrammarComparison connectPieces interactive step={prepared.teaching[teachingIndex]} previous={prepared.teaching[teachingIndex - 1]} /><p className="situation-trick">{prepared.teaching[teachingIndex].caption}</p><SpeechModelButton key={stage} text={prepared.teaching[teachingIndex].en.map((part) => part.text).join('')} idleLabel="Escuchar el mensaje" /></> : null}
          {stage === 'meaning' ? <><p className="eyebrow">NORA TE ENVÍA ESTE MENSAJE</p><h1>¿Qué necesita encontrar?</h1><SceneDelivery message={prepared.keys.en} selected={state.input} feedback={state.feedback} disabled={showResult} presentationKey={keysSituationId} onAnswer={(value) => answer(value, 'Sus llaves', 'grammar')} listenControl={<SpeechModelButton text={prepared.keys.en} idleLabel="Escuchar" />} options={[{ choice: 'Sus llaves', label: 'Sus llaves', visual: <span aria-hidden="true">🔑</span> }, { choice: 'Su móvil', label: 'Su móvil', visual: <span aria-hidden="true">📱</span> }]} instruction="Toca lo que está buscando." /></> : null}
          {stage === 'build' ? <><p className="eyebrow">NORA PUEDE AYUDARTE</p><h1>Estoy buscando mis llaves.</h1>{model ? <GrammarRow parts={prepared.teaching[2].en} language="en" /> : <GrammarOrder puzzle autoCheck pieces={prepared.pieces} selected={state.order ?? []} locked={state.feedback === 'correct'} onChange={(order) => save({ order })} onAnswer={(value) => answer(value, prepared.keys.en, 'construction')} />}<details className="situation-inline-help" onToggle={(event) => { if (event.currentTarget.open) { save({ helped: true }); record({ source: 'authored', activityId: `${keysSituationId}:build:help`, response: prepared.keys.en, correct: null }); } }}><summary>Cómo se construye</summary><GrammarRow parts={prepared.teaching[2].es} language="es" /><GrammarRow parts={prepared.teaching[2].en} language="en" /><p>Conserva LOOKING FOR junto: aquí significa «buscando».</p><SpeechModelButton text={prepared.keys.en} /></details></> : null}
          {stage === 'change' ? <><p className="eyebrow">MISMA ESTRUCTURA · OTRO OBJETO</p><h1>Ahora buscas tu móvil.</h1><p className="situation-scaffold" lang="en">I am looking for my <strong>{showResult ? 'phone' : '…'}</strong></p><div className="situation-object-choices">{['KEYS', 'PHONE'].map((value) => <button key={value} type="button" disabled={showResult} onClick={() => { const accepted = answer(value, 'PHONE', 'transfer'); if (accepted && value === 'PHONE' && !inspection) recordSentenceExposure(userId, unit.id, prepared.phone); }}>{value === 'KEYS' ? '🔑 ' : '📱 '}{value}</button>)}</div><p className="situation-trick">MY no cambia: mis llaves → MY KEYS; mi móvil → MY PHONE.</p>{showResult ? <SpeechModelButton text={prepared.phone.en} idleLabel="Escuchar tu nuevo mensaje" /> : null}</> : null}
          {stage === 'pairs' ? <ArcadePairs rounds={pairRounds} seed={0} paused={showResult} initialClosed={pairClosed} onPair={(target, chosen, correct) => {
            record({ activityId: eventId(`pairs:${target.word.en}`), skill: target.word.en, phase: 'arcade', prompt: target.word.en, response: chosen.word.es, expected: target.word.es, correct, helped: true });
            if (!inspection) recordWordRecall(userId, target.word, correct ? 'hesitant' : 'missed', new Date(), 'recognition', correct ? undefined : 'meaning', true);
            if (!correct) save({ helped: true });
          }} onModel={(target) => { record({ activityId: eventId(`pairs:${target.word.en}`), phase: 'arcade', source: 'authored', prompt: target.word.en, response: target.word.es, correct: null }); save({ helped: true }); }} onComplete={() => { const helped = live.current.helped || pairHelped; save({ feedback: helped ? 'help' : 'correct', checkFailures: helped ? 2 : 0 }); }} /> : null}
          {sound ? <><p className="eyebrow">ARCADE · EL OÍDO DECIDE</p><h1>{textRound ? 'PHONE significa…' : '¿Qué objeto has oído?'}</h1><button className="situation-listen" type="button" disabled={clock.paused} aria-busy={speech.audio?.status === 'preparing'} onClick={() => void speech.listen('phone', 'en', prepared.words[1].audioUrl)}>🔊 <span>{speech.label}</span></button><AssociationAudioStatus state={speech.audio} compact />{soundAvailable && !calm && !state.helped && !textRound ? <ArcadeClock durationMs={10000} remaining={clock.remaining} paused={clock.paused} revealed={showResult} /> : null}<div className="situation-object-choices">{['llave', 'móvil'].map((value) => <button type="button" key={value} disabled={showResult || clock.paused || !soundAvailable && !textRound} onClick={() => { if (!soundAvailable && !textRound) return; const accepted = answer(value, 'móvil', 'arcade'); if (accepted && !inspection) recordWordRecall(userId, prepared.words[1], value === 'móvil' ? 'hesitant' : 'missed', new Date(), textRound ? 'recognition' : 'auditory', value === 'móvil' ? undefined : textRound ? 'meaning' : 'auditory', true); }}>{value === 'llave' ? '🔑' : '📱'} {value}</button>)}</div><div className="situation-clock-options"><button type="button" onClick={clock.togglePause}>{clock.paused ? 'Reanudar' : 'Pausar'}</button><button type="button" aria-pressed={calm} onClick={() => { const next = !calm; setCalm(next); if (!inspection) writeArcadeCalm(userId, next); }}>{calm ? 'Activar reloj' : 'Sin reloj'}</button>{!textRound ? <button type="button" onClick={() => { speech.reset(); stopSpeech(); setTextRound(true); save({ helped: true }); }}>Jugar con texto</button> : null}</div></> : null}
          {stage === 'repair' ? state.feedback === 'help' && !model ? <p className="situation-reaction" role="status">Busca la unión LOOKING FOR. Puedes cambiar de sitio y probar otra pieza.</p> : null : state.feedback === 'correct' ? <p className="situation-reaction" role="status">{stage === 'build' ? 'Nora ya sabe qué buscar contigo.' : stage === 'change' ? 'Has cambiado el mensaje sin aprender otra estructura.' : '✓ Conexión encontrada'}</p> : state.feedback === 'help' ? <p className="situation-reaction" role="status">{stage === 'build' ? 'Quién: I AM. Acción: LOOKING FOR. Objeto: MY KEYS.' : stage === 'meaning' ? 'MY KEYS son mis llaves.' : stage === 'pairs' ? 'KEY es llave. PHONE es móvil.' : 'PHONE es móvil. Conserva el resto del mensaje.'}{model ? ' Puedes seguir con el modelo; queda pendiente.' : ''}</p> : null}
          {!teaching && state.feedback !== 'correct' && !model ? <button type="button" className="quiet-action" onClick={() => showModel()}>Ver una ayuda y seguir</button> : null}
        </>}
      </div>
    </GameCard>}
    </section>
  </main>;
}
