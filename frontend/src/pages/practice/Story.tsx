import { useState } from 'react';
import { ErrorBox, Modal, playNaturalFast, Rich, SpeakBtn, toast } from '../../components/common';
import { ai, items } from '../../lib/api';
import { checkAnswer } from '../../lib/answer';
import { useStore } from '../../store';
import type { PersonalVocabulary } from '../../types';
import { BackHeader, NeedsAi, NeedsWords, useLearnedWords } from './shared';

interface StoryOut { title: string; story_en: string; story_es: string; grammar_focus?: { title: string; pattern: string; explanation_es: string; examples: { en: string; es: string }[] }; questions: { q: string; a: string }[] }
interface Definition { term: string; meaning_es: string; note_es: string; example_en: string }

function ActiveStory({ text, onWord }: { text: string; onWord: (word: string) => void }) {
  const parts = text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g);
  return <>{parts.map((part, i) => /^[A-Za-z]/.test(part)
    ? <button key={`${part}-${i}`} className="story-word" onClick={() => onWord(part.replace(/'s$/i, ''))} title={`Escuchar y entender “${part}”`}>{part}</button>
    : <span key={i}>{part}</span>)}</>;
}

export function Story() {
  const store = useStore();
  const learned = useLearnedWords();
  const [story, setStory] = useState<StoryOut | null>(null);
  const [showEs, setShowEs] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = async () => {
    setBusy(true); setError(null); setChecked(false); setAnswers([]);
    try { setStory(await ai<StoryOut>('story', { words: learned.slice(0, 30).map((w) => w.en), model: store.aiModel })); setDefinition(null); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };

  const inspectWord = async (term: string) => {
    if (!story) return;
    setWordBusy(true); setDefinition(null); setSaved(false); setError(null);
    try {
      const out = await ai<Definition>('define', { term, context: story.story_en, model: store.aiModel });
      setDefinition({ ...out, term: out.term || term });
    } catch (e) { setError(e); } finally { setWordBusy(false); }
  };

  const saveWord = async () => {
    if (!definition || !story) return;
    await items.create<PersonalVocabulary>('personal_vocabulary', {
      term: definition.term.toLowerCase(), meaning_es: definition.meaning_es, note_es: definition.note_es || null,
      example_en: definition.example_en || null, context_en: story.story_en, source: 'story',
    });
    setSaved(true); toast(`📌 “${definition.term}” guardada en Mi vocabulario`);
  };

  if (!store.aiInfo.enabled) return <div className="stack"><BackHeader title="📜 Historia del día" /><NeedsAi /></div>;
  if (!learned.length) return <div className="stack"><BackHeader title="📜 Historia del día" /><NeedsWords /></div>;

  return (
    <div className="stack">
      <BackHeader title="📜 Historia del día" subtitle="Lee, escucha y toca cualquier palabra que no entiendas. La podrás guardar para convertirla en vocabulario tuyo." />
      {!story && <div className="story-library-hero">
        <img src="/images/story-library-cover.png" alt="Un libro abierto que conduce a un palacio de la memoria con una llave, una maleta, un café y un micrófono." />
        <div className="story-library-copy"><b>Tu biblioteca está viva</b><span>Escucha, repite, explora palabras y haz que cada historia sea tuya.</span></div>
      </div>}
      <button className="btn" disabled={busy} onClick={generate}>{busy ? '⏳ Escribiendo…' : story ? '🎲 Otra historia' : '✨ Crear la historia con mis palabras'}</button>
      <ErrorBox error={error} />
      {story && (
        <>
          <div className="card stack">
            <div className="spread"><h2 style={{ margin: 0 }}>{story.title}</h2><SpeakBtn text={story.story_en} natural /></div>
            <div style={{ fontSize: '1.08rem', lineHeight: 1.9 }}><ActiveStory text={story.story_en} onWord={inspectWord} /></div>
            <div className="small muted">💡 Toca una palabra para escucharla, entenderla y guardarla.</div>
            <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEs(!showEs)}>{showEs ? 'Ocultar traducción' : '🇪🇸 Ver traducción'}</button>
            {showEs && <div className="muted"><Rich text={story.story_es} /></div>}
          </div>
          {story.grammar_focus && <div className="card stack grammar-card">
            <span className="chip primary" style={{ alignSelf: 'flex-start' }}>🧩 Gramática que acabas de ver</span>
            <h3 style={{ margin: 0 }}>{story.grammar_focus.title}</h3>
            <code>{story.grammar_focus.pattern}</code>
            <p className="small muted" style={{ margin: 0 }}>{story.grammar_focus.explanation_es}</p>
            {story.grammar_focus.examples?.map((example) => <div key={example.en} className="example">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{example.en}</b><SpeakBtn text={example.en} natural /></div>
              <div className="small muted">{example.es}</div>
            </div>)}
          </div>}
          <div className="card stack">
            <b>¿Lo has entendido?</b>
            {story.questions.map((q, i) => {
              const ok = checked && (checkAnswer(answers[i] ?? '', q.a).correct || (answers[i] ?? '').toLowerCase().includes(q.a.toLowerCase()));
              return (
                <label key={i} className="field">{q.q}
                  <input type="text" value={answers[i] ?? ''} onChange={(e) => setAnswers((a) => { const c = [...a]; c[i] = e.target.value; return c; })} onKeyDown={(e) => { if (e.key === 'Enter' && !checked) { e.preventDefault(); setChecked(true); } }} placeholder="Enter para validar" readOnly={checked} />
                  {checked && <span className={`small ${ok ? '' : 'muted'}`}>{ok ? '✅' : '💡'} {q.a}</span>}
                </label>
              );
            })}
            {!checked && <button className="btn" onClick={() => setChecked(true)}>Comprobar</button>}
          </div>
        </>
      )}
      {(wordBusy || definition) && <Modal onClose={() => { if (!wordBusy) setDefinition(null); }}>
        {wordBusy ? <div className="stack center"><div className="spinner" /><span className="muted">Preparando una explicación clara…</span></div> : definition && <div className="stack">
          <div className="spread"><h2 style={{ margin: 0 }}>{definition.term}</h2><SpeakBtn text={definition.term} natural /></div>
          <div className="feedback ok">{definition.meaning_es}</div>
          {definition.note_es && <div className="small muted"><Rich text={definition.note_es} /></div>}
          {definition.example_en && <div className="example"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{definition.example_en}</b><SpeakBtn text={definition.example_en} natural /></div></div>}
          <button className="btn" disabled={saved} onClick={saveWord}>{saved ? '✅ Guardada en Mi vocabulario' : '📌 Añadir a Mi vocabulario'}</button>
          <button className="btn secondary" onClick={() => { playNaturalFast(definition.term); setDefinition(null); }}>Seguir leyendo</button>
        </div>}
      </Modal>}
    </div>
  );
}
