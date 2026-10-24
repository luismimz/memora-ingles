import { useEffect, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { grammarChecksForExperience, type GrammarLessonData } from '../domain/grammarLesson';
import { GrammarRow, GrammarCaption, GrammarText } from './GrammarText';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { contextualCorrection, recordLearningActivity } from '../domain/learningActivity';
import type { AtomicWord, GrammarForm } from '../domain/unit';
import { SceneVisual } from './SceneVisual';
import { playEnglish, playSpanish, playSnap, stopSpeech } from '../services/audio';
import type { TrickCheckpoint } from '../domain/trickCheckpoint';
import { recordSentenceExposure } from '../domain/memory';
import { GrammarActionScene, supportsGrammarAction } from './GrammarActionScene';
import { GrammarSituation } from './GrammarSituation';
import { GrammarOrder } from './GrammarOrder';
import { searchKeysSkill } from '../domain/searchKeysPractice';
import { bedMakingSkill } from '../domain/bedMakingPractice';
import { computerPlayingSkill } from '../domain/computerPlayingPractice';

const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
export function GrammarCoach({ lesson, form, sceneWord, userId, unitId, unitTitle = lesson.title, contentVersion = '1', conversationAnswers = [], constructionAnswers = [], startAtPractice = false, startAtExample = false, reusePreparedSubject = false, omitGeneratedExplanation = false, reviewMode, onReady, onContinue, checkpoint, onProgress, requirePractice = false, schedulePractice = false, repairLimit, puzzle = false }: {
  lesson: GrammarLessonData; form?: GrammarForm; sceneWord?: AtomicWord; userId: string; unitId: string; unitTitle?: string; contentVersion?: string; conversationAnswers?: string[]; startAtPractice?: boolean; reviewMode: boolean; onReady: () => void; onContinue: () => void;
  checkpoint?: TrickCheckpoint | null; onProgress?: (state: TrickCheckpoint) => void; requirePractice?: boolean; schedulePractice?: boolean; omitGeneratedExplanation?: boolean;
  repairLimit?: 2; puzzle?: boolean; startAtExample?: boolean; constructionAnswers?: string[]; reusePreparedSubject?: boolean;
}) {
  // Resume the task that is actually shown, not the unfiltered lesson index.
  // A conversational exchange may take over one of the written checks.
  const generatedContinuous = Boolean(form && !form.lesson && lesson.id === `present-continuous:${form.englishBase}` && (form.visualContract === 'present-continuous' || form.id === 'ing'));
  const preparedMessage = [searchKeysSkill, bedMakingSkill, computerPlayingSkill].includes(lesson.id);
  const stream = puzzle && (generatedContinuous || preparedMessage);
  const checks = grammarChecksForExperience(lesson, conversationAnswers, constructionAnswers).filter((check) => !(omitGeneratedExplanation && generatedContinuous && check.id === 'explain'));
  const teachingStage = checkpoint && checkpoint.stage <= lesson.steps.length ? checkpoint.stage : undefined;
  // Filtering earlier questions must not discard an identified unfinished response.
  const savedCheckIndex = checkpoint?.checkId !== undefined ? checks.findIndex((check) => check.id === checkpoint.checkId) : checkpoint?.checkIndex ?? -1;
  const savedPieces = checks[savedCheckIndex]?.ordering;
  const validOrder = !savedPieces || (!checkpoint?.order ? checkpoint?.feedback !== 'correct' : checkpoint.order.every((index) => Number.isInteger(index) && index >= 0 && index < savedPieces.length) && new Set(checkpoint.order).size === checkpoint.order.length && (checkpoint.feedback !== 'correct' || checkpoint.order.length === savedPieces.length));
  const validCheckpoint = teachingStage !== undefined && checkpoint && savedCheckIndex >= 0 && savedCheckIndex < checks.length
    && validOrder && (checkpoint.checkId !== undefined || (checks.length === lesson.checks.length && !generatedContinuous)) ? { ...checkpoint, checkIndex: savedCheckIndex } : null;
  const [stage, setStage] = useState(teachingStage ?? (reusePreparedSubject && preparedMessage ? 2 : startAtExample && generatedContinuous ? lesson.steps.length - 1 : startAtPractice ? lesson.steps.length : 0));
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
  const failureCount = useRef(checkFailures);
  const correctSubmission = useRef<string>();
  const advancedCheck = useRef<string>();
  const shownModel = useRef<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const previousAttempt = useRef<string | undefined>(validCheckpoint?.previousAttemptId);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  const step = lesson.steps[stage];
  const exampleBridge = Boolean(step && startAtExample && generatedContinuous && stage === lesson.steps.length - 1);
  const caption = exampleBridge ? `Misma estructura, nueva acción: «estoy ${form!.spanish}». Mira y escucha cómo queda antes de montarla.` : step?.caption;
  // For a conversational mission the written answer belongs to its live exchange,
  // not an identical translation form immediately before it.
  const check = checks[checkIndex];
  // Limit only the known generated contract; authored lessons need their own review.
  const bounded = repairLimit === 2 && (generatedContinuous || preparedMessage);
  const needsModel = bounded && checkFailures >= 2 && feedback !== 'correct';
  const modelMessage = check?.kind === 'explain' ? lesson.steps.at(-1)!.en.map((part) => part.text).join('') : check?.answers[0];
  const helpText = check?.kind === 'write' && correctionResponse !== undefined ? contextualCorrection(correctionResponse, check.answers[0], check.hint) : check?.hint;
  const finished = !step && !check;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => { progressRef.current?.({ stage, checkIndex, checkId: check?.id, input, feedback, helped, order, correctionResponse, checkFailures, previousAttemptId: previousAttempt.current }); }, [stage, checkIndex, check?.id, input, feedback, helped, order, correctionResponse, checkFailures]);
  useEffect(() => {
    if (step || !check || !needsModel || reviewMode || shownModel.current === check.id) return;
    shownModel.current = check.id;
    recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: `model:${check.id}`, skill: lesson.id, phase: 'grammar', source: 'authored', modality: 'choice', prompt: check.prompt, response: modelMessage!, expected: '', correct: null, helped: true, parentAttemptId: previousAttempt.current, feedback: 'Modelo mostrado con ayuda; no es un acierto independiente.' });
  }, [step, check, needsModel, reviewMode, modelMessage]);
  useEffect(() => {
    if (!step || paused) return;
    // Spanish TTS expands ING as the abbreviation for «ingeniero». The written
    // suffix stays visible; the English model pronounces it inside the verb.
    void playSpanish(caption!.replace(/\bING\b/gu, 'la terminación inglesa'));
    // Teaching is not a timed Arcade round: keep the example visible until
    // the learner chooses to move on, even when speech ends or fails.
    return () => { stopSpeech(); };
  }, [step, caption, paused]);
  useEffect(() => { if (finished) readyRef.current(); }, [finished]);
  useEffect(() => () => { clearTimeout(timer.current); stopSpeech(); }, []);

  function skipKnownTrick() {
    stopSpeech();
    clearTimeout(timer.current);
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
    if (!reviewMode) recordGrammarAttempt(userId, { skill: lesson.id, unitId, check: check.id, kind: check.kind, correct, helped: helpedRef.current, at: new Date().toISOString() });
    if (!reviewMode) {
      const activity = recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: check.id, skill: lesson.id, phase: 'grammar', source: 'learner', modality: check.kind === 'write' ? 'writing' : 'choice', prompt: check.prompt, response: value, expected: check.answers[0], correct, helped: helpedRef.current || check.kind !== 'write', feedback: correct ? check.success : correction, parentAttemptId: previousAttempt.current });
      previousAttempt.current = correct ? undefined : activity.id;
      if (schedulePractice && correct && check.kind === 'write') {
        const pair = lesson.steps.find((sample) => check.answers.some((answer) => normalize(answer) === normalize(sample.en.map((part) => part.text).join(''))));
        if (pair) recordSentenceExposure(userId, unitId, { en: check.answers[0], es: pair.es.map((part) => part.text).join(''), slots: [], pronunciationTip: 'Escucha las piezas de la frase.' });
      }
    }
    if (!correct) { setCorrectionResponse(check.kind === 'write' ? value : undefined); setFeedback('help'); markHelped(); void playSpanish(correction); return; }
    setCorrectionResponse(undefined); setFeedback('correct'); playSnap();
    if (check.kind !== 'explain') void playEnglish(check.answers[0]);
  }
  function markHelped() { helpedRef.current = true; setHelped(true); }
  function nextCheck() {
    if (!check || bounded && advancedCheck.current === check.id) return;
    advancedCheck.current = check.id;
    stopSpeech();
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
  const advanceTeaching = () => { stopSpeech(); setStage((value) => value + 1); };
  const streamAdvance = step ? advanceTeaching : finished ? onContinue : needsModel || feedback === 'correct' ? nextCheck : undefined;
  return <GameCard vertical={stream} stepKey={`${stage}:${check?.id ?? ''}:${needsModel ? 'model' : 'task'}`} className={`coach-card${stream ? ' coach-stream' : ''}${actionScene ? ' coach-action-card' : ''}${situation || ordering ? ' coach-situation-card' : ''}`} reserveFooter={!stream && !actionScene && !situation && !ordering} revealFooter={stream ? Boolean(streamAdvance) : finished} onAdvance={stream ? streamAdvance : finished ? onContinue : undefined} advanceLabel={!stream ? 'Construir frase' : step ? 'Continúa la explicación' : needsModel ? 'Continuar con el modelo' : 'Continuar al siguiente reto'}>
    <div className="coach-content">
      <p className="eyebrow">{step ? exampleBridge ? 'UNA ACCIÓN NUEVA' : 'DESCUBRE EL TRUCO' : finished ? 'AHORA, ÚSALO' : ordering ? 'MONTA EL MENSAJE' : situation ? 'EL MENSAJE CAMBIA LA ESCENA' : check.id === 'meaning-now-v1' ? 'ENTIENDE EL MENSAJE' : check.kind === 'explain' ? 'AHORA TÚ ENSEÑAS' : check.kind === 'write' ? 'TU PRIMERA RESPUESTA' : 'PRUÉBALO'}</p>
      {!situation && !ordering && (actionScene ? <GrammarActionScene lesson={lesson} form={form} stage={step ? 'teach' : finished ? 'finished' : check.kind === 'write' ? 'write' : 'explain'} feedback={feedback} /> : sceneWord ? <SceneVisual word={sceneWord} compact /> : null)}
      {step ? <>
        <p className="coach-caption" aria-live="polite"><GrammarCaption text={caption!} marks={exampleBridge ? step.es : step.captionMarks ?? [...step.es, ...step.en].filter((part) => part.role !== 'context').map((part) => ({ ...part, text: part.text.trim() }))} /></p>
        <div className="coach-demonstration"><div><small className="coach-language">ESPAÑOL</small><GrammarRow parts={step.es} language="es" /></div>{!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small><GrammarRow parts={step.en} language="en" /></div></> : null}</div>
        {stream ? <div className="coach-actions">{!step.hideEnglish ? <button type="button" className="quiet-action" onClick={() => void playEnglish(step.en.map((part) => part.text).join(''))}>🔊 Escuchar inglés</button> : null}</div> : <div className="coach-actions">{!step.hideEnglish ? <button type="button" className="quiet-action" onClick={() => void playEnglish(step.en.map((part) => part.text).join(''))}>🔊 Escuchar inglés</button> : null}<button type="button" className="primary-action" onClick={() => { stopSpeech(); setStage((value) => value + 1); }}>{step.advanceLabel ?? 'Seguir ahora →'}</button><button type="button" className="quiet-action coach-pause" aria-pressed={paused} onClick={() => { stopSpeech(); setPaused((value) => !value); }}>{paused ? 'Reanudar explicación' : 'Pausar'}</button><button type="button" className="quiet-action" onClick={skipKnownTrick}>{requirePractice ? 'Ya lo entiendo · probarlo' : 'Ya conozco el truco · ir a la frase'}</button></div>}
      </> : !finished ? <div className="coach-practice">
        <h2>{situation ? 'Entrega el mensaje' : check.prompt}</h2>
        {startAtPractice ? <button type="button" className="quiet-action" onClick={() => { stopSpeech(); markHelped(); setStage(0); }}>Ver el truco otra vez</button> : null}
        {needsModel ? <div className="grammar-repair-model" role="status"><p>Vamos con ayuda. Este es el mensaje:</p><p className="coach-row" lang="en">{modelMessage}</p><p>{check.hint}</p><button type="button" className="quiet-action" onClick={() => void playEnglish(modelMessage!)}>🔊 Escuchar el modelo</button></div> : ordering ? <GrammarOrder puzzle={puzzle} pieces={ordering} selected={order} locked={feedback === 'correct'} onChange={(selection) => { if (feedback === 'correct') return; setOrder(selection); setFeedback('idle'); }} onAnswer={answer} /> : situation ? <GrammarSituation check={check} presentationKey={`${unitId}:${contentVersion}:${lesson.id}`} selected={input} feedback={feedback} onAnswer={answer} onListen={() => void playEnglish(check.situation!.message)} /> : check.kind === 'write' ? <form onSubmit={(event) => { event.preventDefault(); answer(input); }}><label className="sr-only" htmlFor="grammar-answer">Tu respuesta en inglés</label><input id="grammar-answer" lang="en" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={feedback === 'correct'} /><button type="submit" disabled={!input.trim() || feedback === 'correct'}>Comprobar</button></form>
          : <div className="coach-options">{check.choices!.map((choice) => <button type="button" key={choice} disabled={feedback === 'correct'} onClick={() => answer(choice)}>{form ? <GrammarText text={choice} form={form} /> : choice}</button>)}</div>}
        <p className="coach-feedback" role="status">{needsModel ? 'Puedes seguir. Esto queda como práctica con ayuda, no como recuerdo sin pistas.' : feedback === 'correct' ? check.success : feedback === 'help' ? helpText : ''}</p>
        {!stream && needsModel ? <button type="button" className="primary-action" onClick={nextCheck}>Seguir con el modelo →</button> : null}
        {!stream && feedback === 'correct' ? <button type="button" className="primary-action" onClick={nextCheck}>Seguir →</button> : null}
        {stream ? !needsModel && feedback !== 'correct' ? <details onToggle={(event) => { if (event.currentTarget.open) { markHelped(); setFeedback('help'); } }}><summary>Una ayuda</summary><p>{check.hint}</p></details> : null : <>{feedback === 'idle' ? <button type="button" className="quiet-action" onClick={() => { markHelped(); setFeedback('help'); void playSpanish(check.hint); }}>Dame una pista</button> : null}{!requirePractice ? <button type="button" className="quiet-action" onClick={skipKnownTrick}>Pasar este repaso · ir a la frase</button> : null}</>}
      </div> : <div className="coach-finished">
        {subject ? <>{hasAuthoredPair ? <><GrammarRow parts={finalStep.es} language="es" /><GrammarRow parts={finalStep.en} language="en" /></> : <><p className="coach-caption"><GrammarText text={`${subject.reducedEs || subject.es} ${form!.spanish}`} form={form!} language="es" /></p><p className="coach-row" lang="en"><GrammarText text={subject.phrase} form={form!} /></p></>}<button type="button" className="quiet-action" onClick={() => void playEnglish(subject.phrase)}>🔊 Escuchar</button>{form!.subjects.length > 1 ? <div className="subject-list">{form!.subjects.map((item, index) => <button type="button" className={index === person ? 'is-active' : ''} key={index} onClick={() => { setPerson(index); void playEnglish(item.phrase); }}>{item.es}</button>)}</div> : null}</>
          : <><GrammarRow parts={lesson.steps.at(-1)!.es} language="es" /><GrammarRow parts={lesson.steps.at(-1)!.en} language="en" /></>}
        <p>Ya tienes las piezas. Vamos a usarlas.</p>
      </div>}
    </div>
  </GameCard>;
}
