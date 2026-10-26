import { useEffect, useState } from 'react';
import type { LessonStep } from '../domain/grammarLesson';
import { grammarPieceIdentity, grammarTransition } from '../domain/grammarPresentation';
import { GrammarCaption, GrammarRow } from './GrammarText';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { stopSpeech } from '../services/audio';
import './grammarComparison.css';

/** Highlights changes in the authored model, not new vocabulary or word-for-word equivalence. */
export function GrammarComparison({ step, previous, interactive = false, caption = step.caption }: { step: LessonStep; previous?: LessonStep; interactive?: boolean; caption?: string }) {
  const [replay, setReplay] = useState(0);
  const [before, setBefore] = useState(false);
  const playback = useSpeechPlayback();
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  const { changed, contraction } = grammarTransition(step, previous);
  if (interactive && previous && !previous.hideEnglish && !step.hideEnglish && (changed.length || contraction)) {
    const shown = before ? previous : step;
    const english = shown.en.map((part) => part.text).join('');
    return <div className="coach-demonstration coach-comparison comparison-lab">
      <GrammarRow parts={shown.es} language="es" />
      <span className="coach-direction" aria-hidden="true">↓</span>
      <div className="comparison-lab-model" key={before ? 'before' : 'after'}><GrammarRow parts={shown.en} language="en" /></div>
      <p className="coach-caption" role="status"><GrammarCaption text={before ? previous.caption : caption} marks={shown.captionMarks ?? [...shown.es, ...shown.en].filter((part) => part.role !== 'context').map((part) => ({ ...part, text: part.text.trim() }))} /></p>
      <div className="comparison-lab-controls"><button type="button" className="comparison-replay" aria-pressed={before} onClick={() => {
        playback.reset(); stopSpeech(); setBefore(!before);
        void playback.listen((before ? step : previous).en.map((part) => part.text).join(''));
      }}>{before ? 'Ver la transformación →' : '↔ Comparar con antes'}</button>
      <button type="button" className="round-audio" aria-label="Escuchar el ejemplo visible" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(english)}>🔊</button></div>
      <AssociationAudioStatus compact state={playback.audio} />
    </div>;
  }
  const occurrences = new Map<string, number>();
  return <div className="coach-demonstration coach-comparison">
    <div><small className="coach-language">ESPAÑOL</small><GrammarRow parts={step.es} language="es" /></div>
    {!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small>
      <p className="coach-row" lang="en">{step.en.map((part, index) => {
        const identity = grammarPieceIdentity(part); const occurrence = occurrences.get(identity) ?? 0;
        occurrences.set(identity, occurrence + 1);
        const key = `${identity}:${occurrence}`;
        if (contraction && index === 0) return <span key={`${key}:${replay}`} className="comparison-contraction">
          <span className="comparison-source" aria-hidden="true"><span className="coach-subject">{previous!.en[0].text}</span><span className="coach-auxiliary">{previous!.en[1].text}</span></span>
          <span className="comparison-joined"><span className="coach-subject">{part.text[0]}</span><span className="coach-auxiliary">{part.text.slice(1)}</span></span>
        </span>;
        return <span key={changed.includes(index) ? `${key}:${replay}` : key} className={`coach-piece coach-${part.role}${changed.includes(index) ? ' comparison-changed' : ''}`}>{part.text}</span>;
      })}</p>
      {changed.length || contraction ? <button type="button" className="comparison-replay" onClick={(event) => { event.stopPropagation(); setReplay((value) => value + 1); }}><span aria-hidden="true">↻ </span>Repetir cambio</button> : null}
    </div></> : null}
  </div>;
}
