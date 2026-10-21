import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GameCard } from './components/GameCard';
import { WordHeading } from './components/WordHeading';
import { CognateAssociationCard } from './components/CognateAssociationCard';
import { useAssociationAudio } from './components/useAssociationAudio';
import { AssociationAudioStatus } from './components/AssociationAudioStatus';
import { EchoPractice } from './components/EchoPractice';
import { GrammarMorphology } from './components/GrammarMorphology';
import { GrammarCoach } from './components/GrammarCoach';
import { ConversationPractice } from './components/ConversationPractice';
import { ActiveRecallCard, SceneReconstruction } from './components/ActiveRecallCard';
import { recalledWordIndex } from './domain/activeRecall';
import { lessonForForm } from './domain/grammarLesson';
import { conversationPracticeAnswers, demonstratedConversationQuestionSkills } from './domain/conversation';
import { MnemonicSceneText, SceneVisual } from './components/SceneVisual';
import { SentenceBuilderCard } from './components/SentenceBuilderCard';
import { gameReducer, initialGame, type LearningMode } from './domain/game';
import { clearGameCheckpoint, readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { grammarCaption, makeGrammarChecks } from './domain/grammarPractice';
import { recordAttempt } from './domain/learningProfile';
import { completeLearningMode } from './domain/learningModes';
import { readLearningActivities, recordLearningActivity } from './domain/learningActivity';
import { readGrammarAttempts } from './domain/grammarMemory';
import { recordChunkExposure, recordSentenceExposure, recordWordRecall } from './domain/memory';
import { getExpandedEnglishSubject, getPlayableGrammar, getSpanishSubjectLabel, getUnitSentences, makeRecallChoices, nextReviewAt, type AtomicUnit, type AtomicWord, type GrammarForm } from './domain/unit';
import { playEnglish, playMiss, playSnap, playSpanish, prefetchSpeech, stopSpeech } from './services/audio';
import type { Appearance } from './useAppearance';
import { syncLabels, type SyncStatus } from './services/progressSync';

function GrammarLesson({ form, baseSpanish, index, total, onReady, onContinue }: {
  form: GrammarForm;
  baseSpanish?: string;
  index: number;
  total: number;
  onReady: () => void;
  onContinue: () => void;
}) {
  const expandedPhrase = (subject: GrammarForm['subjects'][number]) => subject.phrase.replace(subject.en, getExpandedEnglishSubject(subject));
  const [step, setStep] = useState(0);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [joined, setJoined] = useState(false);
  const checks = useMemo(() => makeGrammarChecks(form), [form]);
  const [checkIndex, setCheckIndex] = useState(0);
  const [checkFeedback, setCheckFeedback] = useState<'idle' | 'help' | 'correct'>('idle');
  const ready = step >= 4 && checkIndex >= checks.length;
  const timers = useRef<number[]>([]);
  const subjectTimer = useRef<number | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    let active = true;
    const narrate = async (currentStep: number, english?: string) => {
      const started = performance.now();
      await playSpanish(grammarCaption(form, currentStep, baseSpanish), true);
      if (!active) return;
      if (english) await playEnglish(english, undefined, true);
      if (!active) return;
      // A silent or unavailable voice still leaves enough time to see each piece.
      const remaining = Math.max(0, 1200 - (performance.now() - started));
      if (remaining) await new Promise<void>((resolve) => timers.current.push(window.setTimeout(resolve, remaining)));
    };
    void (async () => {
      await narrate(0, form.englishBase);
      if (!active) return;
      setStep(1); playSnap();
      await narrate(1, form.english);
      if (!active) return;
      setStep(2);
      await narrate(2, expandedPhrase(form.subjects[0]));
      if (!active) return;
      setJoined(true); setStep(3); playSnap();
      await narrate(3, form.subjects[0].phrase);
      if (active) setStep(4);
    })();
    return () => { active = false; stopSpeech(); timers.current.forEach(window.clearTimeout); if (subjectTimer.current !== null) window.clearTimeout(subjectTimer.current); };
  }, [form, baseSpanish]);
  useEffect(() => { if (ready) onReadyRef.current(); }, [ready]);
  function answerCheck(answer: string) {
    const check = checks[checkIndex];
    if (!check || checkFeedback === 'correct') return;
    if (answer !== check.answer) { setCheckFeedback('help'); playMiss(); void playSpanish(check.hint); return; }
    setCheckFeedback('correct');
    playSnap();
    void playEnglish(check.answer);
    timers.current.push(window.setTimeout(() => { setCheckIndex((index) => index + 1); setCheckFeedback('idle'); }, 1600));
  }

  function chooseSubject(next: number) {
    if (step < 4) return;
    if (subjectTimer.current !== null) window.clearTimeout(subjectTimer.current);
    setSubjectIndex(next);
    const subject = form.subjects[next];
    if (getExpandedEnglishSubject(subject) === subject.en) {
      void playEnglish(form.subjects[next].phrase);
      playSnap();
      return;
    }
    setJoined(false);
    const expanded = expandedPhrase(subject);
    void playEnglish(expanded);
    subjectTimer.current = window.setTimeout(() => {
      setJoined(true);
      playSnap();
      void playEnglish(subject.phrase);
    }, 1600);
  }

  return (
    <GameCard onAdvance={ready && joined ? onContinue : undefined} advanceControl advanceLabel={index === total - 1 ? 'Construir frase' : 'Siguiente forma'} reserveFooter revealFooter={ready} className="lesson-card">
      <div className="lesson-content">
        <p className="eyebrow">FORMA {index + 1}/{total}</p>
        <h2 className="sr-only">Del español al inglés</h2>
        <div className="grammar-trick" aria-live="polite"><strong>{step < 4 ? 'EL TRUCO' : ready ? 'YA LO PUEDES USAR' : 'TU TURNO'}</strong><span>{ready ? 'Cambia de persona y escucha cómo suena.' : grammarCaption(form, step, baseSpanish)}</span></div>
        <GrammarMorphology form={form} baseSpanish={baseSpanish} step={step} joined={joined} subjectIndex={subjectIndex} />
        {step >= 4 && checks[checkIndex] ? <div className="grammar-check" aria-live="polite"><small>{checkIndex + 1}/{checks.length}</small><p>{checks[checkIndex].prompt}</p><div>{checks[checkIndex].choices.map((choice) => <button type="button" key={choice} disabled={checkFeedback === 'correct'} onClick={() => answerCheck(choice)}>{choice}</button>)}</div><span>{checkFeedback === 'help' ? checks[checkIndex].hint : checkFeedback === 'correct' ? '¡Lo tienes! Ya puedes usar esta pieza.' : ''}</span></div> : null}
        <div className={`subject-area ${!ready ? 'is-pending' : ''}`} aria-hidden={!ready}>
          {form.subjects.length > 1 ? <div className="subject-list" aria-label="Cambia quién realiza la acción">
            {form.subjects.map((subject, person) => <button type="button" disabled={!ready} key={`${subject.en}-${subject.es}`} onClick={() => chooseSubject(person)} className={person === subjectIndex ? 'is-active' : ''}>{getSpanishSubjectLabel(subject.es, form.spanish)}</button>)}
          </div> : null}
          <button type="button" disabled={!ready} className="listen-again" onClick={() => void playEnglish(form.subjects[subjectIndex].phrase)}>🔊 Escuchar</button>
          {ready ? <button type="button" className="listen-again" onClick={() => void playSpanish(form.memoryTrick?.explanation || grammarCaption(form, 1, baseSpanish))}>🔊 Repetir el truco</button> : null}
        </div>
      </div>
    </GameCard>
  );
}

function AssociationCard({ unit, inspection, word, index, total, userId, location, onConnect }: { unit: AtomicUnit; inspection: boolean; word: AtomicWord; index: number; total: number; userId: string; location?: string; onConnect: () => void }) {
  const { audioState, listen } = useAssociationAudio(word);
  const [reconstruct, setReconstruct] = useState(false);
  const rejectionKey = `memora-v2.rejected-association.${userId}.${word.en.toLocaleLowerCase('en-US')}`;
  const [associationRejected, setAssociationRejected] = useState(() => localStorage.getItem(rejectionKey) === '1');

  function connect() {
    stopSpeech();
    if (word.reconstruction && !associationRejected) setReconstruct(true);
    else onConnect();
  }
  if (reconstruct) return <SceneReconstruction unit={unit} word={word} userId={userId} inspection={inspection} onContinue={onConnect} />;
  if (word.associationMode === 'cognate') return <CognateAssociationCard word={word} index={index} total={total} audioState={audioState} onListen={listen} onConnect={connect} />;

  return <GameCard onAdvance={connect} advanceControl={!word.reconstruction || associationRejected} advanceLabel="Ya la he imaginado" back={<div className="hint-face"><SceneVisual word={word} showMemoryLink />{word.bridge ? <><p className="eyebrow">PUENTE SONORO</p><strong>{word.bridge}</strong></> : null}<p><MnemonicSceneText word={word} /></p></div>}>
    <div className="association-content is-revealed">
      {location ? <p className="association-location">{location}</p> : null}
      <p className="eyebrow">ASOCIACIÓN {index + 1}/{total}</p><WordHeading en={word.en} es={word.es.toUpperCase()} /><p className="ipa">{word.ipa}</p><SceneVisual word={word} showMemoryLink={!associationRejected} /><div className={`bridge-row ${word.bridge && !associationRejected ? '' : 'is-direct'}`}>{word.bridge && !associationRejected ? <div><small>SUENA A</small><b>{word.bridge}</b></div> : <div><small>IMAGEN DIRECTA</small><b>Sin palabra puente</b></div>}<button type="button" className="round-audio" onClick={listen} aria-label={`Escuchar ${word.en}`}>🔊</button></div><AssociationAudioStatus state={audioState} />{associationRejected ? <p className="scene-copy">Mira, escucha y conecta directamente con <strong>{word.es.toUpperCase()}</strong>.</p> : <p className="scene-copy"><MnemonicSceneText word={word} /></p>}
      {word.bridge ? <button type="button" className="association-reject" onClick={() => { const next = !associationRejected; setAssociationRejected(next); if (next) localStorage.setItem(rejectionKey, '1'); else localStorage.removeItem(rejectionKey); }}>{associationRejected ? 'Volver a usar el puente' : 'Esta asociación no me ayuda'}</button> : null}
      {word.reconstruction ? <><small>{word.bridgeEvidence?.soundRelation}</small><button type="button" className="quiet-action" onClick={connect}>Ya lo he imaginado →</button></> : null}
    </div>
  </GameCard>;
}

export function LanguageGame({ unit, userId, learningMode = 'adventure', preview = false, reviewMode = false, startInConversation = false, nextLabel = 'Seguir →', positionLabel = 'EN JUEGO', syncStatus, onFinished, onNext, onExit, onEvolution, onPractice, onComplete, appearance, onToggleAppearance }: { unit: AtomicUnit; userId: string; learningMode?: LearningMode; preview?: boolean; reviewMode?: boolean; startInConversation?: boolean; nextLabel?: string; positionLabel?: string; syncStatus?: SyncStatus; onFinished?: () => void; onNext: () => void; onExit: () => void; onEvolution?: () => void; onPractice?: () => void; onComplete?: (result: { correct: number; attempted: number }) => void; appearance: Appearance; onToggleAppearance: () => void }) {
  const checkpointId = learningMode === 'adventure' ? unit.id : `${unit.id}:${learningMode}`;
  const [state, dispatch] = useReducer(gameReducer, initialGame, () => {
    const start = learningMode === 'grammar' ? { ...initialGame, phase: 'grammar' as const } : initialGame;
    if (reviewMode) return start;
    if (startInConversation && unit.communication?.dialogue) return { ...initialGame, phase: 'conversation' as const };
    const saved = readGameCheckpoint(userId, checkpointId, unit.contentVersion ?? '1');
    if (!saved) return start;
    if (saved.wordIndex >= unit.words.length || saved.recallIndex >= unit.words.length || saved.grammarIndex >= Math.max(1, getPlayableGrammar(unit).length) || saved.sentenceIndex >= getUnitSentences(unit).length) return start;
    if (saved.phase === 'conversation' && !unit.communication?.dialogue) return initialGame;
    const preparedSteps = getUnitSentences(unit)[saved.sentenceIndex]?.slots[saved.filledSlots]?.preparation?.length ?? 0;
    return saved.preparationStep !== undefined && saved.preparationStep > preparedSteps ? { ...saved, preparationStep: 0 } : saved;
  });
  const [expandedGrammarIndex, setExpandedGrammarIndex] = useState<number | null>(null);
  const [recallFeedback, setRecallFeedback] = useState<'idle' | 'correct' | 'wrong' | 'missed'>('idle');
  const recallStartedAt = useRef(0);
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const sentences = useMemo(() => {
    const authored = getUnitSentences(unit);
    if (learningMode !== 'grammar') return authored;
    const form = getPlayableGrammar(unit).at(-1);
    const subject = form?.subjects[0];
    if (!form || !subject) return authored;
    const es = `${subject.reducedEs || subject.es} ${form.spanish}`;
    // A grammar-only check does not practice the longer mission sentence.
    return [{ ...authored[0], en: subject.phrase, es, slots: [{ en: subject.phrase, es, choices: [subject.phrase, `I ${form.english}`] as [string, string] }] }];
  }, [unit, learningMode]);
  const grammarForms = useMemo(() => getPlayableGrammar(unit), [unit]);
  const currentForm = grammarForms[state.grammarIndex];
  const baseSpanish = unit.words.find((word) => word.en.toLowerCase() === currentForm?.englishBase?.toLowerCase())?.es.toLowerCase();
  const currentLesson = useMemo(() => currentForm ? lessonForForm(currentForm, baseSpanish) : null, [currentForm, baseSpanish]);
  const canFastReview = Boolean(learningMode !== 'grammar') && unit.grammarRole === 'review' && (reviewMode || Boolean(currentLesson && readGrammarAttempts(userId).some((attempt) => attempt.unitId !== unit.id && attempt.skill === currentLesson.id && attempt.correct)));
  const sentence = sentences[state.sentenceIndex];
  const transitionTimer = useRef<number | null>(null);
  const locked = useRef(false);
  const completedSession = useRef(false);
  const sessionStarted = useRef(new Date().toISOString());
  const previousConstructionAttempt = useRef<string>();
  const usedReviewJump = useRef(false);
  const word = unit.words[state.wordIndex];
  const acquisitionIndexes = unit.words.map((item, index) => item.learningRole === 'review' ? -1 : index).filter((index) => index >= 0);
  const recallWord = unit.words[recalledWordIndex(unit, state.recallIndex)];
  const choices = useMemo(() => makeRecallChoices(unit, recalledWordIndex(unit, state.recallIndex), sessionSeed), [unit, state.recallIndex, sessionSeed]);
  const nextAssociationWord = unit.words[acquisitionIndexes[acquisitionIndexes.indexOf(state.wordIndex) + 1]];

  useEffect(() => () => stopSpeech(), [state.phase, state.recallIndex]);

  useEffect(() => {
    if (state.phase === 'associate' && nextAssociationWord) prefetchSpeech(nextAssociationWord.en.toLowerCase(), nextAssociationWord.audioUrl);
  }, [state.phase, nextAssociationWord]);

  useEffect(() => {
    if (reviewMode || startInConversation) return;
    if (state.phase === 'complete' || learningMode === 'vocabulary' && state.phase === 'reward') clearGameCheckpoint(userId, checkpointId);
    else writeGameCheckpoint(userId, checkpointId, unit.contentVersion ?? '1', state);
  }, [reviewMode, startInConversation, state, unit.contentVersion, checkpointId, userId, learningMode]);

  useEffect(() => {
    if (reviewMode) return;
    if (state.phase === 'grammar') prefetchSpeech(grammarForms[state.grammarIndex].subjects[0].phrase);
  }, [reviewMode, state.phase, state.grammarIndex, grammarForms]);

  useEffect(() => {
    if (state.phase === 'recall') prefetchSpeech(recallWord.en.toLowerCase());
  }, [state.phase, state.recallIndex, recallWord.en]);

  useEffect(() => {
    if (state.phase !== 'recall' || state.recallAnswered) return undefined;
    locked.current = false;
    setRecallFeedback('idle');
    recallStartedAt.current = performance.now();
    return undefined;
  }, [state.phase, state.recallIndex, state.recallAnswered]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  useEffect(() => {
    if ((state.phase !== 'complete' && !(learningMode === 'vocabulary' && state.phase === 'reward')) || completedSession.current) return;
    completedSession.current = true;
    if (reviewMode || startInConversation) {
      return;
    }
    const finished = new Date();
    const grammarAttempts = learningMode === 'grammar' ? readLearningActivities(userId).filter((activity) => activity.unitId === unit.id && activity.at >= sessionStarted.current && activity.source === 'learner' && activity.correct !== null && ['grammar', 'construction'].includes(activity.phase)) : [];
    const result = { correct: learningMode === 'grammar' ? grammarAttempts.filter((attempt) => attempt.correct).length : state.correct, attempted: learningMode === 'grammar' ? grammarAttempts.length : unit.words.length, completedAt: finished.toISOString(), nextReviewAt: nextReviewAt(finished, state.correct === unit.words.length ? 0 : -1).toISOString() };
    try {
      completeLearningMode(userId, unit, learningMode, result);
      onFinished?.();
    } catch { /* sin persistencia en modo privado */ }
  }, [onComplete, reviewMode, startInConversation, state.phase, state.correct, unit.id, userId, learningMode]);

  const advanceRecall = useCallback(() => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    dispatch({ type: 'nextRecall', wordCount: unit.words.length });
  }, [unit.words.length]);

  useEffect(() => {
    if (!unit.activeRecall && state.phase === 'recall' && state.recallAnswered && transitionTimer.current === null) {
      // A reload during answer feedback must continue without recording the answer twice.
      transitionTimer.current = window.setTimeout(advanceRecall, 1100);
    }
  }, [advanceRecall, state.phase, state.recallAnswered, unit.activeRecall]);

  const answerRecall = useCallback((chosen: string | null) => {
    if (locked.current || state.phase !== 'recall' || state.recallAnswered) return;
    locked.current = true;
    const correct = chosen === recallWord.en;
    if (!reviewMode) {
      const at = new Date();
      recordAttempt(userId, { unitId: unit.id, wordId: recallWord.id, word: recallWord.en, correct, at: at.toISOString(), direction: 'recognition', error: correct ? undefined : 'meaning' });
      recordWordRecall(userId, recallWord, !correct ? 'missed' : performance.now() - recallStartedAt.current > 5000 ? 'hesitant' : 'quick', at, 'recognition', correct ? undefined : 'meaning', true);
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `word-${recallWord.en}`, skill: recallWord.en, phase: 'arcade', source: 'learner', modality: 'choice', prompt: recallWord.es, response: chosen ?? '', expected: recallWord.en, correct, helped: true, feedback: correct ? 'Reconocida entre opciones; aún no demuestra recuerdo sin pistas.' : recallWord.scene });
    }
    dispatch({ type: 'answered', correct });
    setRecallFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      playSnap();
      void playEnglish(recallWord.en.toLowerCase(), recallWord.audioUrl);
    } else playMiss();
    transitionTimer.current = window.setTimeout(advanceRecall, correct ? 1100 : 5000);
  }, [advanceRecall, recallWord, reviewMode, state.phase, state.recallAnswered, unit.id, userId]);

  function jumpToStep(value: string) {
    usedReviewJump.current = true;
    const [phase, indexText] = value.split('-');
    const index = Number(indexText) || 0;
    if (!['associate', 'recall', 'reward', 'grammar', 'build', 'conversation', 'complete'].includes(phase)) return;
    if (phase === 'conversation' && !unit.communication?.dialogue) return;
    if (phase === 'grammar' && index >= grammarForms.length) return;
    if (phase === 'build' && index >= sentences.length) return;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    locked.current = false;
    setRecallFeedback('idle');
    dispatch({ type: 'reviewJump', phase: phase as typeof state.phase, index });
  }

  const currentReviewStep = `${state.phase}-${state.phase === 'associate' ? state.wordIndex : state.phase === 'recall' ? state.recallIndex : state.phase === 'grammar' ? state.grammarIndex : state.phase === 'build' ? state.sentenceIndex : 0}`;

  const acquisitionPosition = Math.max(0, acquisitionIndexes.indexOf(state.wordIndex));
  const finishUnit = () => {
    if (onComplete) onComplete({ correct: state.correct, attempted: usedReviewJump.current ? 0 : unit.words.length });
    else onNext();
  };
  const leaveReward = () => learningMode === 'vocabulary' ? onNext() : dispatch({ type: 'continue' });
  const adventureProgress = state.phase === 'associate' ? Math.round(((acquisitionPosition + 1) / acquisitionIndexes.length) * 35)
    : state.phase === 'recall' ? 35 + Math.round(((state.recallIndex + 1) / unit.words.length) * 25)
      : state.phase === 'reward' ? 60 : state.phase === 'grammar' ? 60 + Math.round(state.grammarIndex * 12 / grammarForms.length)
        : state.phase === 'build' ? 72 + Math.round((state.sentenceIndex + state.filledSlots / sentence.slots.length) * 18 / sentences.length) : state.phase === 'conversation' ? 94 : 100;
  const progress = learningMode === 'vocabulary' ? Math.min(100, Math.round(adventureProgress / 60 * 100)) : learningMode === 'grammar' ? Math.min(100, Math.max(0, Math.round((adventureProgress - 60) / 40 * 100))) : adventureProgress;

  return (
    <main className="game-screen">
      <header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Recorrido</button><span>MEMORA <small>· {reviewMode ? 'REVISIÓN' : preview ? 'VISTA PREVIA' : positionLabel}</small></span><div className="game-topbar-actions"><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`} title={`Modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><span>{progress}%</span></div></header>
      <div className="game-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
      <p className="game-save-status" role="status">{reviewMode ? 'Vista de revisión · no guarda progreso' : syncStatus ? syncLabels[syncStatus] : 'Progreso en este dispositivo'}</p>
      {reviewMode && learningMode === 'adventure' ? <nav className="review-nav" aria-label="Revisar pasos de la unidad"><label htmlFor="review-step">Revisar fase</label><select id="review-step" value={currentReviewStep} onChange={(event) => jumpToStep(event.target.value)}>{unit.words.map((item, index) => <option key={`associate-${index}`} value={`associate-${index}`}>{index + 1}. Asociación {item.en}</option>)}{unit.words.map((_, index) => <option key={`recall-${index}`} value={`recall-${index}`}>Recordar {unit.words[recalledWordIndex(unit, index)].en}</option>)}<option value="reward-0">Resultado de memoria</option>{grammarForms.map((form, index) => <option key={`grammar-${index}`} value={`grammar-${index}`}>Transformación {index + 1}: {form.english}</option>)}{sentences.map((_, index) => <option key={`build-${index}`} value={`build-${index}`}>Construir frase {index + 1}/{sentences.length}</option>)}{unit.communication?.dialogue ? <option value="conversation-0">Practicar conversación</option> : null}<option value="complete-0">Final de unidad</option></select><span>No guarda progreso</span></nav> : null}
      <section className="game-stage" aria-live="off">
        {state.phase === 'associate' ? <AssociationCard key={`associate-${state.wordIndex}`} unit={unit} inspection={reviewMode} word={word} index={acquisitionPosition} total={acquisitionIndexes.length} userId={userId} location={unit.location?.label} onConnect={() => { const next = acquisitionIndexes[acquisitionPosition + 1]; playSnap(); dispatch({ type: 'connected', isLast: next === undefined, nextWordIndex: next, wordCount: unit.words.length }); }} /> : null}

        {state.phase === 'recall' && unit.activeRecall ? <ActiveRecallCard key={`active-recall-${state.recallIndex}`} unit={unit} word={recallWord} choices={choices} position={state.recallIndex} userId={userId} inspection={reviewMode} onFinish={(independent) => { dispatch({ type: 'answered', correct: independent }); dispatch({ type: 'nextRecall', wordCount: unit.words.length }); }} /> : null}

        {state.phase === 'recall' && !unit.activeRecall ? <GameCard key={`recall-${state.recallIndex}`} className={recallFeedback === 'wrong' ? 'recall-wrong' : recallFeedback === 'correct' ? 'recall-correct' : 'recall-calm'}>
          <div className="recall-content"><p className="eyebrow">RECUERDA · {state.recallIndex + 1}/{unit.words.length} <span key={state.combo} className={state.combo > 1 ? 'combo-hot' : ''}>COMBO x{Math.max(1, state.combo)}</span></p><SceneVisual hideAnswer={recallFeedback === 'idle'} word={recallWord} showMemoryLink={recallFeedback === 'wrong' || recallFeedback === 'missed'} /><h1>¿Cómo se dice <em>{recallWord.es}</em>?</h1><div className="recall-answer-slot" aria-live="polite">{recallFeedback === 'wrong' || recallFeedback === 'missed' ? <div className="recall-hint"><p>Vuelve a la escena:</p><strong>{recallWord.bridge ? `${recallWord.bridge} → ` : ''}{recallWord.en}</strong><small>{recallWord.es.toUpperCase()}</small><p className="recall-memory-scene"><MnemonicSceneText word={recallWord} /></p></div> : recallFeedback === 'correct' ? <p className="success-copy">¡CLAC! +10 XP</p> : <div className="recall-choices">{choices.map((choice) => <button type="button" disabled={recallFeedback !== 'idle'} onClick={() => answerRecall(choice.en)} key={choice.id}>{choice.en}</button>)}</div>}</div></div>
        </GameCard> : null}

        {state.phase === 'reward' ? <GameCard key="reward" onAdvance={leaveReward} advanceLabel={learningMode === 'vocabulary' ? 'Más palabras' : 'Usar las palabras'}>
          <div className="reward-content"><SceneVisual word={unit.words[0]} compact />{state.correct >= Math.min(2, unit.words.length) ? <div className="reward-burst" aria-hidden="true">✨</div> : null}<p className="eyebrow">{state.correct}/{unit.words.length} {unit.activeRecall ? 'RECORDADAS SIN PISTAS' : 'RECONOCIDAS'}</p><h1>{learningMode === 'vocabulary' ? 'Más palabras para ti.' : 'Ahora, úsalas con Emma.'}</h1><p className="reward-note">Con ayuda o sin ella, has practicado. El repaso volverá a las que lo necesiten.</p><button type="button" className="primary-action" onClick={leaveReward}>{learningMode === 'vocabulary' ? nextLabel : 'Usar las palabras →'}</button>{onPractice ? <button type="button" className="arcade-invitation" onClick={onPractice}>✦ Jugar con mis asociaciones</button> : null}{learningMode === 'vocabulary' ? <button type="button" className="quiet-action" onClick={onExit}>Terminar por ahora</button> : null}</div>
        </GameCard> : null}

        {state.phase === 'grammar' ? canFastReview && expandedGrammarIndex !== state.grammarIndex ? <GameCard key={`grammar-revisit-${state.grammarIndex}`} className="grammar-review-card"><div className="reward-content"><p className="eyebrow">ESTE TRUCO YA LO HAS VISTO</p><h1>Vamos a usarlo en una frase.</h1><p><strong lang="es">{currentForm.spanish}</strong> → <strong lang="en">{currentForm.english}</strong></p><button type="button" className="primary-action" onClick={() => { dispatch({ type: 'grammarPlayed' }); dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' }); }}>Usarlo ahora →</button><button type="button" className="quiet-action" onClick={() => setExpandedGrammarIndex(state.grammarIndex)}>Volver a ver el truco</button></div></GameCard> : currentLesson ? <GrammarCoach key={currentForm.id} lesson={currentLesson} form={currentForm} userId={userId} unitId={unit.id} unitTitle={unit.title} contentVersion={unit.contentVersion ?? '1'} conversationAnswers={learningMode === 'adventure' ? conversationPracticeAnswers(unit, demonstratedConversationQuestionSkills(readGrammarAttempts(userId))) : []} reviewMode={reviewMode} onReady={() => dispatch({ type: 'grammarPlayed' })} onContinue={() => dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' })} /> : <GrammarLesson key={currentForm.id} form={currentForm} baseSpanish={baseSpanish} index={state.grammarIndex} total={grammarForms.length} onReady={() => dispatch({ type: 'grammarPlayed' })} onContinue={() => dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' })} /> : null}

        {state.phase === 'build' ? <SentenceBuilderCard key={`build-${state.sentenceIndex}`} sentence={sentence} sceneWord={unit.words[0]} processForm={unit.grammar.find((form) => form.id === 'ing') ?? unit.grammar[0]} index={state.sentenceIndex} total={sentences.length} filledSlots={state.filledSlots} choiceSeed={sessionSeed + state.sentenceIndex}
          preparationStep={state.preparationStep ?? 0} onPreparationChange={(step) => dispatch({ type: 'prepareSlot', sentenceIndex: state.sentenceIndex, slotIndex: state.filledSlots, step, stepCount: sentence.slots[state.filledSlots]?.preparation?.length ?? 0 })}
          onAttempt={(choice, correct, slotIndex) => { if (!reviewMode) { const slot = sentence.slots[slotIndex]; const item = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `build-${state.sentenceIndex}-${slotIndex}`, skill: currentForm.id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, feedback: correct ? 'Pieza colocada.' : `Para «${slot.es}», compara las piezas y prueba otra vez.`, parentAttemptId: previousConstructionAttempt.current }); previousConstructionAttempt.current = correct ? undefined : item.id; } }} onPick={() => { if (!reviewMode) { recordChunkExposure(userId, unit.id, sentence, state.filledSlots); if (state.filledSlots === sentence.slots.length - 1) { recordSentenceExposure(userId, unit.id, sentence); recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `constructed-${state.sentenceIndex}`, skill: currentForm.id, phase: 'construction', source: 'learner', modality: 'choice', prompt: sentence.es, response: sentence.en, expected: sentence.en, correct: true, helped: true, feedback: 'Frase construida con piezas.' }); } } dispatch({ type: 'chooseSlot', correct: true, slotCount: sentence.slots.length }); }} onNext={() => dispatch({ type: 'continue', sentenceCount: sentences.length, slotCount: sentence.slots.length, conversation: learningMode === 'adventure' && Boolean(unit.communication?.dialogue) })} /> : null}
        {state.phase === 'conversation' && unit.communication?.dialogue ? <ConversationPractice unit={unit} userId={userId} reviewMode={reviewMode} onContinue={() => dispatch({ type: 'continue' })} /> : null}

{state.phase === 'complete' ? <GameCard key="complete" className="complete-card" onAdvance={onEvolution ? undefined : finishUnit} advanceLabel=""><div className="complete-content"><div className="reward-burst" aria-hidden="true">✦</div><p className="eyebrow">{reviewMode ? 'VISTA DE REVISIÓN' : 'MUNDO 1 · ESCENA CONSEGUIDA'}</p><h1>{learningMode === 'grammar' ? 'Has practicado el truco.' : unit.communication?.dialogue ? 'Has practicado la escena.' : unit.communication?.intent ? 'Ya puedes usarlo.' : '¡Ya puedes decirlo!'}</h1>{unit.communication?.intent ? <p className="capability-earned">{unit.communication?.dialogue ? 'Has trabajado: ' : '✓ '}{unit.communication.intent}</p> : null}<p className="assembled-phrase">{sentences[sentences.length - 1].en}</p><p className="subject-translation">{sentences[sentences.length - 1].es}</p><EchoPractice phrase={sentences[sentences.length - 1].en} parts={sentences[sentences.length - 1].slots.map((slot) => slot.en)} reply={unit.communication?.reply} />{!reviewMode ? <p className="next-review">Volveremos a esta escena {state.correct === unit.words.length ? 'en 1 hora' : 'en 10 minutos'} para fijarla.</p> : null}<div className="complete-voluntary"><button type="button" className="primary-action" onClick={finishUnit}>{nextLabel}</button>{onPractice ? <button type="button" className="arcade-invitation" onClick={onPractice}>✦ Arcade de asociaciones</button> : null}{onEvolution ? <button type="button" onClick={onEvolution}>Ver Mi evolución</button> : null}<button type="button" className="quiet-action" onClick={onExit}>Terminar por hoy</button></div></div></GameCard> : null}
      </section>
    </main>
  );
}
