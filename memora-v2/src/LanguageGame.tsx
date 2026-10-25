import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GameCard } from './components/GameCard';
import { WordHeading } from './components/WordHeading';
import { CognateAssociationCard } from './components/CognateAssociationCard';
import { useAssociationAudio } from './components/useAssociationAudio';
import { AssociationAudioStatus } from './components/AssociationAudioStatus';
import { EchoPractice } from './components/EchoPractice';
import { PracticeClosure } from './components/PracticeClosure';
import { GrammarMorphology } from './components/GrammarMorphology';
import { GrammarCoach } from './components/GrammarCoach';
import { ConversationPractice } from './components/ConversationPractice';
import { ActiveRecallCard, SceneReconstruction } from './components/ActiveRecallCard';
import { recalledWordIndex, summarizeActiveRecall } from './domain/activeRecall';
import { lessonForForm } from './domain/grammarLesson';
import { conversationPracticeAnswers, demonstratedConversationQuestionSkills } from './domain/conversation';
import { MnemonicSceneText, SceneVisual } from './components/SceneVisual';
import { SentenceBuilderCard } from './components/SentenceBuilderCard';
import { constructionFeedback } from './domain/sentenceConstruction';
import { BridgeSoundNote } from './components/BridgeSoundNote';
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
import { PlayHeader } from './components/PlayHeader';
import { WordSceneDelivery } from './components/WordSceneDelivery';
import { WordAssembly } from './components/WordAssembly';

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

function AssociationCard({ unit, inspection, word, index, total, userId, location, onConnect, vertical = false }: { unit: AtomicUnit; inspection: boolean; word: AtomicWord; index: number; total: number; userId: string; location?: string; onConnect: () => void; vertical?: boolean }) {
  const { audioState, listen } = useAssociationAudio(word);
  const [reconstruct, setReconstruct] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const rejectionKey = `memora-v2.rejected-association.${userId}.${word.en.toLocaleLowerCase('en-US')}`;
  const [associationRejected, setAssociationRejected] = useState(() => localStorage.getItem(rejectionKey) === '1');

  function connect() {
    stopSpeech();
    if (word.reconstruction && !associationRejected) setReconstruct(true);
    else if (vertical && !inspection) setAssembling(true);
    else onConnect();
  }
  if (assembling) return <WordAssembly vertical={vertical} word={word} onContinue={onConnect} />;
  if (reconstruct) return <SceneReconstruction vertical={vertical} unit={unit} word={word} userId={userId} inspection={inspection} onContinue={() => { if (vertical && !inspection) setAssembling(true); else onConnect(); }} />;
  if (word.associationMode === 'cognate') return <CognateAssociationCard vertical={vertical} word={word} index={index} total={total} audioState={audioState} onListen={listen} onConnect={connect} />;

  return <GameCard vertical={vertical} onAdvance={connect} advanceControl={!word.reconstruction || associationRejected} advanceLabel="Ya la he imaginado" back={<div className="hint-face"><SceneVisual word={word} showMemoryLink />{word.bridge ? <><p className="eyebrow">PUENTE SONORO</p><strong>{word.bridge}</strong></> : null}<p><MnemonicSceneText word={word} /></p></div>}>
    <div className="association-content is-revealed">
      {location ? <p className="association-location">{location}</p> : null}
      <p className="eyebrow">PALABRA {index + 1}/{total}</p>
      <div className="association-word-top"><WordHeading en={word.en} es={word.es.toUpperCase()} /><button type="button" className="round-audio" onClick={listen} aria-label={`Escuchar ${word.en}`}>🔊</button></div>
      <SceneVisual word={word} showMemoryLink={!associationRejected} />
      {associationRejected ? <p className="scene-copy">Mira, escucha y conecta directamente con <strong>{word.es.toUpperCase()}</strong>.</p> : <p className="scene-copy"><MnemonicSceneText word={word} /></p>}
      <p className="association-instruction">{word.bridge && !associationRejected ? <>Imagina la historia. El puente te ayuda a recordar; 🔊 enseña el sonido inglés.</> : <>Mira la escena y escucha la palabra inglesa.</>}</p>
      <details className="association-help"><summary>Sonido y ayuda para recordar</summary><p className="ipa">{word.ipa}</p><AssociationAudioStatus state={audioState} />{word.bridge && !associationRejected ? <div className="bridge-row"><div><small>RECUERDA CON</small><b>{word.bridge}</b></div></div> : null}{!associationRejected ? <BridgeSoundNote word={word} explain /> : null}
      {word.bridge ? <button type="button" className="association-reject" onClick={() => { const next = !associationRejected; setAssociationRejected(next); if (next) localStorage.setItem(rejectionKey, '1'); else localStorage.removeItem(rejectionKey); }}>{associationRejected ? 'Volver a usar el puente' : 'Esta asociación no me ayuda'}</button> : null}
      </details>
      {word.reconstruction && !vertical ? <button type="button" className="quiet-action" onClick={connect}>Ya lo he imaginado →</button> : null}
    </div>
  </GameCard>;
}

export function LanguageGame({ unit, userId, learningMode = 'adventure', preview = false, reviewMode = false, startInConversation = false, nextLabel = 'Seguir →', positionLabel = 'EN JUEGO', syncStatus, onFinished, onNext, onExit, onEvolution, onPractice, onComplete, appearance, onToggleAppearance }: { unit: AtomicUnit; userId: string; learningMode?: LearningMode; preview?: boolean; reviewMode?: boolean; startInConversation?: boolean; nextLabel?: string; positionLabel?: string; syncStatus?: SyncStatus; onFinished?: () => void; onNext: () => void; onExit: () => void; onEvolution?: () => void; onPractice?: () => void; onComplete?: (result: { correct: number; attempted: number }) => void; appearance: Appearance; onToggleAppearance: () => void }) {
  const vertical = learningMode === 'vocabulary' && !reviewMode;
  const checkpointId = learningMode === 'adventure' ? unit.id : `${unit.id}:${learningMode}`;
  const [state, dispatch] = useReducer(gameReducer, initialGame, () => {
    const start = learningMode === 'grammar' ? { ...initialGame, phase: 'grammar' as const } : vertical && !unit.activeRecall
      ? { ...initialGame, recognitionStyle: 'scene-delivery-v1' as const } : initialGame;
    if (reviewMode) return start;
    if (startInConversation && unit.communication?.dialogue) return { ...initialGame, phase: 'conversation' as const };
    const saved = readGameCheckpoint(userId, checkpointId, unit.contentVersion ?? '1');
    if (!saved) return start;
    if ((saved.recognitionModels ?? 0) > unit.words.length) return start;
    if (saved.recognitionStyle === 'scene-delivery-v1' && saved.recognitionModels === undefined) {
      // Additive compatibility with the just-published model outcome: restore
      // actual consultations since this unit's last completed vocabulary run.
      const events = readLearningActivities(userId).filter((event) => event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1'));
      const lastComplete = events.reduce((last, event, index) => event.activityId === 'vocabulary-completed' ? index : last, -1);
      const visited = new Set(unit.words.slice(0, saved.recallIndex + Number(saved.recallAnswered)).map((item) => item.en));
      const models = new Set(events.slice(lastComplete + 1).filter((event) => event.source === 'authored' && event.correct === null && event.activityId === `word-scene-model-v1:${event.skill}` && visited.has(event.skill)).map((event) => event.skill));
      if (saved.recallOutcome === 'modeled') models.add(unit.words[saved.recallIndex]?.en);
      saved.recognitionModels = models.size;
    }
    if (saved.wordIndex >= unit.words.length || saved.recallIndex >= unit.words.length || saved.grammarIndex >= Math.max(1, getPlayableGrammar(unit).length) || saved.sentenceIndex >= getUnitSentences(unit).length) return start;
    if (saved.phase === 'conversation' && !unit.communication?.dialogue) return initialGame;
    if (saved.phase === 'build' && !saved.buildRepair) {
      const slot = getUnitSentences(unit)[saved.sentenceIndex]?.slots[saved.filledSlots];
      const activityId = `build-${saved.sentenceIndex}-${saved.filledSlots}`;
      const recent = readLearningActivities(userId).filter((event) => event.unitId === unit.id && event.contentVersion === (unit.contentVersion ?? '1') && event.phase === 'construction' && [activityId, `build-model-${saved.sentenceIndex}-${saved.filledSlots}`, `constructed-${saved.sentenceIndex}`].includes(event.activityId)).reverse();
      const errors = [];
      for (const event of recent) {
        if (!slot || event.activityId !== activityId || event.source !== 'learner' || event.correct !== false || event.expected !== slot.en || event.prompt !== slot.es || !slot.choices.includes(event.response)) break;
        errors.push(event);
        if (errors.length === 2) break;
      }
      if (errors.length) saved.buildRepair = { failures: errors.length, choice: errors[0].response, previousAttemptId: errors[0].id };
    }
    const preparedSteps = getUnitSentences(unit)[saved.sentenceIndex]?.slots[saved.filledSlots]?.preparation?.length ?? 0;
    return saved.preparationStep !== undefined && saved.preparationStep > preparedSteps ? { ...saved, preparationStep: 0 } : saved;
  });
  const [expandedGrammarIndex, setExpandedGrammarIndex] = useState<number | null>(null);
  const [recallFeedback, setRecallFeedback] = useState<'idle' | 'correct' | 'wrong' | 'missed'>(() => state.phase === 'recall' && state.recallAnswered ? state.recallOutcome === 'modeled' ? 'missed' : state.recallOutcome ?? 'missed' : 'idle');
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
  // Capture before the completion effect appends its neutral closure event.
  const recallSummary = useMemo(() => unit.activeRecall && learningMode !== 'grammar'
    ? summarizeActiveRecall(readLearningActivities(userId), unit, learningMode) : undefined,
  [unit, userId, learningMode, state.phase, state.recallIndex]);
  const previousConstructionAttempt = useRef<string | undefined>(state.buildRepair?.previousAttemptId);
  const constructionKey = `${state.sentenceIndex}:${state.filledSlots}`;
  const constructionGuard = useRef({ key: constructionKey, failures: state.buildRepair?.failures ?? 0, placed: false });
  if (constructionGuard.current.key !== constructionKey) constructionGuard.current = { key: constructionKey, failures: state.buildRepair?.failures ?? 0, placed: false };
  const usedReviewJump = useRef(false);
  const word = unit.words[state.wordIndex];
  const acquisitionIndexes = unit.words.map((item, index) => item.learningRole === 'review' ? -1 : index).filter((index) => index >= 0);
  const recallWord = unit.words[recalledWordIndex(unit, state.recallIndex)];
  const choices = useMemo(() => makeRecallChoices(unit, recalledWordIndex(unit, state.recallIndex), sessionSeed), [unit, state.recallIndex, sessionSeed]);
  const sceneChoices = useMemo(() => {
    const seed = [...`${unit.id}:${unit.contentVersion ?? '1'}`].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
    const candidates = makeRecallChoices(unit, recalledWordIndex(unit, state.recallIndex), seed);
    // Only previously presented words, with distinct meanings. No catalogue distractors.
    return [recallWord, ...candidates.filter((item) => item.en !== recallWord.en && item.es.trim().toLocaleLowerCase('es') !== recallWord.es.trim().toLocaleLowerCase('es'))].slice(0, 2);
  }, [unit, state.recallIndex, recallWord]);
  const sceneRecognition = vertical && !unit.activeRecall && state.recognitionStyle === 'scene-delivery-v1' && sceneChoices.length === 2;
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
    const result = { correct: learningMode === 'grammar' ? grammarAttempts.filter((attempt) => attempt.correct).length : recallSummary?.correct ?? state.correct, attempted: learningMode === 'grammar' ? grammarAttempts.length : recallSummary?.attempted ?? Math.max(0, unit.words.length - (state.recognitionModels ?? 0)), completedAt: finished.toISOString(), nextReviewAt: nextReviewAt(finished, state.correct === unit.words.length ? 0 : -1).toISOString() };
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
    if (!sceneRecognition && !unit.activeRecall && state.phase === 'recall' && state.recallAnswered && transitionTimer.current === null && (!vertical || state.recallOutcome === 'correct')) {
      // A reload during answer feedback must continue without recording the answer twice.
      transitionTimer.current = window.setTimeout(advanceRecall, 1100);
    }
  }, [advanceRecall, state.phase, state.recallAnswered, state.recallOutcome, unit.activeRecall, vertical, sceneRecognition]);

  const answerRecall = useCallback((chosen: string | null) => {
    if (locked.current || state.phase !== 'recall' || state.recallAnswered) return;
    if (sceneRecognition && !sceneChoices.some((item) => item.en === chosen)) return;
    locked.current = true;
    const correct = chosen === recallWord.en;
    if (!reviewMode) {
      const at = new Date();
      recordAttempt(userId, { unitId: unit.id, wordId: recallWord.id, word: recallWord.en, correct, at: at.toISOString(), direction: 'recognition', error: correct ? undefined : 'meaning' });
      recordWordRecall(userId, recallWord, !correct ? 'missed' : performance.now() - recallStartedAt.current > 5000 ? 'hesitant' : 'quick', at, 'recognition', correct ? undefined : 'meaning', true);
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: sceneRecognition ? `word-scene-v1:${recallWord.en}` : `word-${recallWord.en}`, skill: recallWord.en, phase: 'arcade', source: 'learner', modality: 'choice', prompt: sceneRecognition ? recallWord.en : recallWord.es, response: sceneRecognition ? sceneChoices.find((item) => item.en === chosen)?.es ?? '' : chosen ?? '', expected: sceneRecognition ? recallWord.es : recallWord.en, correct, helped: true, feedback: correct ? 'Reconocida entre opciones; aún no demuestra recuerdo sin pistas.' : recallWord.scene });
    }
    dispatch({ type: 'answered', correct, choice: chosen ?? undefined });
    setRecallFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      playSnap();
      void playEnglish(recallWord.en.toLowerCase(), recallWord.audioUrl);
    } else playMiss();
    if (!sceneRecognition && (correct || !vertical)) transitionTimer.current = window.setTimeout(advanceRecall, correct ? 1100 : 5000);
  }, [advanceRecall, recallWord, reviewMode, state.phase, state.recallAnswered, unit.id, userId, vertical, sceneRecognition, sceneChoices]);

  function consultRecognitionModel() {
    if (!sceneRecognition || locked.current || state.phase !== 'recall' || state.recallAnswered) return;
    locked.current = true;
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `word-scene-model-v1:${recallWord.en}`, skill: recallWord.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: recallWord.en, response: `${recallWord.en} → ${recallWord.es}`, expected: '', correct: null, helped: true, feedback: 'Conexión consultada antes de responder. No es un intento correcto ni incorrecto ni recuerdo independiente.' });
    dispatch({ type: 'recognitionModel' });
    setRecallFeedback('missed');
  }

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
  function constructionAttempt(choice: string, correct: boolean, slotIndex: number): false | void {
    const guard = constructionGuard.current;
    const slot = sentence.slots[slotIndex];
    if (guard.key !== constructionKey || guard.placed || guard.failures >= 2 || slotIndex !== state.filledSlots || !slot?.choices.includes(choice)) return false;
    if (!correct) guard.failures += 1;
    let attemptId: string | undefined;
    if (!reviewMode) {
      const item = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `build-${state.sentenceIndex}-${slotIndex}`, skill: currentForm.id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, feedback: constructionFeedback(sentence, slotIndex, choice, unit.words), parentAttemptId: previousConstructionAttempt.current });
      attemptId = item.id;
    }
    previousConstructionAttempt.current = correct ? undefined : attemptId;
    if (!correct) dispatch({ type: 'constructionError', slotIndex, choice, previousAttemptId: attemptId });
  }
  function placeConstruction(withModel = false) {
    const guard = constructionGuard.current;
    if (state.phase !== 'build' || guard.key !== constructionKey || state.filledSlots >= sentence.slots.length || guard.placed || (withModel ? guard.failures < 2 : guard.failures >= 2)) return;
    guard.placed = true;
    if (!reviewMode) {
      const slot = sentence.slots[state.filledSlots];
      if (withModel) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `build-model-${state.sentenceIndex}-${state.filledSlots}`, skill: currentForm.id, phase: 'construction', source: 'authored', modality: 'choice', prompt: slot.es, response: slot.en, expected: '', correct: null, helped: true, parentAttemptId: previousConstructionAttempt.current, feedback: 'Pieza colocada con modelo; no es un acierto.' });
      recordChunkExposure(userId, unit.id, sentence, state.filledSlots);
      if (state.filledSlots === sentence.slots.length - 1) {
        recordSentenceExposure(userId, unit.id, sentence);
        recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `constructed-${state.sentenceIndex}`, skill: currentForm.id, phase: 'construction', source: withModel || state.buildModelUsed ? 'authored' : 'learner', modality: 'choice', prompt: sentence.es, response: sentence.en, expected: withModel || state.buildModelUsed ? '' : sentence.en, correct: withModel || state.buildModelUsed ? null : true, helped: true, feedback: withModel || state.buildModelUsed ? 'Frase montada consultando un modelo; pendiente de práctica.' : 'Frase construida con piezas.' });
      }
    }
    previousConstructionAttempt.current = undefined;
    dispatch({ type: 'chooseSlot', correct: true, slotCount: sentence.slots.length, withModel });
  }
  const finishUnit = () => {
    if (onComplete) onComplete({ correct: recallSummary?.correct ?? state.correct, attempted: usedReviewJump.current ? 0 : recallSummary?.attempted ?? unit.words.length });
    else onNext();
  };
  const leaveReward = () => learningMode === 'vocabulary' ? onNext() : dispatch({ type: 'continue' });
  const adventureProgress = state.phase === 'associate' ? Math.round(((acquisitionPosition + 1) / acquisitionIndexes.length) * 35)
    : state.phase === 'recall' ? 35 + Math.round(((state.recallIndex + 1) / unit.words.length) * 25)
      : state.phase === 'reward' ? 60 : state.phase === 'grammar' ? 60 + Math.round(state.grammarIndex * 12 / grammarForms.length)
        : state.phase === 'build' ? 72 + Math.round((state.sentenceIndex + state.filledSlots / sentence.slots.length) * 18 / sentences.length) : state.phase === 'conversation' ? 94 : 100;
  const progress = learningMode === 'vocabulary' ? Math.min(100, Math.round(adventureProgress / 60 * 100)) : learningMode === 'grammar' ? Math.min(100, Math.max(0, Math.round((adventureProgress - 60) / 40 * 100))) : adventureProgress;
  const intention = { associate: 'Mira, escucha e imagina', recall: unit.activeRecall ? 'Recuerda sin mirar el modelo' : sceneRecognition ? 'Lleva la palabra a su escena' : 'Encuentra la palabra', reward: 'Tanda practicada', grammar: 'Descubre cómo decirlo', build: 'Monta tu mensaje', conversation: 'Responde al personaje', complete: 'Tu mensaje ya tiene sentido' }[state.phase];

  return (
    <main className={`game-screen${!reviewMode ? ' play-flow' : ''}`}>
      {!reviewMode ? <PlayHeader title={intention} onExit={onExit} appearance={appearance} onToggleAppearance={onToggleAppearance} syncStatus={syncStatus} progress={progress} position={positionLabel} trail={vertical ? { steps: ['Imagina', unit.activeRecall ? 'Recuerda' : 'Conecta', 'Tu tanda'], current: state.phase === 'associate' ? 0 : state.phase === 'recall' ? 1 : state.phase === 'reward' ? 2 : -1 } : undefined} /> : <>
      <header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Recorrido</button><span>MEMORA <small>· {reviewMode ? 'REVISIÓN' : preview ? 'VISTA PREVIA' : positionLabel}</small></span><div className="game-topbar-actions"><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`} title={`Modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><span>{progress}%</span></div></header>
      <div className="game-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
      <p className="game-save-status" role="status">{reviewMode ? 'Vista de revisión · no guarda progreso' : syncStatus ? syncLabels[syncStatus] : 'Progreso en este dispositivo'}</p>
      </>}
      {reviewMode && learningMode === 'adventure' ? <nav className="review-nav" aria-label="Revisar pasos de la unidad"><label htmlFor="review-step">Revisar fase</label><select id="review-step" value={currentReviewStep} onChange={(event) => jumpToStep(event.target.value)}>{unit.words.map((item, index) => <option key={`associate-${index}`} value={`associate-${index}`}>{index + 1}. Asociación {item.en}</option>)}{unit.words.map((_, index) => <option key={`recall-${index}`} value={`recall-${index}`}>Recordar {unit.words[recalledWordIndex(unit, index)].en}</option>)}<option value="reward-0">Resultado de memoria</option>{grammarForms.map((form, index) => <option key={`grammar-${index}`} value={`grammar-${index}`}>Transformación {index + 1}: {form.english}</option>)}{sentences.map((_, index) => <option key={`build-${index}`} value={`build-${index}`}>Construir frase {index + 1}/{sentences.length}</option>)}{unit.communication?.dialogue ? <option value="conversation-0">Practicar conversación</option> : null}<option value="complete-0">Final de unidad</option></select><span>No guarda progreso</span></nav> : null}
      <section className="game-stage" aria-live="off">
        {state.phase === 'associate' ? <AssociationCard vertical={vertical} key={`associate-${state.wordIndex}`} unit={unit} inspection={reviewMode} word={word} index={acquisitionPosition} total={acquisitionIndexes.length} userId={userId} location={unit.location?.label} onConnect={() => { const next = acquisitionIndexes[acquisitionPosition + 1]; playSnap(); dispatch({ type: 'connected', isLast: next === undefined, nextWordIndex: next, wordCount: unit.words.length }); }} /> : null}

        {state.phase === 'recall' && unit.activeRecall ? <ActiveRecallCard vertical={vertical} key={`active-recall-${state.recallIndex}`} unit={unit} word={recallWord} choices={choices} position={state.recallIndex} userId={userId} inspection={reviewMode} onFinish={(independent) => { dispatch({ type: 'answered', correct: independent }); dispatch({ type: 'nextRecall', wordCount: unit.words.length }); }} /> : null}

        {state.phase === 'recall' && sceneRecognition ? <GameCard vertical stepKey={state.recallAnswered ? 'scene-result' : 'scene-choice'} onAdvance={state.recallAnswered ? advanceRecall : undefined} advanceLabel={state.recallIndex === unit.words.length - 1 ? 'Ver la tanda practicada' : 'Continuar con otra palabra'} key={`word-scene-${state.recallIndex}`}>
          <div className="recall-content"><p className="eyebrow">CONECTA · {state.recallIndex + 1}/{unit.words.length}</p><WordSceneDelivery word={recallWord} options={sceneChoices} selected={state.recallChoice} answered={state.recallAnswered} correct={state.recallOutcome === 'correct'} modeled={state.recallOutcome === 'modeled'} presentationKey={`${unit.id}:${unit.contentVersion ?? '1'}:${state.recallIndex}`} onAnswer={answerRecall} onModel={consultRecognitionModel} /></div>
        </GameCard> : null}

        {state.phase === 'recall' && !unit.activeRecall && !sceneRecognition ? <GameCard vertical={vertical} onAdvance={vertical && state.recallAnswered && recallFeedback !== 'correct' ? advanceRecall : undefined} advanceLabel="Continuar con otra palabra" key={`recall-${state.recallIndex}`} className={recallFeedback === 'wrong' ? 'recall-wrong' : recallFeedback === 'correct' ? 'recall-correct' : 'recall-calm'}>
          <div className="recall-content"><p className="eyebrow">RECUERDA · {state.recallIndex + 1}/{unit.words.length} <span key={state.combo} className={state.combo > 1 ? 'combo-hot' : ''}>COMBO x{Math.max(1, state.combo)}</span></p><SceneVisual hideAnswer={recallFeedback === 'idle'} word={recallWord} showMemoryLink={recallFeedback === 'wrong' || recallFeedback === 'missed'} /><h1>¿Cómo se dice <em>{recallWord.es}</em>?</h1><div className="recall-answer-slot" aria-live="polite">{recallFeedback === 'wrong' || recallFeedback === 'missed' ? <div className="recall-hint"><p>Vuelve a la escena:</p><strong>{recallWord.bridge ? `${recallWord.bridge} → ` : ''}{recallWord.en}</strong><small>{recallWord.es.toUpperCase()}</small><p className="recall-memory-scene"><MnemonicSceneText word={recallWord} /></p></div> : recallFeedback === 'correct' ? <p className="success-copy">¡CLAC! +10 XP</p> : <div className="recall-choices">{choices.map((choice) => <button type="button" disabled={recallFeedback !== 'idle'} onClick={() => answerRecall(choice.en)} key={choice.id}>{choice.en}</button>)}</div>}</div></div>
        </GameCard> : null}

        {state.phase === 'reward' ? <GameCard vertical={vertical} key="reward" onAdvance={leaveReward} advanceLabel={learningMode === 'vocabulary' ? nextLabel : 'Usar las palabras'}>
          <div className="reward-content"><SceneVisual word={unit.words[0]} compact />{state.correct >= Math.min(2, unit.words.length) ? <div className="reward-burst" aria-hidden="true">✨</div> : null}<p className="eyebrow">{recallSummary ? 'RECUERDO PRACTICADO' : `${state.correct}/${unit.words.length} RECONOCIDAS`}</p>{recallSummary ? <p className="reward-note">Respuestas registradas: {recallSummary.attempted}. Aciertos sin pistas: {recallSummary.independent}; con ayuda: {recallSummary.assisted}; modelos consultados: {recallSummary.models}. No mide dominio.</p> : null}<h1>{learningMode === 'vocabulary' ? 'Palabras listas para practicar.' : 'Ahora, úsalas con Emma.'}</h1><p className="reward-note">Con ayuda o sin ella, has practicado. El repaso volverá a las que lo necesiten.</p>{!vertical ? <><button type="button" className="primary-action" onClick={leaveReward}>{learningMode === 'vocabulary' ? nextLabel : 'Usar las palabras →'}</button>{onPractice ? <button type="button" className="arcade-invitation" onClick={onPractice}>✦ Jugar con mis asociaciones</button> : null}{learningMode === 'vocabulary' ? <button type="button" className="quiet-action" onClick={onExit}>Terminar por ahora</button> : null}</> : <p className="reward-note">Puedes continuar o salir por «Recorrido». Lo realizado queda guardado.</p>}</div>
        </GameCard> : null}

        {state.phase === 'grammar' ? canFastReview && expandedGrammarIndex !== state.grammarIndex ? <GameCard key={`grammar-revisit-${state.grammarIndex}`} className="grammar-review-card"><div className="reward-content"><p className="eyebrow">ESTE TRUCO YA LO HAS VISTO</p><h1>Vamos a usarlo en una frase.</h1><p><strong lang="es">{currentForm.spanish}</strong> → <strong lang="en">{currentForm.english}</strong></p><button type="button" className="primary-action" onClick={() => { dispatch({ type: 'grammarPlayed' }); dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' }); }}>Usarlo ahora →</button><button type="button" className="quiet-action" onClick={() => setExpandedGrammarIndex(state.grammarIndex)}>Volver a ver el truco</button></div></GameCard> : currentLesson ? <GrammarCoach key={currentForm.id} lesson={currentLesson} form={currentForm} userId={userId} unitId={unit.id} unitTitle={unit.title} contentVersion={unit.contentVersion ?? '1'} conversationAnswers={learningMode === 'adventure' ? conversationPracticeAnswers(unit, demonstratedConversationQuestionSkills(readGrammarAttempts(userId))) : []} reviewMode={reviewMode} onReady={() => dispatch({ type: 'grammarPlayed' })} onContinue={() => dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' })} /> : <GrammarLesson key={currentForm.id} form={currentForm} baseSpanish={baseSpanish} index={state.grammarIndex} total={grammarForms.length} onReady={() => dispatch({ type: 'grammarPlayed' })} onContinue={() => dispatch({ type: 'continue', grammarCount: grammarForms.length, grammarOnly: learningMode === 'grammar' })} /> : null}

        {state.phase === 'build' ? <SentenceBuilderCard key={`build-${state.sentenceIndex}`} vertical={!reviewMode} sentence={sentence} vocabulary={unit.words} sceneWord={unit.words[0]} processForm={unit.grammar.find((form) => form.id === 'ing') ?? unit.grammar[0]} index={state.sentenceIndex} total={sentences.length} filledSlots={state.filledSlots} choiceSeed={sessionSeed + state.sentenceIndex} needsModel={(state.buildRepair?.failures ?? 0) >= 2} lastIncorrectChoice={state.buildRepair?.choice} onAcceptModel={() => placeConstruction(true)}
          preparationStep={state.preparationStep ?? 0} onPreparationChange={(step) => dispatch({ type: 'prepareSlot', sentenceIndex: state.sentenceIndex, slotIndex: state.filledSlots, step, stepCount: sentence.slots[state.filledSlots]?.preparation?.length ?? 0 })}
          onAttempt={constructionAttempt} onPick={() => placeConstruction()} onNext={() => dispatch({ type: 'continue', sentenceCount: sentences.length, slotCount: sentence.slots.length, conversation: learningMode === 'adventure' && Boolean(unit.communication?.dialogue) })} /> : null}
        {state.phase === 'conversation' && unit.communication?.dialogue ? <ConversationPractice unit={unit} userId={userId} reviewMode={reviewMode} onContinue={() => dispatch({ type: 'continue' })} /> : null}

{state.phase === 'complete' ? <GameCard key="complete" className="complete-card" onAdvance={onEvolution ? undefined : finishUnit} advanceLabel=""><div className="complete-content"><div className="reward-burst" aria-hidden="true">✦</div><p className="eyebrow">{reviewMode ? 'VISTA DE REVISIÓN' : 'MUNDO 1 · ESCENA CONSEGUIDA'}</p><h1>{learningMode === 'grammar' ? 'Has practicado el truco.' : 'Has practicado la escena.'}</h1>{unit.communication?.intent ? <p className="capability-earned">Has trabajado: {unit.communication.intent}</p> : null}<p className="assembled-phrase">{sentences[sentences.length - 1].en}</p><p className="subject-translation">{sentences[sentences.length - 1].es}</p>{!reviewMode ? <p className="next-review">El repaso te dará otra oportunidad de recordar esta escena.</p> : null}<PracticeClosure nextLabel={nextLabel} onContinue={finishUnit} onExit={onExit} onPractice={onPractice} onEvolution={onEvolution}><EchoPractice phrase={sentences[sentences.length - 1].en} parts={sentences[sentences.length - 1].slots.map((slot) => slot.en)} reply={unit.communication?.reply} /></PracticeClosure></div></GameCard> : null}
      </section>
    </main>
  );
}
