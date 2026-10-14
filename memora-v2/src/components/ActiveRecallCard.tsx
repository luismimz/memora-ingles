import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit, AtomicWord } from '../domain/unit';
import { matchesWord, recordActiveWordAttempt, wordRecallHint } from '../domain/activeRecall';
import { recordLearningActivity } from '../domain/learningActivity';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import './activeRecall.css';

function usePracticeCheckpoint<T>(key: string, initial: T, inspection: boolean) {
  const [state, setState] = useState<T>(() => {
    if (!inspection) try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved === 'object' && Object.entries(initial as object).every(([field, value]) => typeof saved[field] === typeof value)) return saved as T;
    } catch { /* Keep playing. */ }
    return initial;
  });
  useEffect(() => { if (!inspection) try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Journal still reports storage failures. */ } }, [key, state, inspection]);
  const clear = () => { if (!inspection) try { localStorage.removeItem(key); } catch { /* No blocker. */ } };
  return [state, setState, clear] as const;
}

export function SceneReconstruction({ unit, word, userId, inspection, onContinue }: {
  unit: AtomicUnit; word: AtomicWord; userId: string; inspection: boolean; onContinue: () => void;
}) {
  const puzzle = word.reconstruction!;
  const [state, setState, clear] = usePracticeCheckpoint(`memora-v2.scene.${userId}.${unit.id}.${unit.contentVersion}.${word.id}`,
    { result: '', helped: false, done: false, parent: '' }, inspection);
  const locked = useRef(false);
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  function choose(answer: string | null) {
    if (locked.current || state.done) return;
    locked.current = true;
    const correct = answer === puzzle.answer;
    const attempt = !inspection ? recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `reconstruct:${word.en}`, skill: `scene:${word.en}`, phase: 'arcade', source: 'learner', modality: 'choice', prompt: puzzle.prompt, response: answer ?? '(pasó por ahora)', expected: puzzle.answer, correct: answer === null ? null : correct, helped: true, feedback: 'Reconstrucción de la escena, no dominio de la palabra inglesa.', parentAttemptId: state.parent || undefined }) : null;
    setState({ result: correct ? '¡Esa es la escena! Ahora imagínala en movimiento.' : puzzle.cue, helped: !correct, done: correct || answer === null, parent: attempt?.id ?? state.parent });
    if (correct) playSnap();
  }
  return <GameCard className="active-memory-card"><div className="active-memory-content">
    <p className="eyebrow">DALE VIDA AL RECUERDO</p>
    <div className="memory-mystery" aria-hidden="true">{word.emojis[0]} <span>?</span></div>
    <h1>{puzzle.prompt}</h1>
    <p>No es un examen: reconstruye lo que acabas de imaginar.</p>
    <div className="memory-feedback" role="status">{state.result}</div>
    {state.done ? <><p><MnemonicSceneText word={word} /></p><button type="button" className="primary-action" onClick={() => { clear(); onContinue(); }}>Seguir la historia →</button></> : <><div className="memory-options">{puzzle.choices.map((choice) => <button type="button" key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div><button type="button" className="quiet-action" onClick={() => choose(null)}>Recordar la escena y seguir</button></>}
  </div></GameCard>;
}

export function ActiveRecallCard({ unit, word, choices, position, userId, inspection, onFinish }: {
  unit: AtomicUnit; word: AtomicWord; choices: AtomicWord[]; position: number; userId: string; inspection: boolean; onFinish: (independent: boolean) => void;
}) {
  const [state, setState, clear] = usePracticeCheckpoint(`memora-v2.recall.${userId}.${unit.id}.${unit.contentVersion}.${word.id}`,
    { input: '', level: 0, helped: false, choosing: false, done: false, independent: false, feedback: '', parent: '' }, inspection);
  const locked = useRef(false);
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  useEffect(() => () => stopSpeech(), []);
  function hint(kind: 'scene' | 'audio' | 'options') {
    if (state.done) return;
    const level = Math.min(2, state.level + 1);
    const cue = kind === 'audio' ? 'Has escuchado el modelo inglés.' : kind === 'options' ? 'Elige entre palabras que ya has visto.' : wordRecallHint(word, level);
    setState((current) => ({ ...current, helped: true, level: kind === 'scene' ? level : current.level, choosing: current.choosing || kind === 'options', feedback: cue }));
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `recall-hint:${word.en}:${kind}`, skill: word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: word.es, response: cue, expected: '', correct: null, helped: true, parentAttemptId: state.parent || undefined });
    if (kind === 'audio') void playEnglish(word.en, word.audioUrl);
  }
  function answer(response: string, mode: 'writing' | 'choice' | 'skip') {
    if (locked.current || state.done || mode !== 'skip' && !response.trim()) return;
    locked.current = true;
    const correct = matchesWord(word, response) && mode !== 'skip';
    const independent = correct && !state.helped && mode === 'writing';
    const attempt = !inspection ? recordActiveWordAttempt(userId, unit, word, response, mode, state.helped, state.parent || undefined) : null;
    setState((current) => ({ ...current, done: correct || mode === 'skip', independent, helped: true, parent: attempt?.id ?? current.parent,
      level: correct ? current.level : Math.max(1, current.level), feedback: correct ? independent ? '¡Te has acordado sin pistas!' : '¡Conexión recuperada! La volveremos a probar sin apoyo.' : mode === 'skip' ? 'Ahora la ves. Volveremos a ella en el repaso.' : `Aún no. ${wordRecallHint(word, 1)}` }));
    if (correct || mode === 'skip') { if (correct) playSnap(); void playEnglish(word.en, word.audioUrl); }
  }
  return <GameCard className="active-memory-card"><div className="active-memory-content">
    <p className="eyebrow">RECUERDA A TU RITMO · {position + 1}/{unit.words.length}</p>
    <p>Ahora sin la imagen y en otro orden.</p><h1><small>En inglés, ¿cómo se dice</small>«{word.es}»?</h1>
    <div className="memory-feedback" role="status">{state.feedback}</div>
    {state.done ? <><strong className="memory-answer" lang="en">{word.en}</strong><SceneVisual word={word} compact /><button type="button" className="primary-action" onClick={() => { clear(); onFinish(state.independent); }}>Continuar →</button></> : <>
      {state.choosing ? <div className="memory-options">{choices.map((choice) => <button type="button" key={choice.id} onClick={() => answer(choice.en, 'choice')}>{choice.en}</button>)}</div> : <form className="memory-write" onSubmit={(event) => { event.preventDefault(); answer(state.input, 'writing'); }}><label className="sr-only" htmlFor="word-recall">La palabra en inglés</label><input id="word-recall" lang="en" value={state.input} onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Prueba a recordarla…" /><button type="submit" disabled={!state.input.trim()}>Comprobar</button></form>}
      <div className="memory-tools"><button type="button" onClick={() => hint('scene')}>{state.level ? 'Una pista más' : 'Recordar la historia'}</button><button type="button" onClick={() => hint('audio')}>🔊 Escuchar la palabra</button>{!state.choosing ? <button type="button" onClick={() => hint('options')}>Prefiero elegir</button> : null}<button type="button" onClick={() => answer('', 'skip')}>Ver palabra y pasar</button></div>
    </>}
  </div></GameCard>;
}
