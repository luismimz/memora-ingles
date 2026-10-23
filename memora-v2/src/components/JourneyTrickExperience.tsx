import { useRef, useState } from 'react';
import { getUnitSentences, type AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { lessonForForm } from '../domain/grammarLesson';
import { contextualCorrection, readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { recordSession } from '../domain/learningProfile';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint, type TrickContinuationCheckpoint } from '../domain/trickCheckpoint';
import { GrammarCoach } from './GrammarCoach';
import { GameCard } from './GameCard';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import type { Appearance } from '../useAppearance';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readWordMemories, recordChunkExposure, recordSentenceExposure } from '../domain/memory';
import { preparedGrammarContinuation, preparedActionPractice } from '../domain/grammarContinuation';
import { conversationPracticeAnswers, demonstratedConversationQuestionSkills } from '../domain/conversation';
import { constructionFeedback } from '../domain/sentenceConstruction';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { ConversationPractice } from './ConversationPractice';
import { GrammarOrder } from './GrammarOrder';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';

export function JourneyTrickExperience({ unit, stop, userId, inspection, onFinished, onNext, onExit, nextLabel = 'Continuar jugando →', syncStatus, appearance, onToggleAppearance }: {
  unit: AtomicUnit; stop: UnitSummary; userId: string; inspection: boolean; onFinished: () => void; onNext: () => void; onExit: () => void;
  syncStatus: SyncStatus; appearance: Appearance; onToggleAppearance: () => void; nextLabel?: string;
}) {
  const trick = stop.routeTrick!;
  const form = unit.grammar.find((candidate) => candidate.id === trick.formId);
  const base = unit.words.find((word) => word.en.toLowerCase() === form?.englishBase?.toLowerCase())?.es.toLowerCase();
  const lesson = unit.grammarLesson?.id === trick.formId ? unit.grammarLesson : form ? lessonForForm(form, base) : null;
  const stream = Boolean(form && !form.lesson && lesson?.id === `present-continuous:${form.englishBase}` && (form.visualContract === 'present-continuous' || form.id === 'ing'));
  const sceneWord = unit.words.find((word) => word.en.toLowerCase() === form?.englishBase?.toLowerCase()) ?? unit.words[0];
  const practicedPattern = !inspection && form && !form.lesson && (form.visualContract === 'present-continuous' || form.id === 'ing')
    && readGrammarAttempts(userId).some((attempt) => attempt.skill.startsWith('present-continuous:') && attempt.skill !== trick.skill && attempt.kind === 'write' && attempt.correct && !attempt.helped);
  const [checkpoint] = useState(() => inspection ? null : readTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1'));
  // An old in-flight coach keeps its identified task/draft, even if an author
  // adds an episode later. Fresh entries opt in only with actual preparation.
  const [shortPractice] = useState(() => preparedActionPractice(unit, trick.formId, readWordMemories(userId)));
  const episodeUnit = shortPractice ?? unit;
  const episodeIdentity = shortPractice ? `${trick.formId}:short-${form!.english}-v1` : trick.formId;
  const [prepared] = useState(() => Boolean(shortPractice) || preparedGrammarContinuation(unit, trick.formId, readWordMemories(userId), readGrammarAttempts(userId)));
  const episode = prepared && (!checkpoint || checkpoint.episodeId === episodeIdentity);
  const coachState = useRef<TrickCheckpoint>(checkpoint ?? { stage: 0, checkIndex: 0, input: '', feedback: 'idle', helped: false });
  const [continuation, setContinuation] = useState<TrickContinuationCheckpoint | undefined>(checkpoint?.continuation);
  const sentences = getUnitSentences(episodeUnit);
  const sentence = sentences[continuation?.sentenceIndex ?? 0];
  const puzzleCheck = shortPractice ? lesson?.checks.find((check) => check.ordering) : undefined;
  const puzzlePieces = puzzleCheck?.ordering;
  const wholeOrder = useRef(continuation?.order ?? []);
  const unavailable = Boolean(checkpoint?.episodeId && !episode || continuation && (!episode || !sentence || continuation.filledSlots > sentence.slots.length || continuation.phase === 'conversation' && continuation.filledSlots !== sentence.slots.length || puzzlePieces && continuation.order?.some((index) => index >= puzzlePieces.length)));
  const chatAnswers = episode ? conversationPracticeAnswers(episodeUnit, demonstratedConversationQuestionSkills(readGrammarAttempts(userId))) : [];
  const slotKey = continuation ? `${continuation.phase}:${continuation.sentenceIndex}:${continuation.filledSlots}` : 'coach';
  const modelAid = useRef(Boolean(continuation?.modelUsed));
  const guard = useRef({ key: slotKey, failures: continuation?.failures ?? 0, placed: false });
  if (guard.current.key !== slotKey) { guard.current = { key: slotKey, failures: continuation?.failures ?? 0, placed: false }; modelAid.current = Boolean(continuation?.modelUsed); }
  const previousConstruction = useRef(continuation?.previousAttempt);
  const buildActivityId = `trick-build:${trick.formId}:${continuation?.sentenceIndex}:${shortPractice ? 'message' : continuation?.filledSlots}`;
  const lastError = continuation?.previousAttempt ? readLearningActivities(userId).find((event) => event.id === continuation.previousAttempt && event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1') && event.activityId === buildActivityId && event.correct === false && event.source === 'learner')?.response : undefined;
  const coachContinued = useRef(false);
  const advancedBuild = useRef<string>();
  const [finished, setFinished] = useState(false);
  const completed = useRef(false);
  const started = useRef(checkpoint?.episodeStartedAt ?? new Date().toISOString());
  function saveContinuation(value: TrickContinuationCheckpoint) {
    stopSpeech(); setContinuation(value);
    if (!inspection) writeTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1', { ...coachState.current, episodeId: episodeIdentity, episodeStartedAt: started.current, continuation: value });
  }
  function continueCoach() {
    if (coachContinued.current) return;
    coachContinued.current = true;
    if (episode) saveContinuation({ phase: 'build', sentenceIndex: 0, filledSlots: 0 });
    else finish();
  }
  function constructionAttempt(choice: string, correct: boolean, slotIndex: number): false | void {
    if (!continuation || !sentence || guard.current.key !== slotKey || guard.current.placed || guard.current.failures >= 2 || continuation.phase !== 'build' || slotIndex !== continuation.filledSlots || !sentence.slots[slotIndex]?.choices.includes(choice)) return false;
    guard.current.failures = correct ? 0 : guard.current.failures + 1;
    if (!inspection) {
      const slot = sentence.slots[slotIndex];
      const attempt = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build:${trick.formId}:${continuation.sentenceIndex}:${slotIndex}`, skill: trick.skill, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, parentAttemptId: previousConstruction.current, feedback: constructionFeedback(sentence, slotIndex, choice, unit.words) });
      previousConstruction.current = correct ? undefined : attempt.id;
    }
    saveContinuation({ ...continuation, failures: guard.current.failures, previousAttempt: previousConstruction.current });
  }
  function placeSlot(withModel = false) {
    if (shortPractice) { placeWholeMessage(withModel); return; }
    if (!continuation || !sentence || continuation.phase !== 'build' || continuation.filledSlots >= sentence.slots.length || guard.current.key !== slotKey || guard.current.placed || (withModel ? guard.current.failures < 2 : guard.current.failures >= 2)) return;
    guard.current.placed = true;
    modelAid.current ||= withModel;
    if (!inspection) {
      const slot = sentence.slots[continuation.filledSlots];
      if (withModel) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build-model:${trick.formId}:${continuation.sentenceIndex}:${continuation.filledSlots}`, skill: trick.skill, phase: 'construction', source: 'authored', modality: 'choice', prompt: slot.es, response: slot.en, expected: '', correct: null, helped: true, parentAttemptId: previousConstruction.current, feedback: 'Pieza colocada con modelo; no es un acierto.' });
      recordChunkExposure(userId, unit.id, sentence, continuation.filledSlots);
      if (continuation.filledSlots === sentence.slots.length - 1) recordSentenceExposure(userId, unit.id, sentence);
    }
    previousConstruction.current = undefined;
    saveContinuation({ ...continuation, filledSlots: continuation.filledSlots + 1, failures: 0, previousAttempt: undefined, modelUsed: modelAid.current });
  }
  function answerWholeMessage(value: string) {
    if (!continuation || !sentence || !puzzlePieces || continuation.phase !== 'build' || continuation.filledSlots !== 0 || guard.current.key !== slotKey || guard.current.placed || guard.current.failures >= 2) return;
    const correct = normalizeSentenceAnswer(value) === normalizeSentenceAnswer(sentence.en);
    if (!inspection) {
      const attempt = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: buildActivityId, skill: trick.skill, phase: 'construction', source: 'learner', modality: 'choice', prompt: sentence.es, response: value, expected: sentence.en, correct, helped: true, parentAttemptId: previousConstruction.current, feedback: correct ? 'Mensaje montado con piezas; no es escritura independiente.' : contextualCorrection(value, sentence.en, puzzleCheck!.hint) });
      previousConstruction.current = correct ? undefined : attempt.id;
    }
    if (correct) { placeWholeMessage(); return; }
    guard.current.failures++;
    saveContinuation({ ...continuation, order: wholeOrder.current, failures: guard.current.failures, previousAttempt: previousConstruction.current, modelUsed: modelAid.current });
  }
  function placeWholeMessage(withModel = false) {
    if (!continuation || !sentence || !puzzlePieces || continuation.phase !== 'build' || guard.current.key !== slotKey || guard.current.placed || continuation.filledSlots !== 0 || (withModel ? guard.current.failures < 2 : guard.current.failures >= 2)) return;
    guard.current.placed = true;
    modelAid.current ||= withModel;
    if (withModel) wholeOrder.current = ['subject', 'auxiliary', 'verb'].map((role) => puzzlePieces.findIndex((piece) => piece.role === role));
    if (!inspection) {
      if (withModel) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build-model:${trick.formId}:${continuation.sentenceIndex}:message`, skill: trick.skill, phase: 'construction', source: 'authored', modality: 'choice', prompt: sentence.es, response: sentence.en, expected: '', correct: null, helped: true, parentAttemptId: previousConstruction.current, feedback: 'Mensaje colocado con modelo, sin acierto ficticio.' });
      sentence.slots.forEach((_, index) => recordChunkExposure(userId, unit.id, sentence, index));
      recordSentenceExposure(userId, unit.id, sentence);
    }
    previousConstruction.current = undefined;
    saveContinuation({ ...continuation, order: wholeOrder.current, filledSlots: sentence.slots.length, failures: 0, previousAttempt: undefined, modelUsed: modelAid.current });
    playSnap(); void playEnglish(sentence.en);
  }
  function listenToConstructionModel() {
    if (!continuation || !sentence || continuation.phase !== 'build' || continuation.filledSlots !== 0 || guard.current.key !== slotKey || guard.current.placed) return;
    modelAid.current = true;
    saveContinuation({ ...continuation, modelUsed: true });
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build-audio:${trick.formId}:${continuation.sentenceIndex}`, skill: trick.skill, phase: 'construction', source: 'authored', modality: 'choice', prompt: sentence.es, response: 'Modelo solicitado como ayuda; no acredita escucha.', expected: '', correct: null, helped: true, parentAttemptId: previousConstruction.current });
    void playEnglish(sentence.en);
  }
  function nextBuild() {
    if (!continuation || !sentence || continuation.phase !== 'build' || continuation.filledSlots !== sentence.slots.length || advancedBuild.current === slotKey) return;
    advancedBuild.current = slotKey;
    previousConstruction.current = undefined;
    saveContinuation(continuation.sentenceIndex + 1 < sentences.length ? { phase: 'build', sentenceIndex: continuation.sentenceIndex + 1, filledSlots: 0, modelUsed: continuation.modelUsed } : { ...continuation, phase: 'conversation', previousAttempt: undefined });
  }
  function finish() {
    if (completed.current) return;
    completed.current = true;
    stopSpeech();
    if (!inspection) {
      // Attempts stay attached to the real source unit, not a fictitious Directus record.
      const now = new Date().toISOString();
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-completed:${trick.formId}`, skill: trick.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: trick.title, response: 'Truco practicado con palabras preparadas.', expected: '', correct: null, helped: false });
      const attempts = readLearningActivities(userId).filter((activity) => activity.unitId === unit.id && activity.skill === trick.skill && activity.at >= started.current && activity.source === 'learner' && activity.correct !== null);
      recordSession(userId, { unitId: unit.id, completedAt: now, correct: attempts.filter((activity) => activity.correct).length, attempted: attempts.length });
      clearTrickCheckpoint(userId, stop.id);
      onFinished();
    }
    setFinished(true);
  }
  return <main className="game-screen journey-trick">
    <header className="game-topbar"><button type="button" className="activity-back" onClick={() => { stopSpeech(); onExit(); }}>← Recorrido</button><span>✦ PARADA TRUCO</span><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button></header>
    <p className="mirror-save" role="status">{inspection ? 'Vista de prueba · no guarda progreso' : syncLabels[syncStatus]}</p>
    {!finished && lesson ? <h1 className="sr-only">{trick.title}</h1> : null}
    <section className="game-stage">{!lesson || unavailable ? <GameCard><h1>Esta escena necesita preparación.</h1><p>Tu progreso se conserva. Puedes seguir con las palabras.</p><button type="button" onClick={onNext}>Continuar con las palabras →</button></GameCard> : finished ? <GameCard vertical={stream || episode} stepKey="completed" onAdvance={stream || episode ? onNext : undefined} advanceLabel={nextLabel} className="complete-card"><div className="complete-content"><div className="reward-burst" aria-hidden="true">✦</div><p className="eyebrow">UNA PIEZA MÁS</p><h1>¡Tus palabras ya dicen algo nuevo!</h1><p>{trick.title}</p><p>Una práctica, no una promesa de dominio. Tus intentos quedan en Mi evolución.</p>{!stream && !episode ? <button type="button" className="primary-action" onClick={onNext}>{nextLabel}</button> : null}{!stream && !episode ? <button type="button" className="quiet-action" onClick={onExit}>Terminar por hoy</button> : null}</div></GameCard>
      : continuation?.phase === 'conversation' ? <ConversationPractice vertical unit={episodeUnit} userId={userId} reviewMode={inspection} checkpointScope={`trick:${episodeIdentity}`} skillId={trick.skill} initialHelped={Boolean(continuation.modelUsed)} onContinue={finish} />
      : continuation?.phase === 'build' && puzzlePieces ? <GameCard vertical stepKey={`message:${continuation.filledSlots}:${continuation.failures ?? 0}`} className="coach-card coach-stream coach-situation-card" onAdvance={continuation.filledSlots === sentence.slots.length ? nextBuild : undefined} advanceLabel="Usar mi mensaje en la conversación"><div className="coach-content"><p className="eyebrow">MONTA EL MENSAJE</p><h2>{sentence.es}</h2>{(continuation.failures ?? 0) >= 2 ? <div className="grammar-repair-model" role="status"><p>Vamos con ayuda. Este es el mensaje:</p><p className="coach-row" lang="en">{sentence.en}</p><button type="button" className="primary-action" onClick={() => placeWholeMessage(true)}>Colocar con ayuda</button></div> : <GrammarOrder puzzle pieces={puzzlePieces} selected={continuation.order ?? []} locked={continuation.filledSlots === sentence.slots.length} onChange={(order) => { if (continuation.filledSlots !== 0 || guard.current.placed || guard.current.key !== slotKey) return; wholeOrder.current = order; saveContinuation({ ...continuation, order, modelUsed: modelAid.current }); }} onAnswer={answerWholeMessage} />}{continuation.filledSlots === 0 && (continuation.failures ?? 0) < 2 ? <details className="coach-tools"><summary>Necesito una pista</summary><button type="button" className="quiet-action" onClick={listenToConstructionModel}>Escuchar modelo</button></details> : null}<p className="coach-feedback" role="status">{continuation.filledSlots === sentence.slots.length ? continuation.modelUsed ? 'Mensaje con modelo. Tu intento queda pendiente; ahora puedes usarlo.' : 'Mensaje montado. Ahora avisa al personaje sin piezas.' : lastError ? contextualCorrection(lastError, sentence.en, puzzleCheck!.hint) : 'Toca o mueve las piezas; puedes cambiar su posición.'}</p></div></GameCard>
      : continuation?.phase === 'build' && form ? <SentenceBuilderCard vertical key={`build-${continuation.sentenceIndex}`} sentence={sentence} vocabulary={unit.words} sceneWord={sceneWord} processForm={form} index={continuation.sentenceIndex} total={sentences.length} filledSlots={continuation.filledSlots} choiceSeed={continuation.sentenceIndex} needsModel={(continuation.failures ?? 0) >= 2} lastIncorrectChoice={lastError} onAcceptModel={() => placeSlot(true)} onAttempt={constructionAttempt} onPick={() => placeSlot()} onNext={nextBuild} />
      : <GrammarCoach lesson={lesson} form={form} sceneWord={sceneWord} startAtPractice={Boolean(practicedPattern)} startAtExample={Boolean(practicedPattern) && stream} omitGeneratedExplanation={Boolean(practicedPattern)} conversationAnswers={chatAnswers} constructionAnswers={episode ? sentences.map((item) => item.en) : []} userId={userId} unitId={unit.id} unitTitle={unit.title} contentVersion={unit.contentVersion ?? '1'} reviewMode={inspection} requirePractice schedulePractice repairLimit={2} puzzle={stream} checkpoint={checkpoint} onProgress={(state) => {
        coachState.current = { ...state, ...(episode ? { episodeId: episodeIdentity, episodeStartedAt: started.current } : {}) };
        if (!inspection && !completed.current) writeTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1', coachState.current);
      }} onReady={() => {}} onContinue={continueCoach} />}</section>
  </main>;
}
