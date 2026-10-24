import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit, AtomicWord } from '../domain/unit';
import { matchesWord, recordActiveWordAttempt, wordRecallHint } from '../domain/activeRecall';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { playEnglish, playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import './activeRecall.css';

function restoreRepairs(userId: string, activityId: string) {
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
    return { ...saved, failures, ...(Number(failures) >= 2 && !saved.done ? { done: true, independent: false, helped: true,
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
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  function choose(answer: string | null) {
    if (locked.current || state.done) return;
    locked.current = true;
    const correct = answer === puzzle.answer;
    const failures = Math.min(2, state.failures + Number(answer !== null && !correct));
    const attempt = !inspection ? recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `reconstruct:${word.en}`, skill: `scene:${word.en}`, phase: 'arcade', source: 'learner', modality: 'choice', prompt: puzzle.prompt, response: answer ?? '(pasó por ahora)', expected: puzzle.answer, correct: answer === null ? null : correct, helped: true, feedback: 'Reconstrucción de la escena, no dominio de la palabra inglesa.', parentAttemptId: state.parent || undefined }) : null;
    setState({ result: correct ? '¡Esa es la escena! Ahora imagínala en movimiento.' : puzzle.cue, helped: !correct, done: correct || answer === null || failures >= 2, parent: attempt?.id ?? state.parent, failures });
    if (correct) playSnap();
  }
  const continueScene = () => { clear(); onContinue(); };
  return <GameCard vertical={vertical} stepKey={state.done ? 'scene-result' : 'scene-puzzle'} onAdvance={vertical && state.done ? continueScene : undefined} advanceLabel="Seguir la historia" className="active-memory-card"><div className="active-memory-content">
    <p className="eyebrow">DALE VIDA AL RECUERDO</p>
    <div className="memory-mystery" aria-hidden="true">{word.emojis[0]} <span>?</span></div>
    <h1>{puzzle.prompt}</h1>
    <p>No es un examen: reconstruye lo que acabas de imaginar.</p>
    <div className="memory-feedback" role="status">{state.result}</div>
    {state.done ? <><p><MnemonicSceneText word={word} /></p>{!vertical ? <button type="button" className="primary-action" onClick={continueScene}>Seguir la historia →</button> : null}</> : <><div className="memory-options">{puzzle.choices.map((choice) => <button type="button" key={choice} onClick={() => choose(choice)}>{choice}</button>)}</div><button type="button" className="quiet-action" onClick={() => choose(null)}>Recordar la escena y seguir</button></>}
  </div></GameCard>;
}

export function ActiveRecallCard({ unit, word, choices, position, userId, inspection, onFinish, vertical = false }: {
  unit: AtomicUnit; word: AtomicWord; choices: AtomicWord[]; position: number; userId: string; inspection: boolean; onFinish: (independent: boolean) => void; vertical?: boolean;
}) {
  const [state, setState, clear] = usePracticeCheckpoint(`memora-v2.recall.${userId}.${unit.id}.${unit.contentVersion}.${word.id}`,
    { input: '', level: 0, helped: false, choosing: false, done: false, independent: false, feedback: '', parent: '', failures: 0 }, inspection, restoreRepairs(userId, `active-recall:${word.en}`));
  const locked = useRef(false);
  useEffect(() => { if (!state.done) locked.current = false; }, [state]);
  const [audioStatus, setAudioStatus] = useState('');
  const helped = useRef(state.helped);
  const audioRequest = useRef(0);
  useEffect(() => () => { audioRequest.current++; stopSpeech(); }, []);
  function hint(kind: 'scene' | 'audio' | 'options') {
    if (state.done || locked.current) return;
    helped.current = true;
    const level = Math.min(2, state.level + 1);
    const cue = kind === 'audio' ? 'Has pedido el modelo inglés como ayuda.' : kind === 'options' ? 'Elige entre palabras que ya has visto.' : wordRecallHint(word, level);
    setState((current) => ({ ...current, helped: true, level: kind === 'scene' ? level : current.level, choosing: current.choosing || kind === 'options', feedback: cue }));
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `recall-hint:${word.en}:${kind}`, skill: word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: word.es, response: cue, expected: '', correct: null, helped: true, parentAttemptId: state.parent || undefined });
    if (kind === 'audio') {
      const request = ++audioRequest.current;
      setAudioStatus('Preparando el modelo inglés…');
      void playEnglish(word.en, word.audioUrl).then((result) => {
        if (request !== audioRequest.current) return;
        setAudioStatus(result.status === 'played' ? 'Modelo reproducido. Puedes pedirlo otra vez.' : 'No se ha podido reproducir. Puedes seguir o usar otra ayuda.');
      }).catch(() => { if (request === audioRequest.current) setAudioStatus('Audio no disponible. Puedes seguir o usar otra ayuda.'); });
    }
  }
  function answer(response: string, mode: 'writing' | 'choice' | 'skip') {
    if (locked.current || state.done || mode !== 'skip' && !response.trim()) return;
    locked.current = true;
    audioRequest.current++; setAudioStatus('');
    const correct = matchesWord(word, response) && mode !== 'skip';
    const independent = correct && !helped.current && mode === 'writing';
    const failures = Math.min(2, state.failures + Number(!correct && mode !== 'skip'));
    const model = !correct && mode !== 'skip' && failures >= 2;
    const attempt = !inspection ? recordActiveWordAttempt(userId, unit, word, response, mode, helped.current, state.parent || undefined) : null;
    helped.current = true;
    if (model && !inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `recall-model:${word.en}`, skill: word.en, phase: 'arcade', source: 'authored', modality: 'choice', prompt: word.es, response: word.en, expected: '', correct: null, helped: true, parentAttemptId: attempt?.id, feedback: 'Modelo tras una reparación. No cuenta como acierto; continúa y volveremos a practicar.' });
    setState((current) => ({ ...current, done: correct || mode === 'skip' || model, independent, helped: true, parent: attempt?.id ?? current.parent, failures,
      level: correct ? current.level : Math.max(1, current.level), feedback: correct ? independent ? '¡Te has acordado sin pistas!' : '¡Conexión recuperada! La volveremos a probar sin apoyo.' : model ? 'Vamos con el modelo. Puedes seguir; lo practicarás de nuevo más adelante.' : mode === 'skip' ? 'Ahora la ves. Volveremos a ella en el repaso.' : `Aún no. ${wordRecallHint(word, 1)}` }));
    if (correct || mode === 'skip') { if (correct) playSnap(); void playEnglish(word.en, word.audioUrl); }
  }
  const continueRecall = () => { clear(); onFinish(state.independent); };
  return <GameCard vertical={vertical} stepKey={state.done ? 'recall-result' : 'recall-question'} onAdvance={vertical && state.done ? continueRecall : undefined} advanceLabel="Continuar con otra palabra" className="active-memory-card"><div className="active-memory-content">
    <p className="eyebrow">RECUERDA A TU RITMO · {position + 1}/{unit.words.length}</p>
    <p>{state.done ? 'Compara tu recuerdo con la palabra y su escena.' : state.level > 0 ? 'Recupera la palabra con esta pista.' : 'Ahora sin la imagen y en otro orden.'}</p><h1><small>En inglés, ¿cómo se dice</small>«{word.es}»?</h1>
    <div className="memory-feedback" role="status">{state.feedback}</div>
    {!state.done && state.level > 0 ? <SceneVisual word={word} compact hideAnswer /> : null}
    {audioStatus ? <p className="memory-audio-status" role="status">{audioStatus}</p> : null}
    {state.done ? <><strong className="memory-answer" lang="en">{word.en}</strong><SceneVisual word={word} compact />{!vertical ? <button type="button" className="primary-action" onClick={continueRecall}>Continuar →</button> : null}</> : <>
      {state.choosing ? <div className="memory-options">{choices.map((choice) => <button type="button" key={choice.id} onClick={() => answer(choice.en, 'choice')}>{choice.en}</button>)}</div> : <form className="memory-write" onSubmit={(event) => { event.preventDefault(); answer(state.input, 'writing'); }}><label className="sr-only" htmlFor="word-recall">La palabra en inglés</label><input id="word-recall" lang="en" value={state.input} onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Prueba a recordarla…" /><button type="submit" disabled={!state.input.trim()}>Comprobar</button></form>}
      <details className="memory-help"><summary>¿Necesitas ayuda?</summary><p>Puedes recuperar la historia, escuchar o elegir. Usar ayuda no es fallar.</p><div className="memory-tools"><button type="button" onClick={() => hint('scene')}>{state.level ? 'Una pista más' : 'Recordar la historia'}</button><button type="button" onClick={() => hint('audio')}>🔊 Escuchar la palabra</button>{!state.choosing ? <button type="button" onClick={() => hint('options')}>Prefiero elegir</button> : null}<button type="button" onClick={() => answer('', 'skip')}>Ver palabra y pasar</button></div></details>
    </>}
  </div></GameCard>;
}
