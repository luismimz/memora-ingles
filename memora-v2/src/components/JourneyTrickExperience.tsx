import { useEffect, useRef, useState } from 'react';
import { getUnitSentences, type AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { lessonForForm } from '../domain/grammarLesson';
import { contextualCorrection, readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { recordSession } from '../domain/learningProfile';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint, type TrickContinuationCheckpoint } from '../domain/trickCheckpoint';
import { GrammarCoach } from './GrammarCoach';
import { GameCard } from './GameCard';
import { SpeechModelButton } from './SpeechModelButton';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import type { SyncStatus } from '../services/progressSync';
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
import { PlayHeader } from './PlayHeader';
import { PracticeClosure } from './PracticeClosure';
import { preparedSearchKeysPractice, searchKeysIdentity, searchKeysLesson, searchKeysSkill } from '../domain/searchKeysPractice';
import { bedMakingIdentity, bedMakingLesson, bedMakingSkill, preparedBedMakingPractice } from '../domain/bedMakingPractice';
import { computerPlayingIdentity, computerPlayingSkill, preparedComputerPlayingPractice } from '../domain/computerPlayingPractice';
import { deskLocationIdentity, deskLocationSkill, preparedDeskLocationPractice } from '../domain/deskLocationPractice';
import { dinnerCookingIdentity, dinnerCookingSkill, preparedDinnerCookingPractice } from '../domain/dinnerCookingPractice';
import { kitchenLocationIdentity, kitchenLocationSkill, preparedKitchenLocationPractice } from '../domain/kitchenLocationPractice';
import { teethBrushingIdentity, teethBrushingSkill, preparedTeethBrushingPractice } from '../domain/teethBrushingPractice';
import { mirrorLocationIdentity, mirrorLocationSkill, preparedMirrorLocationPractice } from '../domain/mirrorLocationPractice';
import { dogWalkingIdentity, dogWalkingSkill, preparedDogWalkingPractice } from '../domain/dogWalkingPractice';
import { treeLocationIdentity, treeLocationSkill, preparedTreeLocationPractice } from '../domain/treeLocationPractice';
import { meatCookingIdentity, meatCookingSkill, meatCookingLesson, preparedMeatCookingPractice, meatCookingPreparation, type MeatPreparationTarget } from '../domain/meatCookingPractice';
import './preparationNotice.css';

export function JourneyTrickExperience({ unit, stop, preparationSources = [], onPrepare, userId, inspection, onFinished, onNext, onExit, continuous = false, nextLabel = 'Continuar jugando →', syncStatus, appearance, onToggleAppearance }: {
  unit: AtomicUnit; stop: UnitSummary; userId: string; inspection: boolean; onFinished: () => void; onNext: () => void; onExit: () => void;
  syncStatus: SyncStatus; appearance: Appearance; onToggleAppearance: () => void; nextLabel?: string; continuous?: boolean;
  preparationSources?: readonly UnitSummary[];
  onPrepare?: (target: MeatPreparationTarget) => void;
}) {
  const routeTrick = stop.routeTrick!;
  const form = unit.grammar.find((candidate) => candidate.id === routeTrick.formId);
  const base = unit.words.find((word) => word.en.toLowerCase() === form?.englishBase?.toLowerCase())?.es.toLowerCase();
  const legacyLesson = unit.grammarLesson?.id === routeTrick.formId ? unit.grammarLesson : form ? lessonForForm(form, base) : null;
  const [checkpoint] = useState(() => inspection ? null : readTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1'));
  const [authoredPractice] = useState(() => {
    const memories = readWordMemories(userId);
    const meat = !checkpoint || checkpoint.episodeId === meatCookingIdentity ? preparedMeatCookingPractice(unit, routeTrick.formId, memories, readGrammarAttempts(userId), preparationSources) : null;
    if (meat) return { ...meat, identity: meatCookingIdentity, modelOrder: [2, 3, 1, 0] };
    const tree = !checkpoint || checkpoint.episodeId === treeLocationIdentity ? preparedTreeLocationPractice(unit, routeTrick.formId, memories, readGrammarAttempts(userId)) : null;
    if (tree) return { ...tree, identity: treeLocationIdentity, modelOrder: [3, 4, 2, 1, 0] };
    const dog = !checkpoint || checkpoint.episodeId === dogWalkingIdentity ? preparedDogWalkingPractice(unit, routeTrick.formId, memories) : null;
    if (dog) return { ...dog, identity: dogWalkingIdentity, modelOrder: [2, 3, 1, 0] };
    const mirror = !checkpoint || checkpoint.episodeId === mirrorLocationIdentity ? preparedMirrorLocationPractice(unit, routeTrick.formId, memories, readGrammarAttempts(userId)) : null;
    if (mirror) return { ...mirror, identity: mirrorLocationIdentity, modelOrder: [3, 4, 2, 1, 0] };
    const teeth = !checkpoint || checkpoint.episodeId === teethBrushingIdentity ? preparedTeethBrushingPractice(unit, routeTrick.formId, memories) : null;
    if (teeth) return { ...teeth, identity: teethBrushingIdentity, modelOrder: [2, 3, 1, 0] };
    const kitchen = !checkpoint || checkpoint.episodeId === kitchenLocationIdentity ? preparedKitchenLocationPractice(unit, routeTrick.formId, memories, readGrammarAttempts(userId)) : null;
    if (kitchen) return { ...kitchen, identity: kitchenLocationIdentity, modelOrder: [2, 3, 1, 0] };
    const dinner = !checkpoint || checkpoint.episodeId === dinnerCookingIdentity ? preparedDinnerCookingPractice(unit, routeTrick.formId, memories) : null;
    if (dinner) return { ...dinner, identity: dinnerCookingIdentity, modelOrder: [2, 3, 1, 0] };
    const search = !checkpoint || checkpoint.episodeId === searchKeysIdentity ? preparedSearchKeysPractice(unit, routeTrick.formId, memories) : null;
    if (search) return { ...search, identity: searchKeysIdentity, modelOrder: [3, 4, 2, 0, 1] };
    const bed = !checkpoint || checkpoint.episodeId === bedMakingIdentity ? preparedBedMakingPractice(unit, routeTrick.formId, memories) : null;
    if (bed) return { ...bed, identity: bedMakingIdentity, modelOrder: [3, 4, 2, 1, 0] };
    const desk = !checkpoint || checkpoint.episodeId === deskLocationIdentity ? preparedDeskLocationPractice(unit, routeTrick.formId, memories, readGrammarAttempts(userId)) : null;
    if (desk) return { ...desk, identity: deskLocationIdentity, modelOrder: [2, 3, 1, 0] };
    const computer = !checkpoint || checkpoint.episodeId === computerPlayingIdentity ? preparedComputerPlayingPractice(unit, routeTrick.formId, memories) : null;
    return computer ? { ...computer, identity: computerPlayingIdentity, modelOrder: [2, 3, 1, 0] } : null;
  });
  const lesson = authoredPractice?.lesson ?? legacyLesson;
  const trick = { ...routeTrick, skill: lesson?.id ?? routeTrick.skill, title: authoredPractice ? authoredPractice.lesson.title : routeTrick.title };
  const stream = Boolean(authoredPractice || form && !form.lesson && lesson?.id === `present-continuous:${form.englishBase}` && (form.visualContract === 'present-continuous' || form.id === 'ing'));
  const sceneWord = unit.words.find((word) => word.en.toLowerCase() === form?.englishBase?.toLowerCase()) ?? unit.words[0];
  const practicedPattern = !inspection && form && !form.lesson && (form.visualContract === 'present-continuous' || form.id === 'ing')
    && readGrammarAttempts(userId).some((attempt) => attempt.skill.startsWith('present-continuous:') && attempt.skill !== trick.skill && attempt.kind === 'write' && attempt.correct && !attempt.helped);
  const reuseSubject = Boolean(authoredPractice && !inspection && readGrammarAttempts(userId).some((attempt) => (attempt.skill.startsWith('present-continuous:') || [searchKeysSkill, bedMakingSkill, computerPlayingSkill, deskLocationSkill, dinnerCookingSkill, kitchenLocationSkill, teethBrushingSkill, mirrorLocationSkill, dogWalkingSkill, treeLocationSkill, meatCookingSkill].includes(attempt.skill)) && attempt.kind === 'write' && attempt.correct && !attempt.helped));
  // An old in-flight coach keeps its identified task/draft, even if an author
  // adds an episode later. Fresh entries opt in only with actual preparation.
  const [shortPractice] = useState(() => authoredPractice?.unit ?? preparedActionPractice(unit, trick.formId, readWordMemories(userId)));
  const episodeUnit = shortPractice ?? unit;
  const episodeIdentity = authoredPractice?.identity ?? (shortPractice ? `${trick.formId}:short-${form!.english}-v1` : trick.formId);
  const [prepared] = useState(() => Boolean(shortPractice) || preparedGrammarContinuation(unit, trick.formId, readWordMemories(userId), readGrammarAttempts(userId)));
  const episode = prepared && (!checkpoint || checkpoint.episodeId === episodeIdentity);
  const coachState = useRef<TrickCheckpoint>(checkpoint ?? { stage: 0, checkIndex: 0, input: '', feedback: 'idle', helped: false });
  const [continuation, setContinuation] = useState<TrickContinuationCheckpoint | undefined>(checkpoint?.continuation);
  const sentences = getUnitSentences(episodeUnit);
  const sentence = sentences[continuation?.sentenceIndex ?? 0];
  const puzzleCheck = shortPractice ? lesson?.checks.find((check) => check.ordering) : undefined;
  const puzzlePieces = puzzleCheck?.ordering;
  const wholeOrder = useRef(continuation?.order ?? []);
  const unavailable = Boolean(!checkpoint && !authoredPractice && (searchKeysLesson(unit, trick.formId) || bedMakingLesson(unit, trick.formId) || meatCookingLesson(unit, trick.formId)) || checkpoint?.episodeId && !episode || continuation && (!episode || !sentence || continuation.filledSlots > sentence.slots.length || continuation.phase === 'conversation' && continuation.filledSlots !== sentence.slots.length || puzzlePieces && continuation.order?.some((index) => index >= puzzlePieces.length)));
  const chatAnswers = episode ? conversationPracticeAnswers(episodeUnit, demonstratedConversationQuestionSkills(readGrammarAttempts(userId))) : [];
  const slotKey = continuation ? `${continuation.phase}:${continuation.sentenceIndex}:${continuation.filledSlots}` : 'coach';
  const preparationLength = sentence?.slots[continuation?.filledSlots ?? 0]?.preparation?.length ?? 0;
  const savedPreparation = continuation?.preparationStep ?? 0;
  const preparationStep = Number.isInteger(savedPreparation) && savedPreparation >= 0 && savedPreparation <= preparationLength ? savedPreparation : 0;
  const modelAid = useRef(Boolean(continuation?.modelUsed));
  const guard = useRef({ key: slotKey, failures: continuation?.failures ?? 0, preparationStep, placed: false });
  if (guard.current.key !== slotKey) { guard.current = { key: slotKey, failures: continuation?.failures ?? 0, preparationStep, placed: false }; modelAid.current = Boolean(continuation?.modelUsed); }
  const previousConstruction = useRef(continuation?.previousAttempt);
  const buildActivityId = `trick-build:${trick.formId}:${continuation?.sentenceIndex}:${shortPractice ? 'message' : continuation?.filledSlots}`;
  const lastError = continuation?.previousAttempt ? readLearningActivities(userId).find((event) => event.id === continuation.previousAttempt && event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1') && event.activityId === buildActivityId && event.correct === false && event.source === 'learner')?.response : undefined;
  const coachContinued = useRef(false);
  const advancedBuild = useRef<string>();
  const [finished, setFinished] = useState(false);
  const completed = useRef(false);
  const continued = useRef(false);
  useEffect(() => () => { stopSpeech(); }, []);
  useEffect(() => {
    if (!finished || !continuous || inspection || continued.current) return;
    continued.current = true;
    onNext();
  }, [finished, continuous, inspection, onNext]);
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
  function prepareConstructionStep(step: number) {
    if (!continuation || continuation.phase !== 'build' || guard.current.key !== slotKey || guard.current.placed || !Number.isSafeInteger(step) || step !== guard.current.preparationStep + 1 || step > preparationLength) return;
    guard.current.preparationStep = step;
    saveContinuation({ ...continuation, preparationStep: step });
  }
  function constructionAttempt(choice: string, correct: boolean, slotIndex: number): false | void {
    if (!continuation || !sentence || guard.current.key !== slotKey || guard.current.placed || guard.current.preparationStep < preparationLength || guard.current.failures >= 2 || continuation.phase !== 'build' || slotIndex !== continuation.filledSlots || !sentence.slots[slotIndex]?.choices.includes(choice)) return false;
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
    if (!continuation || !sentence || continuation.phase !== 'build' || continuation.filledSlots >= sentence.slots.length || guard.current.key !== slotKey || guard.current.placed || guard.current.preparationStep < preparationLength || (withModel ? guard.current.failures < 2 : guard.current.failures >= 2)) return;
    guard.current.placed = true;
    modelAid.current ||= withModel;
    if (!inspection) {
      const slot = sentence.slots[continuation.filledSlots];
      if (withModel) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build-model:${trick.formId}:${continuation.sentenceIndex}:${continuation.filledSlots}`, skill: trick.skill, phase: 'construction', source: 'authored', modality: 'choice', prompt: slot.es, response: slot.en, expected: '', correct: null, helped: true, parentAttemptId: previousConstruction.current, feedback: 'Pieza colocada con modelo; no es un acierto.' });
      recordChunkExposure(userId, unit.id, sentence, continuation.filledSlots);
      if (continuation.filledSlots === sentence.slots.length - 1) recordSentenceExposure(userId, unit.id, sentence);
    }
    previousConstruction.current = undefined;
    saveContinuation({ ...continuation, filledSlots: continuation.filledSlots + 1, preparationStep: 0, failures: 0, previousAttempt: undefined, modelUsed: modelAid.current });
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
    if (withModel) wholeOrder.current = authoredPractice?.modelOrder ?? ['subject', 'auxiliary', 'verb'].map((role) => puzzlePieces.findIndex((piece) => piece.role === role));
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
    // Save help synchronously; SpeechModelButton starts voice only after this guard accepts.
    if (!continuation || !sentence || continuation.phase !== 'build' || continuation.filledSlots !== 0 || guard.current.key !== slotKey || guard.current.placed) return false;
    modelAid.current = true;
    saveContinuation({ ...continuation, order: wholeOrder.current, modelUsed: true });
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-build-audio:${trick.formId}:${continuation.sentenceIndex}`, skill: trick.skill, phase: 'construction', source: 'authored', modality: 'choice', prompt: sentence.es, response: 'Modelo solicitado como ayuda; no acredita escucha.', expected: '', correct: null, helped: true, parentAttemptId: previousConstruction.current });
    return true;
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
  const preparation = meatCookingLesson(unit, trick.formId) && (!lesson || unavailable)
    ? meatCookingPreparation(unit, trick.formId, readWordMemories(userId), readGrammarAttempts(userId), preparationSources) : null;
  if (preparation && preparation.status !== 'ready') return <main className={`game-screen journey-trick${!inspection ? ' play-flow' : ''}`}>
    <PlayHeader title="Prepara tu siguiente mensaje" onExit={() => { stopSpeech(); onExit(); }} appearance={appearance} onToggleAppearance={onToggleAppearance} syncStatus={syncStatus} inspection={inspection} />
    <section className="game-stage"><GameCard className="preparation-card"><div className="preparation-content"><h1>Un paso antes de cocinar carne</h1><p>{preparation.caption}</p>
      <div className="preparation-actions">
      {preparation.target && onPrepare ? <button type="button" className="primary-action" onClick={() => { stopSpeech(); onPrepare(preparation.target!); }}>{preparation.target.label}</button> : null}
      <button type="button" className="quiet-action" onClick={onNext}>Seguir con otras palabras →</button>
      </div>
    </div></GameCard></section>
  </main>;
  return <main className={`game-screen journey-trick${!inspection ? ' play-flow' : ''}`}>
    <PlayHeader title={finished ? 'Objetivo practicado' : continuation?.phase === 'build' ? continuation.filledSlots === sentence?.slots.length ? 'Mensaje armado' : 'Monta tu mensaje' : continuation?.phase === 'conversation' ? 'Conversación' : authoredPractice?.lesson.title ?? 'Descubre cómo decirlo'} onExit={() => { stopSpeech(); onExit(); }} appearance={appearance} onToggleAppearance={onToggleAppearance} syncStatus={syncStatus} inspection={inspection} trail={episode && !unavailable ? { steps: ['Descubre', 'Monta', 'Conversa', 'Tu práctica'], current: finished ? 3 : continuation?.phase === 'build' ? 1 : continuation?.phase === 'conversation' ? 2 : 0 } : undefined} />
    {!finished && lesson ? <h1 className="sr-only">{trick.title}</h1> : null}
    <section className="game-stage">{!lesson || unavailable ? <GameCard className="preparation-card"><div className="preparation-content"><h1>Esta escena necesita preparación.</h1><p>Tu progreso se conserva. Puedes seguir con las palabras.</p><div className="preparation-actions"><button type="button" className="primary-action" onClick={onNext}>Continuar con las palabras →</button></div></div></GameCard> : finished && continuous && !inspection ? <GameCard vertical onAdvance={onNext} advanceLabel={nextLabel}><p role="status">Continuando…</p></GameCard> : finished ? <GameCard vertical={stream || episode} stepKey="completed" onAdvance={stream || episode ? onNext : undefined} advanceLabel={nextLabel} className="complete-card"><div className="complete-content"><div className="reward-burst" aria-hidden="true">✦</div><p className="eyebrow">UNA PIEZA MÁS</p><h1>¡Tus palabras ya dicen algo nuevo!</h1><p>{trick.title}</p><p>Una práctica, no una promesa de dominio. Tus intentos quedan en Mi evolución.</p><PracticeClosure nextLabel={nextLabel} onContinue={stream || episode ? undefined : onNext} onExit={onExit} /></div></GameCard>
      : continuation?.phase === 'conversation' ? <ConversationPractice vertical unit={episodeUnit} userId={userId} reviewMode={inspection} checkpointScope={`trick:${episodeIdentity}`} skillId={trick.skill} initialHelped={Boolean(continuation.modelUsed)} onContinue={finish} />
      : continuation?.phase === 'build' && puzzlePieces ? <GameCard vertical stepKey={`message:${continuation.filledSlots}:${continuation.failures ?? 0}`} className="coach-card coach-stream coach-situation-card" onAdvance={continuation.filledSlots === sentence.slots.length ? nextBuild : undefined} advanceLabel="Usar mi mensaje en la conversación">
        <div className="coach-content">
          <p className="eyebrow">{continuation.filledSlots === sentence.slots.length ? continuation.modelUsed ? 'MENSAJE CON MODELO' : '✓ MENSAJE ARMADO' : 'MONTA EL MENSAJE'}</p>
          <h2>{sentence.es}</h2>
          {continuation.filledSlots === sentence.slots.length ? <>
            <p className="coach-row" lang="en">{sentence.en}</p>
            <SpeechModelButton key={`${episodeIdentity}:${continuation.sentenceIndex}:result`} text={sentence.en} label="Escuchar el mensaje" />
          </> : (continuation.failures ?? 0) >= 2 ? <div className="grammar-repair-model" role="status">
            <p>Vamos con ayuda. Este es el mensaje:</p>
            <p className="coach-row" lang="en">{sentence.en}</p>
            <SpeechModelButton key={`${episodeIdentity}:${continuation.sentenceIndex}:repair`} text={sentence.en} label="Escuchar modelo" onRequest={listenToConstructionModel} />
            <button type="button" className="primary-action" onClick={() => placeWholeMessage(true)}>Colocar con ayuda</button>
          </div> : <GrammarOrder puzzle pieces={puzzlePieces} selected={continuation.order ?? []} locked={continuation.filledSlots === sentence.slots.length}
            onChange={(order) => {
              if (continuation.filledSlots !== 0 || guard.current.placed || guard.current.key !== slotKey) return;
              wholeOrder.current = order;
              saveContinuation({ ...continuation, order, modelUsed: modelAid.current });
            }} onAnswer={answerWholeMessage} />}
          {continuation.filledSlots === 0 && (continuation.failures ?? 0) < 2 ? <details className="coach-tools">
            <summary>Necesito una pista</summary>
            <SpeechModelButton key={`${episodeIdentity}:${continuation.sentenceIndex}:construction`} text={sentence.en} label="Escuchar modelo" onRequest={listenToConstructionModel} />
          </details> : null}
          {continuation.filledSlots !== sentence.slots.length && lastError ? <p className="coach-feedback" role="status">{contextualCorrection(lastError, sentence.en, puzzleCheck!.hint)}</p> : null}
        </div>
      </GameCard>
      : continuation?.phase === 'build' && form ? <SentenceBuilderCard vertical key={`build-${continuation.sentenceIndex}`} sentence={sentence} vocabulary={unit.words} sceneWord={sceneWord} processForm={form} index={continuation.sentenceIndex} total={sentences.length} filledSlots={continuation.filledSlots} choiceSeed={continuation.sentenceIndex} preparationStep={preparationStep} onPreparationChange={prepareConstructionStep} needsModel={(continuation.failures ?? 0) >= 2} lastIncorrectChoice={lastError} onAcceptModel={() => placeSlot(true)} onAttempt={constructionAttempt} onPick={() => placeSlot()} onNext={nextBuild} />
      : <GrammarCoach lesson={lesson} form={form} sceneWord={sceneWord} startAtPractice={Boolean(practicedPattern)} startAtExample={Boolean(practicedPattern) && stream} reusePreparedSubject={reuseSubject} omitGeneratedExplanation={Boolean(practicedPattern)} conversationAnswers={chatAnswers} constructionAnswers={episode ? sentences.map((item) => item.en) : []} userId={userId} unitId={unit.id} unitTitle={unit.title} contentVersion={unit.contentVersion ?? '1'} reviewMode={inspection} requirePractice schedulePractice repairLimit={2} puzzle={stream} checkpoint={checkpoint} onProgress={(state) => {
        coachState.current = { ...state, ...(episode ? { episodeId: episodeIdentity, episodeStartedAt: started.current } : {}) };
        if (!inspection && !completed.current) writeTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1', coachState.current);
      }} onReady={() => {}} onContinue={continueCoach} />}</section>
  </main>;
}
