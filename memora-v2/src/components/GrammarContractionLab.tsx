import { useEffect, useRef, useState } from 'react';
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
  const shown = useRef(restored);
  const playback = useSpeechPlayback();
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  function transform() {
    const next = !joined;
    setJoined(next);
    if (next && !shown.current) {
      shown.current = true;
      if (!reviewMode) recordLearningActivity(userId, { unitId, unitTitle, contentVersion, activityId, skill: lessonId, phase: 'grammar', source: 'authored', modality: 'choice',
        prompt: expanded, response: contracted, expected: '', correct: null, helped: true, promptLanguage: 'en', responseLanguage: 'en', feedback: 'Contracción explorada con modelo; no es respuesta autónoma.' });
    }
    void playback.listen(next ? contracted : expanded);
  }
  return <div className={`contraction-lab${joined ? ' is-joined' : ''}`}>
    <GrammarRow parts={step.es} language="es" />
    <div className="contraction-lab-message" lang="en">
      <button type="button" className="contraction-lab-switch" aria-label={joined ? "Separar I'M" : 'Juntar I y AM'} aria-pressed={joined} onClick={transform}>
        {joined ? <span key="joined" className="contraction-lab-joined"><span className="coach-subject">I</span><span className="coach-auxiliary">’M</span></span> : <span key="expanded"><span className="coach-subject">I</span><span className="coach-auxiliary"> AM</span></span>}
      </button>
      <span>{actionParts.map((part, index) => <span className={`coach-piece coach-${part.role}`} key={index}>{part.text}</span>)}</span>
    </div>
    <p className="contraction-lab-cue" role="status">{joined ? 'I AM e I’M expresan lo mismo aquí.' : 'Toca I + AM para juntarlas.'}</p>
    <button type="button" className="round-audio" aria-label="Escuchar este mensaje" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(joined ? contracted : expanded)}>🔊</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </div>;
}
