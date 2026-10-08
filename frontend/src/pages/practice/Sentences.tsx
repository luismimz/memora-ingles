import { useEffect, useState } from 'react';
import { ErrorBox, playNaturalFast, Rich, shuffle, SpeakBtn, Spinner, toast } from '../../components/common';
import { ai, items } from '../../lib/api';
import { sentenceScore } from '../../lib/answer';
import { useStore } from '../../store';
import type { Sentence } from '../../types';
import { BackHeader } from './shared';
import { SentenceDiff } from '../../components/SentenceDiff';

interface Translation { en: string; alternatives: string[]; notes_es: string }
interface Correction { correct: boolean; corrected: string; explanation_es: string; natural: string; score: number }

export function Sentences() {
  const store = useStore();
  const [list, setList] = useState<Sentence[] | null>(null);
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [tr, setTr] = useState<Translation | null>(null);
  const [fb, setFb] = useState<Correction | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [drill, setDrill] = useState<Sentence[] | null>(null);

  useEffect(() => { items.list<Sentence>('sentences', { sort: '-created_at' }).then(setList).catch(setError); }, []);

  const translate = async () => {
    setBusy('tr'); setError(null);
    try { const out = await ai<Translation>('translate', { text: es, model: store.aiModel }); setTr(out); setEn(out.en); playNaturalFast(out.en); }
    catch (e) { setError(e); } finally { setBusy(null); }
  };
  const correct = async () => {
    setBusy('fb'); setError(null);
    try { setFb(await ai<Correction>('correct', { sentence: en, intended: es || undefined, model: store.aiModel })); }
    catch (e) { setError(e); } finally { setBusy(null); }
  };
  const save = async () => {
    const s = await items.create<Sentence>('sentences', { kind: 'mine', en: fb?.corrected || en, es: es || null, feedback: fb?.explanation_es ?? null, score: fb?.score ?? null, favorite: false });
    setList((l) => [s, ...(l ?? [])]);
    setEs(''); setEn(''); setTr(null); setFb(null);
    toast('📝 Frase guardada');
  };
  const toggleFav = async (s: Sentence) => {
    const next = await items.update<Sentence>('sentences', s.id, { favorite: !s.favorite });
    setList((l) => l!.map((x) => (x.id === s.id ? next : x)));
  };
  const remove = async (s: Sentence) => {
    await items.remove('sentences', s.id);
    setList((l) => l!.filter((x) => x.id !== s.id));
  };

  if (drill) return <Drill list={drill} onExit={() => setDrill(null)} />;

  return (
    <div className="stack">
      <BackHeader title="📝 Mis frases" subtitle="Frases largas que vas a usar de verdad: trabajo, viajes, presentarte… Repítelas hasta que salgan solas." />
      <div className="card stack">
        <label className="field">¿Qué quieres saber decir? (en español)
          <textarea value={es} onChange={(e) => setEs(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && store.aiInfo.enabled && es.trim()) { e.preventDefault(); translate(); } }} placeholder="Ej.: Llevo 30 días aprendiendo inglés y ya puedo pedir comida en un restaurante · Enter para traducir" style={{ minHeight: 70 }} />
        </label>
        {store.aiInfo.enabled && <button className="btn secondary" disabled={!es.trim() || !!busy} onClick={translate}>{busy === 'tr' ? '⏳' : '🤖'} ¿Cómo se dice?</button>}
        {tr && (
          <div className="stack small">
            {tr.alternatives?.length > 0 && <div className="muted">También: {tr.alternatives.join(' · ')}</div>}
            {tr.notes_es && <div><Rich text={tr.notes_es} /></div>}
          </div>
        )}
        <label className="field">Tu frase en inglés
          <textarea value={en} onChange={(e) => { setEn(e.target.value); setFb(null); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && store.aiInfo.enabled && en.trim()) { e.preventDefault(); correct(); } }} placeholder="Escríbela tú (o usa «¿Cómo se dice?») · Enter para corregir" style={{ minHeight: 70 }} />
        </label>
        <div className="row">
          {en && <SpeakBtn text={en} />}
          {store.aiInfo.enabled && <button className="btn secondary grow" disabled={!en.trim() || !!busy} onClick={correct}>{busy === 'fb' ? '⏳' : '✔️'} Corregir</button>}
          <button className="btn grow" disabled={!en.trim()} onClick={save}>Guardar</button>
        </div>
        {fb && (
          <div className="stack">
            <div className={`feedback ${fb.correct ? 'ok' : 'doubt'}`}>{fb.correct ? '✅' : '✏️'} {fb.corrected} <span className="chip">{fb.score}/10</span></div>
            <div className="small"><Rich text={fb.explanation_es} /></div>
            {fb.natural && <div className="small">Nativo: <b>{fb.natural}</b> <SpeakBtn text={fb.natural} /></div>}
          </div>
        )}
        <ErrorBox error={error} />
      </div>

      {list === null ? <Spinner /> : list.length > 0 && (
        <>
          <div className="spread">
            <h2 style={{ margin: 0 }}>Tu banco ({list.length})</h2>
            <button className="btn small" disabled={!list.some((s) => s.es)} onClick={() => setDrill(shuffle(list.filter((s) => s.es)).slice(0, 15))}>🏋️ Entrenar</button>
          </div>
          <div className="card" style={{ padding: '6px 14px' }}>
            {list.map((s) => (
              <div key={s.id} className="list-item" style={{ cursor: 'default' }}>
                <button className="icon-btn" onClick={() => toggleFav(s)} title="Favorita">{s.favorite ? '⭐' : '☆'}</button>
                <div className="grow"><b>{s.en}</b>{s.es && <div className="small muted">{s.es}</div>}</div>
                <SpeakBtn text={s.en} />
                <button className="icon-btn" onClick={() => remove(s)} title="Borrar">🗑️</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Entrenamiento: ves el español y lo dices/escribes en inglés. */
function Drill({ list, onExit }: { list: Sentence[]; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const s = list[i];
  if (!s) return (
    <div className="card center stack"><div style={{ fontSize: '2.5rem' }}>🏁</div><b>¡Entrenamiento terminado!</b><button className="btn" onClick={onExit}>Volver</button></div>
  );
  return (
    <div className="stack">
      <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={onExit}>✕ Salir</button>
      <span className="small muted">{i + 1}/{list.length}</span>
      <div className="card stack">
        <div className="big-prompt" style={{ fontSize: '1.3rem' }}>{s.es}</div>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && score === null) { e.preventDefault(); setScore(sentenceScore(answer, s.en)); playNaturalFast(s.en); } }} placeholder="Dilo en voz alta y escríbelo… · Enter para validar" readOnly={score !== null} style={{ minHeight: 70 }} />
        {score === null ? (
          <button className="btn" onClick={() => { setScore(sentenceScore(answer, s.en)); playNaturalFast(s.en); }}>Comprobar · Enter ↵</button>
        ) : (
          <>
            <SentenceDiff given={answer} expected={s.en} />
            <button className="btn" autoFocus onClick={() => { setI(i + 1); setAnswer(''); setScore(null); }}>Siguiente →</button>
          </>
        )}
      </div>
    </div>
  );
}
