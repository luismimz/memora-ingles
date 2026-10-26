import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit, AtomicWord } from '../domain/unit';
import { matchesWord, recordActiveWordAttempt, wordRecallHint } from '../domain/activeRecall';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import './activeRecall.css';
import { AnswerStudio } from './AnswerStudio';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { isAssociationRejected } from '../domain/associationPreference';

function restoreRepairs(userId: string, activityId: string, withTiming = false) {
  return (saved: Record<string, unknown>) => {
    let failures = saved.failures;
    if (failures === undefined) {
      // Additive restoration: retain the legacy draft, hint and parent chain.
      const events = new Map(readLearningActivities(userId).map((event) => [event.id, event]));
      let parent = typeof saved.parent === 'string' ? saved.parent : '';
      failures = 0;
      const visited = new Set<string>();
      while (parent && Number(failures) < 2 && !visited.has(parent)) {
        visited.add(parent);
        const event = events.get(parent);
        if (!event || event.activityId !== activityId || event.source !== 'learner' || event.correct !== false) break;
        failures = Number(failures) + 1; parent = event.parentAttemptId ?? '';
      }
    }
    if (!Number.isInteger(failures) || Number(failures) < 0 || Number(failures) > 2) throw new Error('Invalid repair checkpoint');
    return { ...saved, failures, ...(withTiming ? { attemptStartedAt: typeof saved.attemptStartedAt === 'number' && Number.isFinite(saved.attemptStartedAt) && saved.attemptStartedAt > 0 ? saved.attemptStartedAt : 0 } : {}), ...(Number(failures) >= 2 && !saved.done ? { done: true, independent: false, helped: true,
      ...(typeof saved.feedback === 'string' ? { feedback: 'Vamos con el modelo. Puedes seguir; lo practicarás de nuevo más adelante.' } : {}) } : {}) };
  };
}

function usePracticeCheckpoint<T>(key: string, initial: T, inspection: boolean, upgrade?: (saved: Record<string, unknown>) => Record<string, unknown>) {
  const [state, setState] = useState<T>(() => {
    if (!inspection) try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      const saved = raw && typeof raw === 'object' && upgrade ? upgrade(raw) : raw;
      if (saved && typeof saved === 'object' && Object.entries(initial as object).every(([field, value]) => typeof saved[field] === typeof value)) return saved as T;
    } catch { /* Keep playing. */ }
    return initial;
  });
  useEffect(() => { if (!inspection) try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Journal still reports storage failures. */ } }, [key, state, inspection]);
  const clear = () => { if (!inspection) try { localStorage.removeItem(key); } catch { /* No blocker. */ } };
  return [state, setState, clear] as const;
}

export function SceneReconstruction({ unit, word, userId, inspection, onContinue, vertical = false }: {
  unit: AtomicUnit; word: AtomicWord; userId: string; inspection: boolean; onContinue: () => void; vertical?: boolean;
}) {
  const puzzle = word.reconstruction!;
  const [state, setState, clear] = usePracticeCheckpoint(`memora-v2.scene.${userId}.${unit.id}.${unit.contentVersion}.${word.id}`,
    { result: '', helped: false, done: false, parent: '', failures: 0 }, inspection, restoreRepairs(userId, `reconstruct:${word.en}`));
  const locked = useRef(false);
  const continued = useRef(false);
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  function choose(answer: string | null) {
    if (locked.current || state.done) return;
    locked.current = true;
    const correct = answer === puzzle.answer;
    const failures = Math.min(2, state.failures + Number(answer !== null && !correct));
    const attempt = !inspection ? recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `reconstruct:${word.en}`, skill: `scene:${word.en}`, phase: 'arcade', source: 'learner', modality: 'choice', prompt: puzzle.prompt, response: answer ?? '(pasó por ahora)', expected: puzzle.answer, correct: answer === null ? null : correct, helped: true, feedback: 'Reconstrucción de la escena, no dominio de la palabra inglesa.', parentAttemptId: state.parent || undefined }) : null;
    setState({ result: correct ? 'Escena conectada.' : puzzle.cue, helped: !correct, done: correct || answer === null || failures >= 2, parent: attempt?.id ?? state.parent, failures });
    if (correct) playSnap();
  }
  const continueScene = () => { if (!state.done || continued.current) return; continued.current = true; clear(); onContinue(); };
  return <GameCard vertical={vertical} stepKey={state.done ? 'scene-result' : 'scene-puzzle'} onAdvance={vertical && state.done ? continueScene : undefined} advanceLabel="Continuar" className="active-memory-card"><div className="active-memory-content">
    {state.done ? <><h1 role="status">{state.helped ? 'Esta es la escena' : '✓ Esa es la escena'}</h1><SceneVisual word={word} compact /><p>{state.helped ? puzzle.cue : <MnemonicSceneText word={word} />}</p>{!vertical ? <button type="button" className="primary-action" onClick={continueScene}>Continuar →</button> : null}</> : <>
      <div className="memory-mystery" aria-hidden="true">{word.emojis[0]} <span>?</span></div>
      <h1>{puzzle.prompt}</h1>
      <div className="memory-feedback" role="status">{state.result}</div>
      <div className="memory-options">{puzzle.choices.map((choice) => <button type="button" key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div><button type="button" className="quiet-action" onClick={() => choose(null)}>Recordar la escena y seguir</button>
    </>}
  </div></GameCard>;
}

export function ActiveRecallCard({ unit, word, choices, position, userId, inspection, onFinish, vertical = false }: {
  unit: AtomicUnit; word: AtomicWord; choices: AtomicWord[]; position: number; userId: string; inspection: boolean; onFinish: (independent: boolean) => void; vertical?: boolean;
}) {
  const useAssociation = !isAssociationRejected(userId, word);
  const hintLimit = useAssociation ? 2 : 1;
  const [state, setState, clear] = usePracticeCheckpoint(`memora-v2.recall.${userId}.${unit.id}.${unit.contentVersion}.${word.id}`,
    { input: '', level: 0, helped: false, choosing: false, done: false, independent: false, feedback: '', parent: '', failures: 0, attemptStartedAt: Date.now() }, inspection, restoreRepairs(userId, `active-recall:${word.en}`, true));
  const locked = useRef(false);
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  const playback = useSpeechPlayback();
  const sceneHintLevel = useRef(state.level);
  sceneHintLevel.current = state.level;
  const helped = useRef(state.helped);
  const continued = useRef(false);
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  const playModel = () => { void playback.listen(word.en, 'en', word.audioUrl); };
  function hint(kind: 'scene' | 'audio' | 'options') {
    if (state.done || locked.current || kind === 'scene' && sceneHintLevel.current >= hintLimit) return;
    helped.current = true;
    const level = kind === 'scene' ? Math.min(hintLimit, sceneHintLevel.current + 1) : state.level;
    if (kind === 'scene') sceneHintLevel.current = level;
    const cue = kind === 'audio' ? 'Has pedido el modelo inglés como ayuda.' : kind === 'options' ? 'Elige entre palabras que ya has visto.' : wordRecallHint(word, level, useAssociation);
    setState((current) => ({ ...current, helped: true, level: kind === 'scene' ? level : current.level, choosing: current.choosing || kind === 'options', feedback: cue }));
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `recall-hint:${word.en}:${kind}`, skill: word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: word.es, response: cue, expected: '', correct: null, helped: true, parentAttemptId: state.parent || undefined });
    if (kind === 'audio') {
      playModel();
    }
  }
  function answer(response: string, mode: 'writing' | 'choice' | 'skip') {
    if (locked.current || state.done || mode !== 'skip' && !response.trim()) return;
    locked.current = true;
    playback.reset();
    const correct = matchesWord(word, response) && mode !== 'skip';
    const independent = correct && !helped.current && mode === 'writing';
    const failures = Math.min(2, state.failures + Number(!correct && mode !== 'skip'));
    const model = !correct && mode !== 'skip' && failures >= 2;
    const answeredAt = Date.now();
    const delay = state.attemptStartedAt > 0 && answeredAt >= state.attemptStartedAt ? answeredAt - state.attemptStartedAt : undefined;
    const attempt = !inspection ? recordActiveWordAttempt(userId, unit, word, response, mode, helped.current, state.parent || undefined, delay) : null;
    helped.current = true;
    if (model && !inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `recall-model:${word.en}`, skill: word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: word.es, response: word.en, expected: '', correct: null, helped: true, parentAttemptId: attempt?.id, feedback: 'Modelo tras una reparación. No cuenta como acierto; continúa y volveremos a practicar.' });
    setState((current) => ({ ...current, done: correct || mode === 'skip' || model, independent, helped: true, parent: attempt?.id ?? current.parent, failures, attemptStartedAt: answeredAt,
      level: correct ? current.level : Math.max(1, current.level), feedback: correct ? independent ? '¡Te has acordado sin pistas!' : '¡Conexión recuperada! La volveremos a probar sin apoyo.' : model ? 'Vamos con el modelo. Puedes seguir; lo practicarás de nuevo más adelante.' : mode === 'skip' ? 'Ahora la ves. Volveremos a ella en el repaso.' : `Aún no. ${wordRecallHint(word, 1, useAssociation)}` }));
    if (correct || mode === 'skip') { if (correct) playSnap(); playModel(); }
  }
  const continueRecall = () => { if (!state.done || continued.current) return; continued.current = true; playback.reset(); stopSpeech(); clear(); onFinish(state.independent); };
  return <GameCard vertical={vertical} stepKey={state.done ? 'recall-result' : 'recall-question'} onAdvance={vertical && state.done ? continueRecall : undefined} advanceLabel={position < unit.words.length - 1 ? 'Continuar con otra palabra' : 'Ver resultado de la tanda'} className="active-memory-card"><div className="active-memory-content">
    <p className="eyebrow">{state.done ? 'RESULTADO' : 'RECUERDA A TU RITMO'} · {position + 1}/{unit.words.length}</p>
    {state.done ? <h1>{word.es}</h1> : state.level > 0 ? <p>Recupera la palabra con esta pista.</p> : null}
    {state.feedback ? <div className="memory-feedback" role="status">{!useAssociation && !state.done && (state.feedback.includes(word.scene) || Boolean(word.bridge) && state.feedback.includes(word.bridge)) ? wordRecallHint(word, 2, false) : state.feedback}</div> : null}
    {useAssociation && !state.done && state.level > 0 ? <SceneVisual word={word} compact hideAnswer /> : null}
    <AssociationAudioStatus compact state={playback.audio} />
    {state.done ? <><strong className="memory-answer" lang="en">{word.en}</strong>{useAssociation ? <SceneVisual word={word} compact /> : null}<button type="button" className="round-audio" aria-label="Escuchar palabra" aria-busy={playback.audio?.status === 'preparing'} title={playback.label} onClick={playModel}>🔊</button>{!vertical ? <button type="button" className="primary-action" onClick={continueRecall}>Continuar →</button> : null}</> : <>
      {state.choosing ? <><h1>{word.es}</h1><div className="memory-options">{choices.map((choice) => <button type="button" key={choice.id} onClick={() => answer(choice.en, 'choice')}>{choice.en}</button>)}</div></> : <AnswerStudio id="word-recall" taskKey={`${unit.id}:${word.id}`} target={word.es} value={state.input} onChange={(input) => setState((current) => ({ ...current, input }))} onAnswer={(value) => answer(value, 'writing')} accepts={(value) => matchesWord(word, value)} />}
      <button type="button" className="quiet-action" onClick={() => answer('', 'skip')}>Ver palabra y pasar</button>
      <details className="memory-help"><summary>¿Necesitas ayuda?</summary><p>{useAssociation ? 'Puedes recuperar la historia, escuchar o elegir.' : 'Puedes ver la inicial, escuchar o elegir.'} Usar ayuda no es fallar.</p><div className="memory-tools"><button type="button" disabled={state.level >= hintLimit} onClick={() => hint('scene')}>{state.level >= hintLimit ? 'Pista completa' : !useAssociation ? 'Ver la inicial' : state.level === 1 ? 'Ver la inicial' : 'Recordar la historia'}</button><button type="button" aria-label="Escuchar la palabra" aria-busy={playback.audio?.status === 'preparing'} onClick={() => hint('audio')}>🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : 'Escuchar la palabra'}</button>{!state.choosing ? <button type="button" onClick={() => hint('options')}>Prefiero elegir</button> : null}</div></details>
    </>}
  </div></GameCard>;
}
