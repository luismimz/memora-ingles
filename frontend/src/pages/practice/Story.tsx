import { useState } from 'react';
import { ErrorBox, Rich, SpeakBtn } from '../../components/common';
import { ai } from '../../lib/api';
import { checkAnswer } from '../../lib/answer';
import { useStore } from '../../store';
import { BackHeader, NeedsAi, NeedsWords, useLearnedWords } from './shared';

interface StoryOut { title: string; story_en: string; story_es: string; questions: { q: string; a: string }[] }

export function Story() {
  const store = useStore();
  const learned = useLearnedWords();
  const [story, setStory] = useState<StoryOut | null>(null);
  const [showEs, setShowEs] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const generate = async () => {
    setBusy(true); setError(null); setChecked(false); setAnswers([]);
    try { setStory(await ai<StoryOut>('story', { words: learned.slice(0, 30).map((w) => w.en), model: store.aiModel })); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };

  if (!store.aiInfo.enabled) return <div className="stack"><BackHeader title="📜 Historia del día" /><NeedsAi /></div>;
  if (!learned.length) return <div className="stack"><BackHeader title="📜 Historia del día" /><NeedsWords /></div>;

  return (
    <div className="stack">
      <BackHeader title="📜 Historia del día" subtitle="Lee (y escucha) tus palabras nuevas dentro de un contexto real. Es el paso de «memorizar» a «reconocer»." />
      <button className="btn" disabled={busy} onClick={generate}>{busy ? '⏳ Escribiendo…' : story ? '🎲 Otra historia' : '✨ Crear la historia con mis palabras'}</button>
      <ErrorBox error={error} />
      {story && (
        <>
          <div className="card stack">
            <div className="spread"><h2 style={{ margin: 0 }}>{story.title}</h2><SpeakBtn text={story.story_en} /></div>
            <div style={{ fontSize: '1.08rem', lineHeight: 1.7 }}><Rich text={story.story_en} /></div>
            <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEs(!showEs)}>{showEs ? 'Ocultar traducción' : '🇪🇸 Ver traducción'}</button>
            {showEs && <div className="muted"><Rich text={story.story_es} /></div>}
          </div>
          <div className="card stack">
            <b>¿Lo has entendido?</b>
            {story.questions.map((q, i) => {
              const ok = checked && (checkAnswer(answers[i] ?? '', q.a).correct || (answers[i] ?? '').toLowerCase().includes(q.a.toLowerCase()));
              return (
                <label key={i} className="field">{q.q}
                  <input type="text" value={answers[i] ?? ''} onChange={(e) => setAnswers((a) => { const c = [...a]; c[i] = e.target.value; return c; })} readOnly={checked} />
                  {checked && <span className={`small ${ok ? '' : 'muted'}`}>{ok ? '✅' : '💡'} {q.a}</span>}
                </label>
              );
            })}
            {!checked && <button className="btn" onClick={() => setChecked(true)}>Comprobar</button>}
          </div>
        </>
      )}
    </div>
  );
}
