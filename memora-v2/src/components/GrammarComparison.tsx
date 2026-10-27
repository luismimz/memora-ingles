import { useEffect, useState } from 'react';
import type { LessonPiece, LessonStep } from '../domain/grammarLesson';
import { grammarPieceIdentity, grammarTransition } from '../domain/grammarPresentation';
import { GrammarCaption, GrammarRow } from './GrammarText';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { stopSpeech } from '../services/audio';
import './grammarComparison.css';

/** Highlights changes in the authored model, not new vocabulary or word-for-word equivalence. */
export function GrammarComparison({ step, previous, interactive = false, connectPieces = false, caption = step.caption }: { step: LessonStep; previous?: LessonStep; interactive?: boolean; connectPieces?: boolean; caption?: string }) {
  const [replay, setReplay] = useState(0);
  const [before, setBefore] = useState(false);
  const [focus, setFocus] = useState<LessonPiece['role']>();
  const playback = useSpeechPlayback();
  useEffect(() => () => { playback.reset(); stopSpeech(); }, []);
  const { changed, contraction } = grammarTransition(step, previous);
  const shown = before && interactive && previous && !previous.hideEnglish ? previous : step;
  const connected = connectPieces && !shown.hideEnglish;
  const canConnect = (part: LessonPiece) => shown.es.some((piece) => piece.role === part.role) && shown.en.some((piece) => piece.role === part.role);
  const focused = focus && shown.es.some((part) => part.role === focus) && shown.en.some((part) => part.role === focus) ? focus : undefined;
  const phrase = (parts: LessonPiece[]) => parts.map((part) => part.text).join('').trim();
  const row = (parts: LessonPiece[], language: 'es' | 'en') => connected ? <p className="coach-row comparison-linked-row" lang={language}>{parts.map((part, index) => canConnect(part)
    ? <button type="button" key={index} className={`coach-piece coach-${part.role}`} data-link-role={part.role} data-link-active={focused === part.role} aria-label={`Relacionar ${part.text.trim()} con el ${language === 'en' ? 'español' : 'inglés'}`} aria-pressed={focused === part.role} onClick={() => setFocus(part.role)}>{part.text}</button>
    : <span key={index} className={`coach-piece coach-${part.role}`} data-link-role={part.role} data-link-active={focused === part.role}>{part.text}</span>)}</p> : <GrammarRow parts={parts} language={language} />;
  const bridge = connected ? <div className={`comparison-piece-link${focused ? ' has-focus' : ''}`} role="status">{focused ? <><span lang="es">{phrase(shown.es.filter((part) => part.role === focused))}</span><span aria-hidden="true">↔</span><strong lang="en">{phrase(shown.en.filter((part) => part.role === focused))}</strong></> : <span>Toca una pieza y encuentra su pareja.</span>}</div> : null;
  if (interactive && previous && !previous.hideEnglish && !step.hideEnglish && (changed.length || contraction)) {
    const english = shown.en.map((part) => part.text).join('');
    return <div className={`coach-demonstration coach-comparison comparison-lab${focused ? ' is-piece-focused' : ''}`}>
      {row(shown.es, 'es')}
      <span className="coach-direction" aria-hidden="true">↓</span>
      <div className="comparison-lab-model" key={before ? 'before' : 'after'}>{row(shown.en, 'en')}</div>
      {bridge}
      <p className="coach-caption" role="status"><GrammarCaption text={before ? previous.caption : caption} marks={shown.captionMarks ?? [...shown.es, ...shown.en].filter((part) => part.role !== 'context').map((part) => ({ ...part, text: part.text.trim() }))} /></p>
      <div className="comparison-lab-controls"><button type="button" className="comparison-replay" aria-pressed={before} onClick={() => {
        playback.reset(); stopSpeech(); setBefore(!before); setFocus(undefined);
      }}>{before ? 'Ver la transformación →' : '↔ Comparar con antes'}</button>
      <button type="button" className="round-audio" aria-label="Escuchar el ejemplo visible" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(english)}>🔊</button></div>
      <AssociationAudioStatus compact state={playback.audio} />
    </div>;
  }
  const occurrences = new Map<string, number>();
  return <div className={`coach-demonstration coach-comparison${focused ? ' is-piece-focused' : ''}`}>
    <div><small className="coach-language">ESPAÑOL</small>{row(step.es, 'es')}</div>
    {!step.hideEnglish ? <><span className="coach-direction" aria-hidden="true">↓</span><div><small className="coach-language">INGLÉS</small>
      {connected ? row(step.en, 'en') : <p className="coach-row" lang="en">{step.en.map((part, index) => {
        const identity = grammarPieceIdentity(part); const occurrence = occurrences.get(identity) ?? 0;
        occurrences.set(identity, occurrence + 1);
        const key = `${identity}:${occurrence}`;
        if (contraction && index === 0) return <span key={`${key}:${replay}`} className="comparison-contraction">
          <span className="comparison-source" aria-hidden="true"><span className="coach-subject">{previous!.en[0].text}</span><span className="coach-auxiliary">{previous!.en[1].text}</span></span>
          <span className="comparison-joined"><span className="coach-subject">{part.text[0]}</span><span className="coach-auxiliary">{part.text.slice(1)}</span></span>
        </span>;
        return <span key={changed.includes(index) ? `${key}:${replay}` : key} className={`coach-piece coach-${part.role}${changed.includes(index) ? ' comparison-changed' : ''}`}>{part.text}</span>;
      })}</p>}
      {bridge}
      {connected ? <AssociationAudioStatus compact state={playback.audio} /> : null}
      {!connected && (changed.length || contraction) ? <button type="button" className="comparison-replay" onClick={(event) => { event.stopPropagation(); setReplay((value) => value + 1); }}><span aria-hidden="true">↻ </span>Repetir cambio</button> : null}
    </div></> : null}
  </div>;
}
