import { useEffect, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { grammarChecksForExperience, type GrammarLessonData } from '../domain/grammarLesson';
import { GrammarRow, GrammarCaption, GrammarText } from './GrammarText';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { recordLearningActivity } from '../domain/learningActivity';
import type { AtomicWord, GrammarForm } from '../domain/unit';
import { SceneVisual } from './SceneVisual';
import { playEnglish, playSpanish, playSnap, stopSpeech } from '../services/audio';
import type { TrickCheckpoint } from '../domain/trickCheckpoint';
import { recordSentenceExposure } from '../domain/memory';

const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
export function GrammarCoach({ lesson, form, sceneWord, userId, unitId, unitTitle = lesson.title, contentVersion = '1', conversationAnswers = [], startAtPractice = false, reviewMode, onReady, onContinue, checkpoint, onProgress, requirePractice = false, schedulePractice = false }: {
  lesson: GrammarLessonData; form?: GrammarForm; sceneWord?: AtomicWord; userId: string; unitId: string; unitTitle?: string; contentVersion?: string; conversationAnswers?: string[]; startAtPractice?: boolean; reviewMode: boolean; onReady: () => void; onContinue: () => void;
  checkpoint?: TrickCheckpoint | null; onProgress?: (state: TrickCheckpoint) => void; requirePractice?: boolean; schedulePractice?: boolean;
}) {
  const validCheckpoint = checkpoint && checkpoint.stage <= lesson.steps.length && checkpoint.checkIndex < lesson.checks.length ? checkpoint : null;
  const [stage, setStage] = useState(validCheckpoint?.stage ?? (startAtPractice ? lesson.steps.length : 0));
  const [paused, setPaused] = useState(false);
  const [checkIndex, setCheckIndex] = useState(validCheckpoint?.checkIndex ?? 0);
  const [input, setInput] = useState(validCheckpoint?.input ?? '');
  const [feedback, setFeedback] = useState<'idle' | 'help' | 'correct'>(validCheckpoint?.feedback ?? 'idle');
  const [helped, setHelped] = useState(validCheckpoint?.helped ?? false);
  const [person, setPerson] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const previousAttempt = useRef<string>();
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  const step = lesson.steps[stage];
  // For a conversational mission the written answer belongs to its live exchange,
  // not an identical translation form immediately before it.
  const checks = grammarChecksForExperience(lesson, conversationAnswers);
  const check = checks[checkIndex];
  const finished = !step && !check;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => { progressRef.current?.({ stage, checkIndex, input, feedback, helped }); }, [stage, checkIndex, input, feedback, helped]);
  useEffect(() => {
    if (!step || paused) return;
    // Spanish TTS expands ING as the abbreviation for «ingeniero». The written
    // suffix stays visible; the English model pronounces it inside the verb.
    void playSpanish(step.caption.replace(/\bING\b/gu, 'la terminación inglesa'));
    // Teaching is not a timed Arcade round: keep the example visible until
    // the learner chooses to move on, even when speech ends or fails.
    return () => { stopSpeech(); };
  }, [step, paused]);
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
    if (!check || feedback === 'correct') return;
    const correct = check.answers.some((answer) => normalize(answer) === normalize(value));
    if (!reviewMode) recordGrammarAttempt(userId, { skill: lesson.id, unitId, check: check.id, kind: check.kind, correct, helped, at: new Date().toISOString() });
    if (!reviewMode) {
      const activity = recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId: check.id, skill: lesson.id, phase: 'grammar', source: 'learner', modality: check.kind === 'write' ? 'writing' : 'choice', prompt: check.prompt, response: value, expected: check.answers[0], correct, helped: helped || check.kind !== 'write', feedback: correct ? check.success : check.hint, parentAttemptId: previousAttempt.current });
      previousAttempt.current = correct ? undefined : activity.id;
      if (schedulePractice && correct && check.kind === 'write') {
        const pair = lesson.steps.find((sample) => check.answers.some((answer) => normalize(answer) === normalize(sample.en.map((part) => part.text).join(''))));
        if (pair) recordSentenceExposure(userId, unitId, { en: check.answers[0], es: pair.es.map((part) => part.text).join(''), slots: [], pronunciationTip: 'Escucha las piezas de la frase.' });
      }
    }
    if (!correct) { setFeedback('help'); setHelped(true); void playSpanish(check.hint); return; }
    setFeedback('correct'); playSnap();
    if (check.kind !== 'explain') void playEnglish(check.answers[0]);
  }
  function nextCheck() {
    stopSpeech();
      if (checkIndex === checks.length - 1) {
        readyRef.current();
        continueRef.current();
        return;
      }
      setCheckIndex((value) => value + 1); setInput(''); setFeedback('idle'); setHelped(false); previousAttempt.current = undefined;
  }
  const subject = form?.subjects[person];
  const finalStep = lesson.steps.at(-1)!;
  const hasAuthoredPair = subject && normalize(subject.phrase) === normalize(finalStep.en.map((part) => part.text).join(''));
  return <GameCard className="coach-card" reserveFooter revealFooter={finished} onAdvance={finished ? onContinue : undefined} advanceLabel="Construir frase">
    <div className="coach-content">
      <p className="eyebrow">{step ? 'DESCUBRE EL TRUCO' : finished ? 'AHORA, ÚSALO' : check.kind === 'explain' ? 'AHORA TÚ ENSEÑAS' : check.kind === 'write' ? 'TU PRIMERA RESPUESTA' : 'PRUÉBALO'}</p>
      {sceneWord ? <SceneVisual word={sceneWord} compact /> : null}
      {step ? <>
        <p className="coach-caption" aria-live="polite"><GrammarCaption text={step.caption} marks={step.captionMarks ?? [...step.es, ...step.en].filter((part) => part.role !== 'context').map((part) => ({ ...part, text: part.text.trim() }))} /></p>
        <div className="coach-demonstration"><div><small className="coach-language">ESPAÑOL</small><GrammarRow parts={step.es} language="es" /></div>{!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small><GrammarRow parts={step.en} language="en" /></div></> : null}</div>
        <div className="coach-actions">{!step.hideEnglish ? <button type="button" className="quiet-action" onClick={() => void playEnglish(step.en.map((part) => part.text).join(''))}>🔊 Escuchar inglés</button> : null}<button type="button" className="primary-action" onClick={() => { stopSpeech(); setStage((value) => value + 1); }}>{step.advanceLabel ?? 'Seguir ahora →'}</button><button type="button" className="quiet-action coach-pause" aria-pressed={paused} onClick={() => { stopSpeech(); setPaused((value) => !value); }}>{paused ? 'Reanudar explicación' : 'Pausar'}</button><button type="button" className="quiet-action" onClick={skipKnownTrick}>{requirePractice ? 'Ya lo entiendo · probarlo' : 'Ya conozco el truco · ir a la frase'}</button></div>
      </> : !finished ? <div className="coach-practice">
        <h2>{check.prompt}</h2>
        {startAtPractice ? <button type="button" className="quiet-action" onClick={() => { stopSpeech(); setStage(0); }}>Ver el truco otra vez</button> : null}
        {check.kind === 'write' ? <form onSubmit={(event) => { event.preventDefault(); answer(input); }}><label className="sr-only" htmlFor="grammar-answer">Tu respuesta en inglés</label><input id="grammar-answer" lang="en" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={feedback === 'correct'} /><button type="submit" disabled={!input.trim() || feedback === 'correct'}>Comprobar</button></form>
          : <div className="coach-options">{check.choices!.map((choice) => <button type="button" key={choice} disabled={feedback === 'correct'} onClick={() => answer(choice)}>{form ? <GrammarText text={choice} form={form} /> : choice}</button>)}</div>}
        <p className="coach-feedback" role="status">{feedback === 'correct' ? check.success : feedback === 'help' ? check.hint : ''}</p>
        {feedback === 'correct' ? <button type="button" className="primary-action" onClick={nextCheck}>Seguir →</button> : null}
        {feedback === 'idle' ? <button type="button" className="quiet-action" onClick={() => { setHelped(true); setFeedback('help'); void playSpanish(check.hint); }}>Dame una pista</button> : null}{!requirePractice ? <button type="button" className="quiet-action" onClick={skipKnownTrick}>Pasar este repaso · ir a la frase</button> : null}
      </div> : <div className="coach-finished">
        {subject ? <>{hasAuthoredPair ? <><GrammarRow parts={finalStep.es} language="es" /><GrammarRow parts={finalStep.en} language="en" /></> : <><p className="coach-caption"><GrammarText text={`${subject.reducedEs || subject.es} ${form!.spanish}`} form={form!} language="es" /></p><p className="coach-row" lang="en"><GrammarText text={subject.phrase} form={form!} /></p></>}<button type="button" className="quiet-action" onClick={() => void playEnglish(subject.phrase)}>🔊 Escuchar</button>{form!.subjects.length > 1 ? <div className="subject-list">{form!.subjects.map((item, index) => <button type="button" className={index === person ? 'is-active' : ''} key={index} onClick={() => { setPerson(index); void playEnglish(item.phrase); }}>{item.es}</button>)}</div> : null}</>
          : <><GrammarRow parts={lesson.steps.at(-1)!.es} language="es" /><GrammarRow parts={lesson.steps.at(-1)!.en} language="en" /></>}
        <p>Ya tienes las piezas. Vamos a usarlas.</p>
      </div>}
    </div>
  </GameCard>;
}
