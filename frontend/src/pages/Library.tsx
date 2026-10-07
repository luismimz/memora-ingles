import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackHeader } from './practice/shared';
import { ErrorBox, Modal, Rich, SpeakBtn, toast } from '../components/common';
import { ai, items } from '../lib/api';
import { useStore } from '../store';
import type { PersonalVocabulary } from '../types';

interface Reading { id: string; title: string; author: string; genre: string; level: string; cover: string; intro: string; paragraphs: string[]; note: string }
interface Definition { term: string; meaning_es: string; note_es: string; example_en: string }

const READINGS: Reading[] = [
  { id: 'wonderland', title: 'Alice in Wonderland', author: 'Lewis Carroll · adaptación guiada', genre: 'Aventura', level: 'A1–A2', cover: '🫖', intro: 'Alice is sitting by the river when she sees a very unusual rabbit.', paragraphs: [
    'Alice is sitting by the river, feeling bored and sleepy. Suddenly, she sees a white rabbit wearing a small coat.',
    'The rabbit looks at a little clock and says, “Oh dear! I am late.” Alice jumps up and follows him down a deep hole.',
  ], note: 'Texto breve adaptado para practicar; no sustituye a la obra completa.' },
  { id: 'garden', title: 'The Secret Garden', author: 'Frances Hodgson Burnett · adaptación guiada', genre: 'Misterio', level: 'A2', cover: '🌿', intro: 'Mary arrives at a quiet house and discovers a locked garden.', paragraphs: [
    'Mary arrives at a large house in the country. The rooms are quiet, and the garden is surrounded by a high wall.',
    'One morning, she finds a small key under the leaves. She looks at the old door and wonders what is behind it.',
  ], note: 'Texto breve adaptado para practicar; no sustituye a la obra completa.' },
  { id: 'sherlock', title: 'Sherlock Holmes', author: 'Arthur Conan Doyle · adaptación guiada', genre: 'Detective', level: 'A2–B1', cover: '🔎', intro: 'A strange message brings a new mystery to Baker Street.', paragraphs: [
    'A visitor arrives at Baker Street with a strange message. Sherlock Holmes reads it twice and stays completely calm.',
    '“There is a clue in every detail,” he says. Watson takes his notebook, and the two friends leave to solve the mystery.',
  ], note: 'Texto breve adaptado para practicar; no sustituye a la obra completa.' },
];

function ActiveText({ text, onWord }: { text: string; onWord: (word: string) => void }) {
  return <>{text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g).map((part, i) => /^[A-Za-z]/.test(part)
    ? <button key={`${part}-${i}`} className="story-word" onClick={() => onWord(part)}>{part}</button>
    : <span key={i}>{part}</span>)}</>;
}

export function Library() {
  const store = useStore();
  const [reading, setReading] = useState<Reading | null>(null);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const words = useMemo(() => reading ? [reading.intro, ...reading.paragraphs].join(' ') : '', [reading]);

  const inspectWord = async (term: string) => {
    setBusy(true); setError(null); setDefinition(null); setSaved(false);
    try { setDefinition(await ai<Definition>('define', { term, context: words, model: store.aiModel })); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  const saveWord = async () => {
    if (!definition || !reading) return;
    await items.create<PersonalVocabulary>('personal_vocabulary', { term: definition.term.toLowerCase(), meaning_es: definition.meaning_es, note_es: definition.note_es || null, example_en: definition.example_en || null, context_en: words, source: `library:${reading.id}` });
    setSaved(true); toast(`📌 “${definition.term}” guardada en Mi vocabulario`);
  };

  return (
    <div className="stack">
      <BackHeader title="📚 Biblioteca" subtitle="Lee algo que te apetezca, escucha la historia y toca cualquier palabra para convertirla en vocabulario útil." />
      {!reading ? <>
        <div className="story-library-hero"><img src="/images/story-library-cover.png" alt="Biblioteca visual de Memora" /><div className="story-library-copy"><b>Historias que te hacen continuar</b><span>Lecturas breves, conocidas y adaptadas para que entiendas cada vez más sin traducirlo todo.</span></div></div>
        <div className="library-note card flat"><span>🛡️</span><div><b>Lecturas adaptadas de obras de dominio público</b><div className="small muted">Empezamos con fragmentos cortos para que puedas terminar una escena y notar avance real.</div></div></div>
        <div className="library-grid">{READINGS.map((item) => <button type="button" className="library-card card" key={item.id} onClick={() => setReading(item)}><span className="library-cover">{item.cover}</span><span className="chip primary">{item.genre} · {item.level}</span><b>{item.title}</b><span className="small muted">{item.author}</span><span className="library-cta">Empezar lectura →</span></button>)}</div>
      </> : <>
        <button className="btn ghost" onClick={() => setReading(null)}>← Volver a la biblioteca</button>
        <div className="card stack reading-heading"><div className="row"><span className="library-cover small">{reading.cover}</span><div><span className="chip primary">{reading.genre} · {reading.level}</span><h2 style={{ margin: '.3rem 0 0' }}>{reading.title}</h2><div className="small muted">{reading.author}</div></div></div><p style={{ margin: 0 }}>{reading.note}</p></div>
        <div className="card stack reading-card"><div className="spread"><span className="chip accent">Lee y escucha</span><SpeakBtn text={words} natural /></div><p className="reading-text"><ActiveText text={reading.intro} onWord={inspectWord} /></p>{reading.paragraphs.map((paragraph) => <p className="reading-text" key={paragraph}><ActiveText text={paragraph} onWord={inspectWord} /></p>)}<div className="small muted">💡 Toca una palabra para entenderla y guardarla. La próxima vez reconocerás más sin traducir.</div></div>
        <Link className="btn secondary" to="/practica/historia">Continuar con una historia usando mis palabras →</Link>
      </>}
      <ErrorBox error={error} />
      {(busy || definition) && <Modal onClose={() => { if (!busy) setDefinition(null); }}>{busy ? <div className="stack center"><div className="spinner" /><span className="muted">Buscando un significado claro…</span></div> : definition && <div className="stack"><div className="spread"><h2 style={{ margin: 0 }}>{definition.term}</h2><SpeakBtn text={definition.term} natural /></div><div className="feedback ok">{definition.meaning_es}</div>{definition.note_es && <div className="small muted"><Rich text={definition.note_es} /></div>}{definition.example_en && <div className="example"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{definition.example_en}</b><SpeakBtn text={definition.example_en} natural /></div></div>}<button className="btn" disabled={saved} onClick={saveWord}>{saved ? '✅ Guardada en Mi vocabulario' : '📌 Añadir a Mi vocabulario'}</button></div>}</Modal>}
    </div>
  );
}
