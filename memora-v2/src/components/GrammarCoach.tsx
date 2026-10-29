import { AnswerStudio } from './AnswerStudio';
import { GrammarComparison } from './GrammarComparison';
import { GrammarContractionLab } from './GrammarContractionLab';
import { grammarTransition } from '../domain/grammarPresentation';
import { SpeechModelButton } from './SpeechModelButton';
import { useEffect, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { grammarChecksForExperience, type GrammarLessonData } from '../domain/grammarLesson';
import { GrammarRow, GrammarCaption, GrammarText } from './GrammarText';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { contextualCorrection, readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import type { AtomicWord, GrammarForm } from '../domain/unit';
import { SceneVisual } from './SceneVisual';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import type { TrickCheckpoint } from '../domain/trickCheckpoint';
import { recordSentenceExposure } from '../domain/memory';
import { GrammarActionScene, supportsGrammarAction } from './GrammarActionScene';
import { GrammarSituation, SituationScreen } from './GrammarSituation';
import { GrammarOrder } from './GrammarOrder';
import { searchKeysSkill } from '../domain/searchKeysPractice';
import { bedMakingSkill } from '../domain/bedMakingPractice';
import { computerPlayingSkill } from '../domain/computerPlayingPractice';
import { deskLocationSkill } from '../domain/deskLocationPractice';
import { dinnerCookingSkill } from '../domain/dinnerCookingPractice';
import { kitchenLocationSkill } from '../domain/kitchenLocationPractice';
import { teethBrushingSkill } from '../domain/teethBrushingPractice';
import { mirrorLocationSkill } from '../domain/mirrorLocationPractice';
import { dogWalkingSkill } from '../domain/dogWalkingPractice';
import { treeLocationSkill } from '../domain/treeLocationPractice';
import { meatCookingSkill } from '../domain/meatCookingPractice';
import { ExplainBack } from './ExplainBack';
import { MessageRepair } from './MessageRepair';
import { PlayGrammarToy } from './PlayGrammarToy';
import './messageOverview.css';

const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
export function GrammarCoach({ lesson, form, sceneWord, userId, unitId, unitTitle = lesson.title, contentVersion = '1', conversationAnswers = [], constructionAnswers = [], startAtPractice = false, startAtExample = false, reusePreparedSubject = false, omitGeneratedExplanation = false, reviewMode, onReady, onContinue, checkpoint, onProgress, requirePractice = false, schedulePractice = false, repairLimit, puzzle = false, explanationOnly = false, headingLevel = 1 }: {
  lesson: GrammarLessonData; form?: GrammarForm; sceneWord?: AtomicWord; userId: string; unitId: string; unitTitle?: string; contentVersion?: string; conversationAnswers?: string[]; startAtPractice?: boolean; reviewMode: boolean; onReady: () => void; onContinue: () => void;
  checkpoint?: TrickCheckpoint | null; onProgress?: (state: TrickCheckpoint) => void; requirePractice?: boolean; schedulePractice?: boolean; omitGeneratedExplanation?: boolean;
  repairLimit?: 2; puzzle?: boolean; startAtExample?: boolean; constructionAnswers?: string[]; reusePreparedSubject?: boolean; explanationOnly?: boolean;
  headingLevel?: 1 | 2;
}) {
  // Resume the task that is actually shown, not the unfiltered lesson index.
  // A conversational exchange may take over one of the written checks.
  const generatedContinuous = Boolean(form && !form.lesson && lesson.id === `present-continuous:${form.englishBase}` && (form.visualContract === 'present-continuous' || form.id === 'ing'));
  const preparedMessage = [searchKeysSkill, bedMakingSkill, computerPlayingSkill, deskLocationSkill, dinnerCookingSkill, kitchenLocationSkill, teethBrushingSkill, mirrorLocationSkill, dogWalkingSkill, treeLocationSkill, meatCookingSkill].includes(lesson.id);
  const stream = puzzle && (explanationOnly || generatedContinuous || preparedMessage);
  const overview = useRef(Boolean(stream && lesson.overview && !explanationOnly && !reviewMode && (!checkpoint || checkpoint.presentation === 'message-overview-v1'))).current;
  // Keep an already-started ordering task for this mount, even if a newly
  // connected constructor would otherwise defer it. Do not shift indices as
  // onProgress writes each new checkpoint back to the parent.
  const initialConstructionCheck = useRef(checkpoint ? checkpoint.checkId
    ? lesson.checks.find((check) => check.id === checkpoint.checkId)
    : !generatedContinuous ? grammarChecksForExperience(lesson, conversationAnswers)[checkpoint.checkIndex] : undefined : undefined);
  const checks = grammarChecksForExperience(lesson, conversationAnswers, constructionAnswers, initialConstructionCheck.current?.ordering ? initialConstructionCheck.current.id : undefined).filter((check) => !(omitGeneratedExplanation && generatedContinuous && check.id === 'explain') && (!check.repair || initialConstructionCheck.current?.id === check.id));
  const teachingStage = !explanationOnly && checkpoint && checkpoint.stage <= lesson.steps.length ? checkpoint.stage : undefined;
  // Filtering earlier questions must not discard an identified unfinished response.
  const savedCheckIndex = checkpoint?.checkId !== undefined ? checks.findIndex((check) => check.id === checkpoint.checkId) : checkpoint?.checkIndex ?? -1;
  const savedPieces = checks[savedCheckIndex]?.ordering;
  const savedRepair = checks[savedCheckIndex]?.repair;
  const validOrder = savedRepair ? !checkpoint?.order || checkpoint.order.length <= 1 && checkpoint.order.every((index) => Number.isInteger(index) && index >= 0 && index <= savedRepair.pieces.length) : !savedPieces || (!checkpoint?.order ? checkpoint?.feedback !== 'correct' : checkpoint.order.every((index) => Number.isInteger(index) && index >= 0 && index < savedPieces.length) && new Set(checkpoint.order).size === checkpoint.order.length && (checkpoint.feedback !== 'correct' || checkpoint.order.length === savedPieces.length));
  const validCheckpoint = teachingStage !== undefined && checkpoint && savedCheckIndex >= 0 && savedCheckIndex < checks.length
    && validOrder && (checkpoint.checkId !== undefined || (checks.length === lesson.checks.length && !generatedContinuous)) ? { ...checkpoint, checkIndex: savedCheckIndex } : null;
  const [stage, setStage] = useState(explanationOnly ? 0 : teachingStage ?? (overview ? lesson.steps.length - 1 : reusePreparedSubject && preparedMessage ? 2 : reusePreparedSubject && generatedContinuous ? 1 : startAtExample && generatedContinuous ? lesson.steps.length - 1 : startAtPractice ? lesson.steps.length : 0));
  const [paused, setPaused] = useState(false);
  const [checkIndex, setCheckIndex] = useState(validCheckpoint?.checkIndex ?? 0);
  const [input, setInput] = useState(validCheckpoint?.input ?? '');
  const [feedback, setFeedback] = useState<'idle' | 'help' | 'correct'>(validCheckpoint?.feedback ?? 'idle');
  const [helped, setHelped] = useState(validCheckpoint?.helped ?? checkpoint?.helped ?? false);
  const helpedRef = useRef(helped);
  const [person, setPerson] = useState(0);
  const [order, setOrder] = useState<number[]>(validCheckpoint?.order ?? []);
  const [correctionResponse, setCorrectionResponse] = useState<string | undefined>(validCheckpoint?.correctionResponse);
  const [checkFailures, setCheckFailures] = useState(validCheckpoint?.checkFailures ?? 0);
  const [reflection, setReflection] = useState(validCheckpoint?.reflection);
  const [showOverviewDetails, setShowOverviewDetails] = useState(false);
  const reflectionCompared = useRef(reflection?.compared ?? false);
  const failureCount = useRef(checkFailures);
  const correctSubmission = useRef<string>();
  const advancedCheck = useRef<string>();
  const shownModel = useRef<string>();
  const restoredTeaching = useRef(teachingStage !== undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const previousAttempt = useRef<string | undefined>(validCheckpoint?.previousAttemptId);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  const step = overview && stage < lesson.steps.length ? lesson.overview : lesson.steps.at(stage);
  const contractionLab = Boolean(!overview && stream && (generatedContinuous || preparedMessage) && !reusePreparedSubject && !startAtExample && step && stage === lesson.steps.length - 1
    && (step.en[0]?.text.trim().toLowerCase() === "i'm" || step.en[0]?.text.trim().toLowerCase() === 'i' && step.en[1]?.text.trim().toLowerCase() === 'am'));
  const exampleBridge = Boolean(step && startAtExample && generatedContinuous && stage === lesson.steps.length - 1);
  const caption = exampleBridge ? `Misma estructura, nueva acción: «estoy ${form!.spanish}». Mira y escucha cómo queda antes de montarla.` : reusePreparedSubject && generatedContinuous && stage === 1 ? `Ya has usado I AM: yo estoy. Ahora escucha «${form!.english}»: «${form!.spanish}».` : step?.caption;
  const transition = step ? grammarTransition(step, lesson.steps[stage - 1]) : undefined;
  const comparisonLab = Boolean(!overview && stream && !contractionLab && transition && (transition.changed.length || transition.contraction));
  // For a conversational mission the written answer belongs to its live exchange,
  // not an identical translation form immediately before it.
  const check = checks[checkIndex];
  const promptTime = useRef({ id: step ? undefined : check?.id, at: validCheckpoint?.promptStartedAt ?? new Date().toISOString() });
  const activePrompt = step ? undefined : check?.id;
  if (promptTime.current.id !== activePrompt) promptTime.current = { id: activePrompt, at: new Date().toISOString() };
  const reflectionTask = useRef(check?.id); reflectionTask.current = check?.id;
  // Limit only the known generated contract; authored lessons need their own review.
  const bounded = repairLimit === 2 && (generatedContinuous || preparedMessage);
  const needsModel = bounded && checkFailures >= 2 && feedback !== 'correct';
  const modelMessage = check?.situation?.message ?? (check?.kind === 'explain' ? lesson.steps.at(-1)!.en.map((part) => part.text).join('') : check?.answers[0]);
  const helpText = check?.kind === 'write' && correctionResponse !== undefined ? contextualCorrection(correctionResponse, check.answers[0], check.hint) : check?.hint;
  const finished = !step && !check;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => { progressRef.current?.({ stage, checkIndex, checkId: check?.id, input, feedback, helped, order, correctionResponse, checkFailures, reflection, presentation: overview ? 'message-overview-v1' : undefined, promptStartedAt: !step && check?.repair ? promptTime.current.at : undefined, previousAttemptId: previousAttempt.current }); }, [stage, checkIndex, check?.id, input, feedback, helped, order, correctionResponse, checkFailures, reflection]);
  useEffect(() => {
    if (step || !check || !needsModel || reviewMode || shownModel.current === check.id) return;
    shownModel.current = check.id;
    if (readLearningActivities(userId).some((event) => event.unitId === unitId && event.contentVersion === contentVersion && event.skill === lesson.id && event.activityId === `model:${check.id}` && event.parentAttemptId === previousAttempt.current)) return;
    recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: `model:${check.id}`, skill: lesson.id, phase: 'grammar', source: 'authored', modality: 'choice', prompt: check.prompt, response: modelMessage!, expected: '', correct: null, helped: true, parentAttemptId: previousAttempt.current, feedback: 'Modelo mostrado con ayuda; no es un acierto independiente.' });
  }, [step, check, needsModel, reviewMode, modelMessage]);
  useEffect(() => {
    const restored = restoredTeaching.current; restoredTeaching.current = false;
    if (restored) return;
    if (!step || paused || contractionLab || step.hideEnglish || stage !== lesson.steps.length - 1) return;
    // Hear the complete new English model once, not a narration of every caption.
    void playEnglish(step.en.map((part) => part.text).join(''));
    // Teaching is not a timed Arcade round: keep the example visible until
    // the learner chooses to move on, even when speech ends or fails.
    return () => { stopSpeech(); };
  }, [step, stage, lesson.steps.length, paused, contractionLab]);
  useEffect(() => { if (finished) readyRef.current(); }, [finished]);
  useEffect(() => () => { clearTimeout(timer.current); stopSpeech(); }, []);

  function skipKnownTrick() {
    stopSpeech();
    clearTimeout(timer.current);
    if (explanationOnly) { continueRef.current(); return; }
    if (requirePractice) { setStage(lesson.steps.length); return; }
    readyRef.current();
    continueRef.current();
  }

  function answer(value: string) {
    if (!check || feedback === 'correct' || bounded && (correctSubmission.current === check.id || failureCount.current >= 2)) return;
    if (check.kind !== 'write') setInput(value);
    const correct = check.answers.some((answer) => normalize(answer) === normalize(value));
    if (correct) correctSubmission.current = check.id;
    else if (bounded) { failureCount.current += 1; setCheckFailures(failureCount.current); }
    const correction = check.kind === 'write' ? contextualCorrection(value, check.answers[0], check.hint) : check.hint;
    if (!reviewMode) recordGrammarAttempt(userId, { skill: lesson.id, unitId, check: check.id, kind: check.kind, correct, helped: Boolean(check.repair) || helpedRef.current, at: new Date().toISOString() });
    if (!reviewMode) {
      const activity = recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: check.id, skill: lesson.id, phase: 'grammar', source: 'learner', modality: check.kind === 'write' ? 'writing' : 'choice', prompt: check.prompt, response: value, expected: check.answers[0], correct, helped: helpedRef.current || check.kind !== 'write', feedback: correct ? check.success : correction, parentAttemptId: previousAttempt.current, ...(check.repair ? { responseDelayMs: Math.max(0, Date.now() - Date.parse(promptTime.current.at)) } : {}) });
      previousAttempt.current = correct ? undefined : activity.id;
      if (schedulePractice && correct && check.kind === 'write') {
        const pair = lesson.steps.find((sample) => check.answers.some((answer) => normalize(answer) === normalize(sample.en.map((part) => part.text).join(''))));
        if (pair) recordSentenceExposure(userId, unitId, { en: check.answers[0], es: pair.es.map((part) => part.text).join(''), slots: [], pronunciationTip: 'Escucha las piezas de la frase.' });
      }
    }
    if (!correct) { setCorrectionResponse(check.kind === 'write' ? value : undefined); setFeedback('help'); markHelped(); return; }
    setCorrectionResponse(undefined); setFeedback('correct'); playSnap();
  }
  function markHelped() { helpedRef.current = true; setHelped(true); }
  function nextCheck() {
    if (!check || bounded && advancedCheck.current === check.id) return;
    advancedCheck.current = check.id;
    stopSpeech();
    reflectionCompared.current = false; setReflection(undefined);
      if (checkIndex === checks.length - 1) {
        readyRef.current();
        continueRef.current();
        return;
      }
      setCheckIndex((value) => value + 1); setInput(''); setOrder([]); setCorrectionResponse(undefined); setFeedback('idle'); helpedRef.current = false; setHelped(false); previousAttempt.current = undefined; failureCount.current = 0; setCheckFailures(0);
  }
  const subject = form?.subjects[person];
  const finalStep = lesson.steps.at(-1)!;
  const hasAuthoredPair = subject && normalize(subject.phrase) === normalize(finalStep.en.map((part) => part.text).join(''));
  const actionScene = supportsGrammarAction(lesson, form);
  const situation = !step && check?.situation;
  const ordering = !step && check?.ordering;
  const repair = !step && check?.repair;
  const streamSolved = stream && feedback === 'correct';
  const writing = !step && !finished && check?.kind === 'write' && !needsModel && !streamSolved;
  const writingPair = writing ? [...lesson.steps].reverse().find((sample) => !sample.hideEnglish && check.answers.some((value) => normalize(value) === normalize(sample.en.map((part) => part.text).join('')))) : undefined;
  const overviewToy = overview && step && [computerPlayingSkill, deskLocationSkill].includes(lesson.id) && step.en.length === 3 && step.es.length === 3 ? step : undefined;
  const advanceTeaching = () => { stopSpeech(); if (explanationOnly && stage === lesson.steps.length - 1) { continueRef.current(); return; } if (overviewToy) setOrder([]); setStage((value) => overview ? lesson.steps.length : value + 1); };
  const teachingSituation = overview && step ? lesson.checks.find((item) => item.situation)?.situation : undefined;
  const teachingScene = teachingSituation && lesson.checks.find((item) => item.situation === teachingSituation)?.answers[0];
  const overviewScene = teachingSituation?.scenes.find((scene) => scene.choice === teachingScene)?.state;
  const streamAdvance = step ? advanceTeaching : finished ? onContinue : needsModel || feedback === 'correct' ? nextCheck : undefined;
  const teachingAdvanceLabel = explanationOnly && stage === lesson.steps.length - 1 ? 'Volver a mi mensaje' : step?.advanceLabel ?? (stage === lesson.steps.length - 1 ? 'Practicar el mensaje' : 'Ver la siguiente pieza');
  const TeachingHeading = explanationOnly || headingLevel === 2 ? 'h2' : 'h1';
  const scene = actionScene ? <GrammarActionScene lesson={lesson} form={form} stage={step ? 'teach' : finished ? 'finished' : check.kind === 'write' ? 'write' : 'explain'} feedback={feedback} compact={writing} /> : sceneWord ? <SceneVisual word={sceneWord} hideAnswer={writing} compact /> : null;
  return <GameCard feedback={!step && feedback === 'correct' ? 'correct' : needsModel ? 'model' : !step && feedback === 'help' ? 'retry' : undefined} vertical={stream} stepKey={`${stage}:${check?.id ?? ''}:${needsModel ? 'model' : streamSolved ? 'result' : 'task'}`} className={`coach-card${stream ? ' coach-stream' : ''}${actionScene ? ' coach-action-card' : ''}${situation || ordering || repair ? ' coach-situation-card' : ''}`} reserveFooter={!stream && !actionScene && !situation && !ordering && !repair} revealFooter={stream ? Boolean(streamAdvance) : finished} onAdvance={stream ? streamAdvance : finished ? onContinue : undefined} advanceControl={!stream && finished} advanceLabel={!stream ? 'Construir frase' : step ? teachingAdvanceLabel : needsModel ? 'Continuar con el modelo' : 'Continuar al siguiente reto'}>
    <div className={`coach-content${step ? ' coach-teaching' : ''}`}>
      {step ? <><p className="coach-teaching-step">{overview ? 'UN MENSAJE · TRES BLOQUES' : `${exampleBridge ? 'UNA ACCIÓN NUEVA' : 'TRUCO DE GRAMÁTICA'} · ${stage + 1}/${lesson.steps.length}`}</p><TeachingHeading className="coach-trick-title">{lesson.title}</TeachingHeading></> : <>
      {stream ? <p className="coach-language">{finished ? 'Preparación terminada · vamos a usarla' : `Práctica · reto ${checkIndex + 1} de ${checks.length}`}</p> : null}
      <p className="eyebrow">{finished ? 'AHORA, ÚSALO' : needsModel ? 'MODELO' : streamSolved ? 'RESULTADO' : ordering ? 'MONTA EL MENSAJE' : situation ? 'EL MENSAJE CAMBIA LA ESCENA' : check.id === 'meaning-now-v1' ? 'ENTIENDE EL MENSAJE' : check.kind === 'explain' ? 'AHORA TÚ ENSEÑAS' : check.kind === 'write' ? 'TU PRIMERA RESPUESTA' : 'PRUÉBALO'}</p></>}
      {overviewScene ? <div className="overview-scene"><SituationScreen state={overviewScene} /></div> : !writing && !needsModel && !situation && !ordering && !repair ? scene : null}
      {step ? <>
        {contractionLab ? <GrammarContractionLab step={step} lessonId={lesson.id} unitId={unitId} unitTitle={unitTitle} contentVersion={contentVersion} userId={userId} reviewMode={reviewMode} /> : overviewToy ? <><PlayGrammarToy before={{ en: step.en[0].text.trim().toUpperCase(), es: step.es[0].text.trim().toLowerCase() }} after={{ en: step.en[2].text.trim().toUpperCase(), es: step.es[2].text.trim() }} token={{ ...step.en[1], text: step.en[1].text.trim().toUpperCase() }} meaning={step.es[1].text.trim()} target={step.es.map((part) => part.text).join('')} rule="PLAY + ING → PLAYING" insight={caption!} revealed={order.includes(0)} onDiscover={() => {
          if (order.includes(0)) return;
          setOrder([0]); playSnap();
          if (!reviewMode) {
            const en = step.en.map((part) => part.text).join(''), es = step.es.map((part) => part.text).join('');
            recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: `overview-connected:${lesson.id}`, skill: lesson.id, phase: 'grammar', source: 'authored', modality: 'choice', prompt: es, response: en, expected: '', correct: null, helped: true, feedback: 'Modelo encajado con significado visible; no es un acierto ni escritura.' });
          }
        }} />{!order.includes(0) ? <p className="coach-caption">{caption}</p> : null}</> : <>
          <GrammarComparison key={`${lesson.id}:${stage}`} connectPieces={stream} interactive={comparisonLab} caption={caption} step={step} previous={lesson.steps[stage - 1]} />
          {!comparisonLab ? <p className="coach-caption" aria-live="polite"><GrammarCaption text={caption!} marks={exampleBridge ? step.es : step.captionMarks ?? [...step.es, ...step.en].filter((part) => part.role !== 'context').map((part) => ({ ...part, text: part.text.trim() }))} /></p> : null}
        </>}
        <div className="coach-teaching-actions">{!step.hideEnglish && !contractionLab && !comparisonLab ? <SpeechModelButton key={`${lesson.id}:${stage}`} text={step.en.map((part) => part.text).join('')} /> : null}{!stream ? <button type="button" className="primary-action" onClick={advanceTeaching}>{explanationOnly ? teachingAdvanceLabel : step.advanceLabel ?? 'Seguir ahora →'}</button> : null}</div>
        {overview ? <details className="message-overview-details" onToggle={(event) => setShowOverviewDetails(event.currentTarget.open)}><summary>Desmontar el truco</summary>{showOverviewDetails ? lesson.steps.map((detail, index) => <section key={index}><GrammarComparison step={detail} connectPieces /><p>{detail.caption}</p></section>) : null}</details> : null}
        <details className="coach-teaching-options"><summary>Escuchar la explicación</summary><SpeechModelButton text={caption!.replace(/\bING\b/gu, 'la terminación inglesa')} language="es" label="Escuchar explicación en español" />{!stream ? <div><button type="button" className="quiet-action coach-pause" aria-pressed={paused} onClick={() => { stopSpeech(); setPaused((value) => !value); }}>{paused ? 'Reanudar explicación' : 'Pausar'}</button><button type="button" className="quiet-action" onClick={skipKnownTrick}>{requirePractice ? 'Ya lo entiendo · probarlo' : 'Ya conozco el truco · ir a la frase'}</button></div> : null}</details>
      </> : !finished ? <div className={`coach-practice${writing ? ' coach-response-studio' : ''}`}>
        {!writing && !repair ? <h2>{needsModel ? 'Vamos con ayuda' : streamSolved ? '✓ Acertaste' : situation ? 'Entrega el mensaje' : check.prompt}</h2> : null}
        {startAtPractice && !streamSolved ? <button type="button" className="quiet-action" onClick={() => { stopSpeech(); markHelped(); setStage(0); }}>Ver el truco otra vez</button> : null}
        {repair ? <MessageRepair {...repair} headingLevel={2} position={order[0]} result={needsModel ? 'model' : feedback === 'correct' ? 'correct' : feedback === 'help' ? 'retry' : 'idle'} onPosition={(position) => { if (reflectionTask.current === check.id && correctSubmission.current !== check.id && failureCount.current < 2) setOrder([position]); }} onAnswer={answer} /> : streamSolved && !situation ? <p className="coach-row">{input || check.answers[0]}</p> : needsModel ? <div className="grammar-repair-model" role="status"><p className="coach-row" lang="en">{modelMessage}</p><p>{check.hint}</p><SpeechModelButton key={`${lesson.id}:${check.id}:repair`} text={modelMessage!} label="Escuchar el modelo" /></div> : ordering ? <GrammarOrder autoCheck puzzle={puzzle} pieces={ordering} selected={order} locked={feedback === 'correct'} onChange={(selection) => { if (feedback === 'correct') return; setOrder(selection); setFeedback('idle'); }} onAnswer={answer} /> : situation ? <GrammarSituation check={check} presentationKey={`${unitId}:${contentVersion}:${lesson.id}`} selected={input} feedback={feedback} onAnswer={answer} listenControl={<SpeechModelButton key={`${lesson.id}:${check.id}:scene`} text={check.situation!.message} label="Escuchar el mensaje inglés" idleLabel="Escuchar" />} /> : check.kind === 'write' ? <AnswerStudio id="grammar-answer" taskKey={`${unitId}:${contentVersion}:${lesson.id}:${check.id}`} scene={scene} target={check.targetEs ?? (writingPair ? <GrammarRow parts={writingPair.es} language="es" /> : check.prompt)} value={input} onChange={setInput} onAnswer={answer} accepts={(value) => check.answers.some((accepted) => normalize(accepted) === normalize(value))} disabled={feedback === 'correct'} />
          : <div className="coach-options">{check.choices!.map((choice) => <button type="button" key={choice} disabled={feedback === 'correct'} onClick={() => answer(choice)}>{form ? <GrammarText text={choice} form={form} /> : choice}</button>)}</div>}
        {!needsModel && (!repair || feedback === 'help') ? <p className="coach-feedback" role="status">{feedback === 'correct' ? check.success : feedback === 'help' ? helpText : ''}</p> : null}
        {!stream && needsModel ? <button type="button" className="primary-action" onClick={nextCheck}>Seguir con el modelo →</button> : null}
        {!stream && feedback === 'correct' ? <button type="button" className="primary-action" onClick={nextCheck}>Seguir →</button> : null}
        {feedback === 'correct' || needsModel ? <ExplainBack key={`${lesson.id}:${check.id}`} prompt="¿Cómo le explicarías este truco a otra persona?" model={check.hint} draft={reflection?.draft ?? ''} compared={reflection?.compared ?? false} onDraft={(draft) => { if (reflectionTask.current !== check.id) return; reflectionCompared.current = false; setReflection({ draft, compared: false }); }} onCompare={() => {
          if (reflectionTask.current !== check.id || reflectionCompared.current) return;
          reflectionCompared.current = true;
          const response = reflection?.draft.trim() ?? '';
          if (!reviewMode) {
            const context = { unitId, unitTitle, contentVersion, skill: lesson.id, phase: 'grammar' as const, prompt: 'Explica el truco con tus palabras.', expected: '', correct: null, helped: true };
            if (response) recordLearningActivity(userId, { ...context, activityId: `explain-back:${check.id}`, source: 'learner', modality: 'writing', response, feedback: 'Explicación libre; no se evalúa automáticamente.' });
            recordLearningActivity(userId, { ...context, activityId: `explain-back:${check.id}:model`, source: 'authored', modality: 'choice', response: check.hint, feedback: 'Modelo para comparar la explicación; no es un acierto.' });
          }
          setReflection({ draft: response, compared: true });
        }} /> : null}
        {streamSolved ? null : writing ? <details onToggle={(event) => { if (event.currentTarget.open) markHelped(); }}><summary>Ver cómo se arma</summary><div className="response-model">{writingPair ? <><GrammarRow parts={writingPair.es} language="es" /><GrammarRow parts={writingPair.en} language="en" /></> : <p lang="en">{check.answers[0]}</p>}<p>{check.hint}</p><SpeechModelButton key={`${lesson.id}:${check.id}:writing`} text={check.answers[0]} label="Escuchar modelo" /></div></details> : stream ? !needsModel && feedback !== 'correct' ? <details onToggle={(event) => { if (event.currentTarget.open) { markHelped(); setFeedback('help'); } }}><summary>Una ayuda</summary><p>{check.hint}</p></details> : null : <>{feedback === 'idle' ? <button type="button" className="quiet-action" onClick={() => { markHelped(); setFeedback('help'); }}>Dame una pista</button> : null}{!requirePractice ? <button type="button" className="quiet-action" onClick={skipKnownTrick}>Pasar este repaso · ir a la frase</button> : null}</>}
      </div> : <div className="coach-finished">
        {subject ? <>{hasAuthoredPair ? <><GrammarRow parts={finalStep.es} language="es" /><GrammarRow parts={finalStep.en} language="en" /></> : <><p className="coach-caption"><GrammarText text={`${subject.reducedEs || subject.es} ${form!.spanish}`} form={form!} language="es" /></p><p className="coach-row" lang="en"><GrammarText text={subject.phrase} form={form!} /></p></>}<button type="button" className="quiet-action" onClick={() => void playEnglish(subject.phrase)}>🔊 Escuchar</button>{form!.subjects.length > 1 ? <div className="subject-list">{form!.subjects.map((item, index) => <button type="button" className={index === person ? 'is-active' : ''} key={index} onClick={() => { setPerson(index); void playEnglish(item.phrase); }}>{item.es}</button>)}</div> : null}</>
          : <><GrammarRow parts={lesson.steps.at(-1)!.es} language="es" /><GrammarRow parts={lesson.steps.at(-1)!.en} language="en" /></>}
        <p>Ya tienes las piezas. Vamos a usarlas.</p>
      </div>}
    </div>
  </GameCard>;
}
