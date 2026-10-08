import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar, SpeakBtn, fmtTime, playNaturalFast } from '../components/common';
import { SentenceDiff } from '../components/SentenceDiff';
import { DAY_JOURNEY, journeyProgress, saveJourneyProgress } from '../data/dayJourney';
import { sentenceScore } from '../lib/answer';

const CHAPTER_SECONDS = 180;

export function Journey() {
  const [chapterIndex, setChapterIndex] = useState(journeyProgress());
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(CHAPTER_SECONDS);
  const [englishVisible, setEnglishVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const chapter = DAY_JOURNEY[chapterIndex];

  useEffect(() => {
    if (!chapter) return;
    const cancel = playNaturalFast(chapter.sceneEn);
    setAnswer('');
    setScore(null);
    setSeconds(CHAPTER_SECONDS);
    setEnglishVisible(false);
    setCompleted(false);
    return cancel;
  }, [chapterIndex, chapter]);

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
    const nextScore = sentenceScore(answer, chapter.target);
    setScore(nextScore);
    if (nextScore >= 0.68) {
      saveJourneyProgress(chapterIndex + 1);
      setCompleted(true);
    }
  };

  const next = () => {
    setChapterIndex((value) => Math.min(value + 1, DAY_JOURNEY.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <div className="journey-audio-row"><SpeakBtn text={chapter.sceneEn} title="Escuchar la escena" /><span>Escucha la escena completa. La voz se reproduce automáticamente.</span><button className="text-link" type="button" onClick={() => setEnglishVisible((value) => !value)}>{englishVisible ? 'Ocultar inglés' : 'Ver inglés'}</button></div>
          {englishVisible && <p className="journey-scene-en">{chapter.sceneEn}</p>}
        </div>
      </section>

      <section className="journey-mission">
        <div className="journey-mission-head"><div><span className="chip accent">2 · PRODUCE</span><h2>Ahora dilo tú</h2><p className="muted">No copies la escena. Usa esta pieza para construir una frase que podrías decir hoy.</p></div><span className="journey-reward">+{chapter.reward} XP</span></div>
        <div className="journey-pattern"><span>La estructura</span><b>{chapter.pattern}</b></div>
        <div className="journey-word-chips">{chapter.words.map(([en, es]) => <span key={en}><b>{en}</b><small>{es}</small></span>)}</div>
        <div className="journey-input-wrap"><input autoFocus value={answer} onChange={(event) => { setAnswer(event.target.value); if (score !== null) setScore(null); }} onKeyDown={(event) => { if (event.key === 'Enter' && !completed) { event.preventDefault(); check(); } }} placeholder="Escribe tu frase en inglés · Enter para comprobar" disabled={completed} /><button className="btn" type="button" onClick={check} disabled={!answer.trim() || completed}>Comprobar ↵</button></div>
        {score !== null && <div className={`journey-feedback ${score >= 0.68 ? 'success' : 'try-again'}`}><b>{score >= 0.68 ? '✅ Escena desbloqueada' : '🔁 Casi. Mira la estructura y vuelve a intentarlo'}</b><span>{score >= 0.68 ? 'La frase ya está disponible para usarla en tu día.' : 'No buscamos perfección: buscamos que recuerdes el patrón.'}</span><SentenceDiff given={answer} expected={chapter.target} /></div>}
        {completed && <div className="journey-next"><div><b>+{chapter.reward} XP · racha de aprendizaje mantenida</b><span>La siguiente escena continúa la historia.</span></div><button className="btn" type="button" onClick={next}>{chapterIndex + 1 >= DAY_JOURNEY.length ? 'Ver cierre del día →' : 'Siguiente escena →'}</button></div>}
      </section>

      <div className="journey-method"><span>🧠 Asociar</span><i>→</i><span>👂 Escuchar</span><i>→</i><span>🗣️ Producir</span><i>→</i><span>🏆 Desbloquear</span></div>
    </div>
  );
}
