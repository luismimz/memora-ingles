import { useEffect, useMemo, useState } from 'react';
import { ErrorBox, ProgressBar, Rich, shuffle, SpeakBtn, Spinner } from '../components/common';
import data from '../../../content/irregular_verbs.json';
import { items } from '../lib/api';
import { checkAnswer } from '../lib/answer';
import type { IrregularVerb, VerbProgress } from '../types';

const FAMILIES = data.families as { key: string; name: string; pattern: string; tip: string }[];
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 86400_000;

export function Verbs() {
  const [verbs, setVerbs] = useState<IrregularVerb[] | null>(null);
  const [prog, setProg] = useState<Map<number, VerbProgress>>(new Map());
  const [family, setFamily] = useState<string | null>(null);
  const [lesson, setLesson] = useState<IrregularVerb[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    Promise.all([items.list<IrregularVerb>('irregular_verbs', { sort: 'sort' }), items.list<VerbProgress>('verb_progress')])
      .then(([v, p]) => { setVerbs(v); setProg(new Map(p.map((x) => [x.verb, x]))); })
      .catch(setError);
  }, []);

  const saveResult = async (v: IrregularVerb, ok: boolean) => {
    const p = prog.get(v.id);
    const box = ok ? Math.min((p?.box ?? 0) + 1, BOX_DAYS.length - 1) : 0;
    const patch = { box, due_at: new Date(Date.now() + BOX_DAYS[box] * DAY).toISOString(), ok: (p?.ok ?? 0) + (ok ? 1 : 0), fail: (p?.fail ?? 0) + (ok ? 0 : 1) };
    const saved = p ? await items.update<VerbProgress>('verb_progress', p.id, patch) : await items.create<VerbProgress>('verb_progress', { verb: v.id, ...patch });
    setProg((m) => new Map(m).set(v.id, saved));
  };

  if (!verbs) return <>{error ? <ErrorBox error={error} /> : <Spinner />}</>;

  const due = verbs.filter((v) => { const p = prog.get(v.id); return p && p.due_at && Date.parse(p.due_at) <= Date.now(); });
  const mastered = verbs.filter((v) => (prog.get(v.id)?.box ?? 0) >= 3).length;

  if (lesson) return <VerbLesson list={lesson} onResult={saveResult} onExit={() => setLesson(null)} />;

  if (family) {
    const f = FAMILIES.find((x) => x.key === family)!;
    const list = verbs.filter((v) => v.family === family);
    return (
      <div className="stack">
        <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setFamily(null)}>← Familias</button>
        <h1>{f.name}</h1>
        <div className="card stack">
          <code style={{ fontSize: '1.1rem' }}>{f.pattern}</code>
          <p style={{ margin: 0 }}>{f.tip}</p>
        </div>
        <div className="verb-sequence-grid">{list.map((v) => <div className="verb-sequence-card card flat" key={v.id}><div className="spread"><b>{v.base}</b><SpeakBtn text={`${v.base}, ${v.past}, ${v.participle}`} natural /></div><div className="verb-forms"><span>{v.base}</span><i>→</i><span>{v.past}</span><i>→</i><span>{v.participle}</span></div><div className="small" style={{ color: 'var(--primary)', fontWeight: 800 }}>{v.es}</div>{v.mnemonic_es && <div className="trick-box plain small"><Rich text={v.mnemonic_es} /></div>}<div className="example small">{v.example_en}</div></div>)}</div>
        <div className="card flat small"><b>La secuencia:</b> primero mira y escucha cada familia, después tapa las formas y recupéralas con tus propias palabras.</div>
        <button className="btn big" onClick={() => setLesson(shuffle(list))}>🧠 Empezar sesión guiada ({list.length})</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>🔀 Verbos irregulares</h1>
      <p className="muted">No se aprenden como una tabla: se agrupan en <b>familias que suenan igual</b>. Así, en vez de 300 formas sueltas, memorizas unos pocos patrones y un puñado de rebeldes con historias.</p>
      <div className="card stack">
        <div className="spread"><b>Dominados</b><span>{mastered}/{verbs.length}</span></div>
        <ProgressBar value={mastered} max={verbs.length} />
        {due.length > 0 && <button className="btn" onClick={() => setLesson(shuffle(due))}>🔁 Repasar los pendientes ({due.length})</button>}
      </div>
      <div className="grid2">
        {FAMILIES.map((f) => {
          const list = verbs.filter((v) => v.family === f.key);
          const done = list.filter((v) => (prog.get(v.id)?.box ?? 0) >= 3).length;
          return (
            <button key={f.key} className="card link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setFamily(f.key)}>
              <div className="spread"><b>{f.name}</b><span className="chip">{done}/{list.length}</span></div>
              <code className="small">{f.pattern}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VerbLesson({ list, onResult, onExit }: { list: IrregularVerb[]; onResult: (v: IrregularVerb, ok: boolean) => Promise<void>; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<'learn' | 'recall'>('learn');
  const [revealed, setRevealed] = useState(false);
  const [past, setPast] = useState('');
  const [part, setPart] = useState('');
  const [res, setRes] = useState<{ past: boolean; part: boolean } | null>(null);
  const [okCount, setOkCount] = useState(0);
  const v = list[i];
  const total = useMemo(() => list.length, [list]);

  if (!v) return (
    <div className="card center stack"><div style={{ fontSize: '2.5rem' }}>🏁</div><b>{okCount}/{total} perfectos</b><button className="btn" onClick={onExit}>Volver</button></div>
  );

  const check = () => {
    const r = { past: checkAnswer(past, v.past).correct, part: checkAnswer(part, v.participle).correct };
    setRes(r);
    if (r.past && r.part) setOkCount((c) => c + 1);
    onResult(v, r.past && r.part).catch(() => {});
  };

  const next = () => { setI(i + 1); setStage('learn'); setRevealed(false); setPast(''); setPart(''); setRes(null); };

  if (stage === 'learn') return (
    <div className="stack verb-lesson">
      <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={onExit}>✕ Salir</button>
      <div className="spread"><div><span className="eyebrow">FASE 1 · ASOCIAR Y ESCUCHAR</span><h1>{v.base}</h1></div><span className="chip primary">{i + 1}/{total}</span></div>
      <ProgressBar value={i} max={total} />
      <div className="card verb-lesson-card stack"><div className="verb-meaning">{v.es}</div><div className="small muted">Familia: {FAMILIES.find((f) => f.key === v.family)?.name}</div><button className="btn big secondary" onClick={() => setRevealed(true)}>{revealed ? '✅ Formas visibles' : '👀 Ver y escuchar la secuencia'}</button>{revealed && <><div className="verb-forms large"><span>{v.base}</span><i>→</i><span>{v.past}</span><i>→</i><span>{v.participle}</span></div><div className="row"><SpeakBtn text={`${v.base}, ${v.past}, ${v.participle}`} title="Escuchar secuencia" natural /><span className="small muted">Escúchalo dos veces como una sola unidad.</span></div>{v.mnemonic_es && <div className="trick-box"><span className="lbl">Asociación</span><Rich text={v.mnemonic_es} /></div>}<div className="example"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{v.example_en}</b><SpeakBtn text={v.example_en} natural /></div><span className="small muted">Ahora observa la forma dentro de una frase real.</span></div><button className="btn" onClick={() => setStage('recall')}>Tapar y recuperarlo →</button></>}</div>
    </div>
  );

  return (
    <div className="stack">
      <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={onExit}>✕ Salir</button>
      <div className="spread"><div><span className="eyebrow">FASE 2 · RECUPERAR Y COMPROBAR</span><h1>{v.base}</h1></div><span className="chip primary">{i + 1}/{total}</span></div><ProgressBar value={i} max={total} />
      <div className="card stack">
        <div className="big-prompt">{v.base}<div className="small muted">{v.es}</div><SpeakBtn text={v.base} natural /></div>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!res) check(); else { setI(i + 1); setPast(''); setPart(''); setRes(null); } }}>
          <label className="field">Pasado
            <input type="text" className={`answer-input ${res ? (res.past ? 'ok' : 'fail') : ''}`} value={past} onChange={(e) => setPast(e.target.value)} readOnly={!!res} autoCapitalize="off" autoComplete="off" autoFocus />
          </label>
          <label className="field">Participio
            <input type="text" className={`answer-input ${res ? (res.part ? 'ok' : 'fail') : ''}`} value={part} onChange={(e) => setPart(e.target.value)} readOnly={!!res} autoCapitalize="off" autoComplete="off" />
          </label>
          {res && <div className={`feedback ${res.past && res.part ? 'ok' : 'fail'}`}>{res.past && res.part ? '✅ Recuperación sólida' : '🔁 Vuelve a mirar la asociación y repítelo mañana'}<br />{v.base} → {v.past} → {v.participle}</div>}
          {res && v.mnemonic_es && <div className="trick-box plain small"><Rich text={v.mnemonic_es} /></div>}
          {res ? <button type="button" className="btn big" onClick={next}>Siguiente →</button> : <button className="btn big">Comprobar</button>}
        </form>
      </div>
    </div>
  );
}
