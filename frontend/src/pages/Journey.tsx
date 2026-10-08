import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar, fmtTime, playNaturalFast } from '../components/common';
import { SentenceDiff } from '../components/SentenceDiff';
import { DAY_JOURNEY, journeyProgress, saveJourneyProgress } from '../data/dayJourney';
import { normalize, sentenceScore, sentenceTokens } from '../lib/answer';

const CHAPTER_SECONDS = 180;

function evaluateProduction(answer: string, requiredWords: string[], minWords: number, target: string) {
  const text = normalize(answer);
  const words = sentenceTokens(answer);
  const missing = requiredWords.filter((word) => !text.includes(normalize(word)));
  const enoughWords = words.length >= minWords;
  const canonicalScore = sentenceScore(answer, target);
  const accepted = (missing.length === 0 && enoughWords) || canonicalScore >= 0.78;
  return { score: accepted ? Math.max(canonicalScore, 0.75) : canonicalScore, accepted, missing, wordCount: words.length };
}

export function Journey() {
  const [chapterIndex, setChapterIndex] = useState(journeyProgress());
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(CHAPTER_SECONDS);
  const [englishVisible, setEnglishVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [stage, setStage] = useState<'listen' | 'produce'>('listen');
  const [playCount, setPlayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chapter = DAY_JOURNEY[chapterIndex];

  useEffect(() => {
    if (!chapter) return;
    const cancel = playNaturalFast(chapter.sceneEn);
    setAnswer('');
    setScore(null);
    setSeconds(CHAPTER_SECONDS);
    setEnglishVisible(false);
    setCompleted(false);
    setAccepted(false);
    setMissing([]);
    setStage('listen');
    setPlayCount(0);
    return cancel;
  }, [chapterIndex, chapter]);

  useEffect(() => { if (stage === 'produce') inputRef.current?.focus(); }, [stage]);

  useEffect(() => {
    if (!chapter || completed || seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [chapter, completed, seconds]);

  if (!chapter) {
    return (
      <div className="stack journey-page">
        <div className="journey-complete card center stack">
          <div className="journey-confetti" aria-hidden="true">🌅 ☕ 🚗 💻 💬 🌙</div>
          <span className="eyebrow">RECORRIDO COMPLETADO</span>
          <h1>Has contado un día entero en inglés.</h1>
          <p className="muted">Ya no has estudiado frases aisladas: las has usado para despertarte, trabajar, conversar y resolver un problema.</p>
          <div className="row center"><Link className="btn" to="/sesion">Añadir palabras a la memoria →</Link><Link className="btn secondary" to="/">Volver a Hoy</Link></div>
        </div>
      </div>
    );
  }

  const check = () => {
    const result = evaluateProduction(answer, chapter.requiredWords, chapter.minWords, chapter.target);
    setScore(result.score);
    setAccepted(result.accepted);
    setMissing(result.missing);
    if (result.accepted) {
      saveJourneyProgress(chapterIndex + 1);
      setCompleted(true);
    }
  };

  const next = () => {
    setChapterIndex((value) => Math.min(value + 1, DAY_JOURNEY.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const replay = () => { setPlayCount((count) => count + 1); playNaturalFast(chapter.sceneEn); };

  return (
    <div className="stack journey-page">
      <div className="journey-heading">
        <div>
          <Link to="/" className="back-link">← Hoy</Link>
          <span className="eyebrow">HISTORIA DEL DÍA · ESCENA {chapter.number}/{DAY_JOURNEY.length}</span>
          <h1>{chapter.emoji} {chapter.title}</h1>
          <p className="muted">{chapter.moment}. Una escena, una estructura y una frase que sale de ti.</p>
        </div>
        <div className={`journey-timer ${seconds < 30 ? 'urgent' : ''}`}><span>⏱</span><b>{fmtTime(seconds)}</b><small>para intentarlo</small></div>
      </div>

      <div className="journey-progress"><ProgressBar value={chapterIndex} max={DAY_JOURNEY.length} /><span>{chapterIndex} de {DAY_JOURNEY.length} escenas desbloqueadas</span></div>

      <section className="journey-scene card">
        <div className="journey-illustration" role="img" aria-label={`Escena: ${chapter.moment}`}><img src="/images/story-library-cover.png" alt="Ilustración de una historia que continúa" /><span>{chapter.emoji}</span></div>
        <div className="journey-scene-copy">
          <span className="chip primary">1 · ENTRA EN LA ESCENA</span>
          <h2>{chapter.sceneEs}</h2>
          <div className="journey-audio-controls"><button className="btn secondary" type="button" onClick={replay}>🔊 {playCount ? 'Repetir la frase' : 'Escuchar la frase'}</button><span>{playCount ? `La has escuchado ${playCount} ${playCount === 1 ? 'vez' : 'veces'}.` : 'Primero escucha y entiende la situación.'}</span><button className="text-link" type="button" onClick={() => setEnglishVisible((value) => !value)}>{englishVisible ? 'Ocultar inglés' : 'Ver inglés si lo necesitas'}</button></div>
          {englishVisible && <p className="journey-scene-en">{chapter.sceneEn}</p>}
        </div>
      </section>

      {stage === 'listen' ? <section className="journey-listen-step card"><span className="chip primary">PASO 1 DE 2 · ESCUCHA Y ENTIENDE</span><h2>¿Qué está pasando en esta escena?</h2><p className="muted">No escribas todavía la frase que has oído. Puedes reproducirla de nuevo, ver el inglés si lo necesitas y pensar en la situación.</p><div className="journey-listen-check"><span>✅ Ya sabes quién habla y qué necesita hacer.</span><span>✅ Ya tienes claro qué responderías tú.</span></div><div className="row"><button className="btn" type="button" onClick={() => setStage('produce')}>Ya entiendo la situación →</button><button className="btn ghost" type="button" onClick={replay}>🔁 Escuchar otra vez</button></div></section> : <section className="journey-mission">
        <div className="journey-mission-head"><div><span className="chip accent">2 · PRODUCE</span><h2>Ahora resuelve la situación</h2><p className="muted">No copies la frase escuchada. Responde al reto con tus propias palabras y construye una respuesta completa.</p></div><span className="journey-reward">+{chapter.reward} XP</span></div>
        <button className="journey-back-listen" type="button" onClick={() => setStage('listen')}>← Volver a escuchar y entender</button>
        <div className="journey-challenge"><b>🎯 Tu reto:</b> {chapter.challengeEs}</div>
        <div className="journey-pattern"><span>La estructura</span><b>{chapter.pattern}</b></div>
        <div className="journey-word-chips">{chapter.words.map(([en, es]) => <span key={en}><b>{en}</b><small>{es}</small></span>)}</div>
        <div className="journey-constraints"><span>Usa al menos <b>{chapter.minWords} palabras</b></span><span>Incluye: <b>{chapter.requiredWords.join(' · ')}</b></span></div>
        <div className="journey-input-wrap"><input ref={inputRef} value={answer} onChange={(event) => { setAnswer(event.target.value); if (score !== null) { setScore(null); setAccepted(false); setMissing([]); } }} onKeyDown={(event) => { if (event.key === 'Enter' && !completed) { event.preventDefault(); check(); } }} placeholder={`Responde con ${chapter.minWords} palabras o más · Enter para comprobar`} disabled={completed} /><button className="btn" type="button" onClick={check} disabled={!answer.trim() || completed}>Comprobar ↵</button></div>
        {score !== null && <div className={`journey-feedback ${accepted ? 'success' : 'try-again'}`}><b>{accepted ? '✅ Respuesta válida · escena desbloqueada' : '🔁 Aún falta completar el reto'}</b><span>{accepted ? `Has construido una respuesta de ${sentenceTokens(answer).length} palabras con tus propias piezas.` : `${missing.length ? `Añade: ${missing.join(', ')}.` : `Escribe al menos ${chapter.minWords} palabras.`} No copies: vuelve a intentarlo con la situación.`}</span>{!accepted && <SentenceDiff given={answer} expected={chapter.target} />}</div>}
        {completed && <div className="journey-next"><div><b>+{chapter.reward} XP · racha de aprendizaje mantenida</b><span>La siguiente escena continúa la historia.</span></div><button className="btn" type="button" onClick={next}>{chapterIndex + 1 >= DAY_JOURNEY.length ? 'Ver cierre del día →' : 'Siguiente escena →'}</button></div>}
      </section>}

      <div className="journey-method"><span>🧠 Asociar</span><i>→</i><span>👂 Escuchar</span><i>→</i><span>🗣️ Producir</span><i>→</i><span>🏆 Desbloquear</span></div>
    </div>
  );
}
