import { useEffect, useMemo, useState } from 'react';
import { Modal, Spinner } from '../components/common';
import { ExposureCard } from '../components/ExposureCard';
import { items } from '../lib/api';
import { normalize } from '../lib/answer';
import { isLeech, STEP_LABEL } from '../lib/srs';
import { useStore } from '../store';
import type { Attempt, Progress, Word } from '../types';

type Filter = 'mine' | 'learning' | 'mastered' | 'leech' | 'known' | 'all';
const FILTERS: [Filter, string][] = [['mine', 'Mis palabras'], ['learning', 'Aprendiendo'], ['mastered', 'Dominadas'], ['leech', '😈 Rebeldes'], ['known', 'Ya sabía'], ['all', 'Todas']];

function statusChip(p: Progress | undefined) {
  if (!p) return <span className="chip">nueva</span>;
  if (p.status === 'known') return <span className="chip">ya la sabía</span>;
  if (isLeech(p)) return <span className="chip fail">rebelde</span>;
  if (p.status === 'mastered') return <span className="chip ok">dominada</span>;
  return <span className="chip primary">{STEP_LABEL[p.step]}</span>;
}

export function Words() {
  const store = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('mine');
  const [open, setOpen] = useState<Word | null>(null);

  const list = useMemo(() => {
    const nq = normalize(q);
    return store.words.filter((w) => {
      const p = store.progress.get(w.id);
      const ok = filter === 'all' ? true
        : filter === 'mine' ? p && p.status !== 'known'
        : filter === 'learning' ? p && (p.status === 'learning' || p.status === 'review')
        : filter === 'mastered' ? p?.status === 'mastered'
        : filter === 'leech' ? p && p.status !== 'known' && isLeech(p)
        : p?.status === 'known';
      return ok && (!nq || normalize(w.en).includes(nq) || normalize(w.es).includes(nq));
    });
  }, [store.words, store.progress, q, filter]);

  return (
    <div className="stack">
      <h1>📖 Palabras</h1>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en inglés o español…" />
      <div className="row">
        {FILTERS.map(([k, label]) => (
          <button key={k} className={`chip ${filter === k ? 'primary' : ''}`} style={{ border: 0, cursor: 'pointer', padding: '6px 12px' }} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <div className="small muted">{list.length} palabras</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {list.length === 0 && <p className="muted small" style={{ padding: '10px 0' }}>Nada por aquí.</p>}
        {list.slice(0, 300).map((w) => (
          <div key={w.id} className="list-item" onClick={() => { store.mnemonicsFor([w.id], { fill: true }); setOpen(w); }}>
            <div className="grow"><b>{w.en}</b> <span className="muted">{w.es}</span></div>
            {statusChip(store.progress.get(w.id))}
          </div>
        ))}
      </div>
      {open && <Modal onClose={() => setOpen(null)}><WordDetail word={open} /></Modal>}
    </div>
  );
}

function WordDetail({ word }: { word: Word }) {
  const store = useStore();
  const p = store.progress.get(word.id);
  const [history, setHistory] = useState<Attempt[] | null>(null);
  useEffect(() => {
    items.list<Attempt>('attempts', { filter: { word: { _eq: word.id } }, sort: '-created_at', limit: 30 }).then(setHistory).catch(() => setHistory([]));
  }, [word.id]);

  return (
    <div className="stack">
      <ExposureCard word={word} variant="detail" />
      {p && p.status !== 'known' && (
        <div className="stats-row">
          <div className="stat"><div className="v">{p.ok}</div><div className="l">aciertos</div></div>
          <div className="stat"><div className="v">{p.doubt}</div><div className="l">dudas</div></div>
          <div className="stat"><div className="v">{p.fail}</div><div className="l">fallos</div></div>
          <div className="stat"><div className="v">{p.avg_ms ? `${(p.avg_ms / 1000).toFixed(1)}s` : '—'}</div><div className="l">tiempo medio</div></div>
        </div>
      )}
      {p?.due_at && p.status !== 'known' && <div className="small muted center">Siguiente prueba: {new Date(p.due_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
      <div className="card stack">
        <b>Historial</b>
        {history === null ? <Spinner /> : history.length === 0 ? <span className="muted small">Sin intentos todavía.</span> : history.map((a, i) => (
          <div key={i} className="spread small">
            <span>{a.created_at ? new Date(a.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : ''} · {a.kind}</span>
            <span className={`chip ${a.result}`}>{a.result === 'ok' ? '✅' : a.result === 'doubt' ? '🤔' : '❌'} {a.ms ? `${(a.ms / 1000).toFixed(1)}s` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
