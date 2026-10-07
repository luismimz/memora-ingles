import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpeakBtn } from '../components/common';
import { normalize } from '../lib/answer';
import { useStore } from '../store';
import type { Word } from '../types';

function PhrasalCard({ word }: { word: Word }) {
  const [open, setOpen] = useState(false);
  const parts = word.en.split(' ');
  return (
    <article className="card phrasal-card">
      <div className="spread">
        <div className="phrasal-title"><b>{parts[0]}</b><span>{parts.slice(1).join(' ')}</span></div>
        <SpeakBtn text={word.en} natural title="Escuchar el phrasal verb" />
      </div>
      <div className="phrasal-meaning">{word.es}</div>
      <div className="example"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{word.example_en || '—'}</b><SpeakBtn text={word.example_en} natural /></div><div className="small muted">{word.example_es}</div></div>
      <button className="text-link phrasal-toggle" onClick={() => setOpen((v) => !v)}>{open ? 'Ocultar idea' : 'Ver cómo recordarlo'}</button>
      {open && <div className="small muted phrasal-note">No lo traduzcas palabra por palabra: imagina una sola acción. Después tapa la tarjeta e intenta producir el ejemplo.</div>}
    </article>
  );
}

export function PhrasalVerbs() {
  const { words } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = normalize(q);
    return words.filter((w) => w.kind === 'phrasal' && (!query || normalize(`${w.en} ${w.es} ${w.topic || ''}`).includes(query)));
  }, [words, q]);
  return (
    <div className="stack">
      <div className="page-heading"><div><span className="eyebrow">ENTENDER A LOS NATIVOS</span><h1>🔀 Phrasal verbs</h1><p className="muted">Verbo + partícula = una unidad nueva. Estúdialos en frases completas, no como listas aisladas.</p></div><div className="settings-orb">💬</div></div>
      <div className="card phrasal-intro"><b>La ruta corta para las conversaciones</b><span>Empieza por los más frecuentes. Cuando aparezcan en una historia o canción, guárdalos en <Link to="/palabras">Mi vocabulario</Link> y vuelve a producirlos.</span></div>
      <div className="row"><input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: give up, buscar, informática…" /><span className="chip primary">{list.length} unidades</span></div>
      <div className="small muted">Cada tarjeta incluye pronunciación natural y una frase que podrás reutilizar.</div>
      <div className="phrasal-grid">{list.slice(0, 120).map((w) => <PhrasalCard key={w.id} word={w} />)}</div>
      {!list.length && <div className="card center muted">Todavía no se han cargado los phrasal verbs. Ejecuta el sembrado de contenido en Coolify y vuelve a cargar.</div>}
    </div>
  );
}
