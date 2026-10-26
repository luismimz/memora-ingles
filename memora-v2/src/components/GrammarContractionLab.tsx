import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { LessonStep } from '../domain/grammarLesson';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { GrammarRow } from './GrammarText';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useSpeechPlayback } from './useSpeechPlayback';
import { stopSpeech } from '../services/audio';
import './grammarContractionLab.css';

/** One reversible authored equivalence. No question rule or new grammar score. */
export function GrammarContractionLab({ step, lessonId, unitId, unitTitle, contentVersion, userId, reviewMode }: {
  step: LessonStep; lessonId: string; unitId: string; unitTitle: string; contentVersion: string; userId: string; reviewMode: boolean;
}) {
  const actionParts = step.en.slice(step.en[0].text.trim().toLowerCase() === "i'm" ? 1 : 2);
  const action = actionParts.map((part) => part.text).join('');
  const expanded = `I am ${action}`, contracted = `I'm ${action}`;
  const activityId = `contraction-lab-v1:${lessonId}`;
  const [restored] = useState(() => !reviewMode && readLearningActivities(userId).some((event) => event.unitId === unitId && event.contentVersion === contentVersion
    && event.activityId === activityId && event.source === 'authored' && event.correct === null && event.response === contracted));
  const [joined, setJoined] = useState(restored);
  const joinedRef = useRef(joined);
  const gesture = useRef<{ id: number; x: number; y: number; joined: boolean; moved: boolean }>();
  const suppressClick = useRef(false);
  const [shift, setShift] = useState(0);
  const shown = useRef(restored);
  const playback = useSpeechPlayback();
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  function transform(next = !joinedRef.current) {
    if (next === joinedRef.current) return;
    joinedRef.current = next;
    setJoined(next);
    if (next && !shown.current) {
      shown.current = true;
      if (!reviewMode) recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId, skill: lessonId, phase: 'grammar', source: 'authored', modality: 'choice',
        prompt: expanded, response: contracted, expected: '', correct: null, helped: true, promptLanguage: 'en', responseLanguage: 'en', feedback: 'Contracción explorada con modelo; no es respuesta autónoma.' });
    }
    void playback.listen(next ? contracted : expanded);
  }
  function begin(event: PointerEvent<HTMLButtonElement>) {
    if (event.isPrimary === false || event.button > 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, joined: joinedRef.current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    const dx = event.clientX - value.x, dy = event.clientY - value.y;
    if (Math.hypot(dx, dy) < 8) return;
    value.moved = true;
    setShift(Math.abs(dx) > Math.abs(dy) ? Math.max(value.joined ? 0 : -44, Math.min(value.joined ? 44 : 0, dx)) : 0);
  }
  function cancel() { if (gesture.current?.moved) suppressClick.current = true; gesture.current = undefined; setShift(0); }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    const dx = event.clientX - value.x, dy = event.clientY - value.y;
    const connect = value.moved && Math.abs(dx) > Math.abs(dy) && (value.joined ? dx >= 28 : dx <= -28);
    cancel();
    if (connect) transform(!value.joined);
  }
  return <div className={`contraction-lab${joined ? ' is-joined' : ''}`}>
    <GrammarRow parts={step.es} language="es" />
    <div className="contraction-lab-message" lang="en">
      <button type="button" className={`contraction-lab-switch${shift ? ' is-moving' : ''}`} aria-label={joined ? "Separar I'M" : 'Juntar I y AM'} aria-pressed={joined} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={cancel} onClick={(event) => { if (suppressClick.current && event?.detail !== 0) { suppressClick.current = false; return; } transform(); }}>
        {joined ? <span key="joined" className="contraction-lab-joined"><span className="coach-subject">I</span><span className="coach-auxiliary" style={{ transform: `translateX(${shift}px)` }}>’M</span></span> : <span key="expanded"><span className="coach-subject">I</span><span className="contraction-magnet" aria-hidden="true"> + </span><span className="coach-auxiliary" style={{ transform: `translateX(${shift}px)` }}> AM</span></span>}
      </button>
      <span>{actionParts.map((part, index) => <span className={`coach-piece coach-${part.role}`} key={index}>{part.text}</span>)}</span>
    </div>
    <p className="contraction-lab-cue" role="status">{joined ? 'I AM = I’M · mismo mensaje. Desliza → para separar.' : 'Junta I + AM · arrastra ← o toca.'}</p>
    <button type="button" className="round-audio" aria-label="Escuchar este mensaje" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(joined ? contracted : expanded)}>🔊</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </div>;
}
