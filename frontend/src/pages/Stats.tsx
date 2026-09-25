import { useEffect, useMemo, useState } from 'react';
import { AssociationStats } from '../components/AssociationStats';
import { ErrorBox, fmtTime, Spinner } from '../components/common';
import { items } from '../lib/api';
import { isLeech } from '../lib/srs';
import { BUCKETS, localDate, overallCurve, pct, retentionTable, streak } from '../lib/stats';
import { useStore } from '../store';
import type { Attempt } from '../types';

function rateColor(r: number | null) {
  if (r === null) return {};
  if (r >= 0.85) return { background: 'var(--ok-soft)', color: 'var(--ok)' };
  if (r >= 0.6) return { background: 'var(--doubt-soft)', color: 'var(--doubt)' };
  return { background: 'var(--fail-soft)', color: 'var(--fail)' };
}

export function Stats() {
  const { progress, days, wordById } = useStore();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tab, setTab] = useState<'me' | 'assoc'>('me');

  useEffect(() => {
    items.list<Attempt>('attempts', { fields: 'word,study_day,step,kind,mode,result,ms,hours_since_learned,created_at', filter: { kind: { _in: ['exam', 'review'] } }, sort: 'created_at' })
      .then(setAttempts).catch(setError);
  }, []);

  const all = [...progress.values()];
  const learnedPerDay = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of progress.values()) if (p.status !== 'known' && p.study_day) m.set(p.study_day, (m.get(p.study_day) ?? 0) + 1);
    return m;
  }, [progress]);
  const rows = useMemo(() => (attempts ? retentionTable(attempts, learnedPerDay) : []), [attempts, learnedPerDay]);
  const curve = useMemo(() => overallCurve(rows), [rows]);

  const learned = all.filter((p) => p.status !== 'known');
  const counts = {
    learned: learned.length,
    known: all.filter((p) => p.status === 'known').length,
    learning: all.filter((p) => p.status === 'learning').length,
    review: all.filter((p) => p.status === 'review').length,
    mastered: all.filter((p) => p.status === 'mastered').length,
  };
  const totalSecs = days.reduce((s, d) => s + (d.seconds ?? 0), 0);
  const racha = streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate());
  const hardest = learned
    .filter((p) => p.fail > 0 || p.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || b.fail - a.fail || (b.avg_ms ?? 0) - (a.avg_ms ?? 0))
    .slice(0, 15);
  const slowest = learned.filter((p) => (p.avg_ms ?? 0) > 4000 && p.fail === 0).sort((a, b) => (b.avg_ms ?? 0) - (a.avg_ms ?? 0)).slice(0, 8);
  const maxDay = Math.max(30, ...days.map((d) => d.day));

  const exportCsv = () => {
    const head = ['dia', 'nuevas', ...BUCKETS.map((b) => `${b.label} %`), ...BUCKETS.map((b) => `${b.label} n`)];
    const lines = rows.map((r) => [r.day, r.learned, ...BUCKETS.map((b) => (r.cells[b.key].rate === null ? '' : Math.round(r.cells[b.key].rate! * 100))), ...BUCKETS.map((b) => r.cells[b.key].n)].join(','));
    const words = learned.map((p) => { const w = wordById.get(p.word); return [w?.en, w?.es?.replace(/,/g, ';'), p.study_day, p.status, p.step, p.ok, p.doubt, p.fail, p.lapses, p.avg_ms].join(','); });
    const csv = [head.join(','), ...lines, '', 'palabra,traduccion,dia,estado,escalon,aciertos,dudas,fallos,lapsos,ms_medio', ...words].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `memora-progreso-${localDate()}.csv`;
    a.click();
  };

  return (
    <div className="stack">
      <h1>📈 Tu progreso</h1>
      <div className="row">
        <button className={`btn small ${tab === 'me' ? '' : 'secondary'}`} onClick={() => setTab('me')}>📅 Mi progreso</button>
        <button className={`btn small ${tab === 'assoc' ? '' : 'secondary'}`} onClick={() => setTab('assoc')}>🧠 Asociaciones</button>
      </div>
      {tab === 'assoc' ? <AssociationStats /> : <>
      <div className="stats-row">
        <div className="stat"><div className="v">{counts.learned}</div><div className="l">estudiadas</div></div>
        <div className="stat"><div className="v">{counts.mastered}</div><div className="l">dominadas</div></div>
        <div className="stat"><div className="v">{counts.review}</div><div className="l">consolidándose</div></div>
        <div className="stat"><div className="v">{counts.known}</div><div className="l">ya sabías</div></div>
        <div className="stat"><div className="v">🔥 {racha}</div><div className="l">racha</div></div>
        <div className="stat"><div className="v">{fmtTime(totalSecs).split(':')[0]}′</div><div className="l">minutos</div></div>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>🧪 ¿Se quedan en la memoria?</h2>
        <p className="small muted" style={{ margin: 0 }}>Porcentaje recordado en el <b>primer intento</b> de cada prueba. Dudada = medio punto. Esta es la prueba real del método.</p>
        {attempts === null ? <Spinner /> : (
          <div className="bar-chart">
            {BUCKETS.map((b) => (
              <div key={b.key} className="b">
                <span className="val">{pct(curve[b.key].rate)}</span>
                <div className="fill" style={{ height: `${(curve[b.key].rate ?? 0) * 100}%`, opacity: curve[b.key].rate === null ? 0.2 : 1 }} />
                <span className="lab">{b.label}<br />{curve[b.key].n ? `n=${curve[b.key].n}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="spread"><h2 style={{ margin: 0 }}>📅 Día a día</h2><button className="btn small secondary" onClick={exportCsv} disabled={!attempts}>⬇️ CSV</button></div>
        {rows.length === 0 ? <p className="muted small">Completa tu primera sesión para ver la tabla.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Día</th><th>Nuevas</th>{BUCKETS.map((b) => <th key={b.key}>{b.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day}>
                    <td><b>{r.day}</b></td>
                    <td>{r.learned}</td>
                    {BUCKETS.map((b) => {
                      const c = r.cells[b.key];
                      return <td key={b.key}>{c.rate === null ? <span className="muted">—</span> : <span className="cell-rate" style={rateColor(c.rate)} title={`${c.n} palabras`}>{pct(c.rate)}</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>🗓️ Los 30 días</h2>
        <div className="calendar">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => {
            const d = days.find((x) => x.day === n);
            const learnedN = learnedPerDay.get(n) ?? 0;
            const examRate = d && d.exam_total ? d.exam_ok / d.exam_total : null;
            const style = d ? (learnedN >= (d.goal || 100) ? { background: 'var(--primary)', color: '#fff' } : learnedN > 0 ? { background: 'var(--primary-soft)', color: 'var(--primary)' } : {}) : {};
            return (
              <div key={n} className={`d ${d?.date === localDate() ? 'today' : ''}`} style={style} title={d ? `${d.date}: ${learnedN} palabras, examen ${pct(examRate)}` : ''}>
                {n}<small>{learnedN || ''}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid2">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>😈 Las que más cuestan</h3>
          {hardest.length === 0 ? <p className="muted small">Ninguna todavía.</p> : hardest.map((p) => {
            const w = wordById.get(p.word);
            return <div key={p.id} className="spread small"><span><b>{w?.en}</b> <span className="muted">{w?.es}</span></span><span className={`chip ${isLeech(p) ? 'fail' : 'doubt'}`}>{p.fail}✗ {p.lapses}↩</span></div>;
          })}
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>🐢 Aciertas, pero tardas</h3>
          <p className="small muted" style={{ margin: 0 }}>Aún necesitas la imagen para recordarlas: úsalas en frases.</p>
          {slowest.length === 0 ? <p className="muted small">—</p> : slowest.map((p) => {
            const w = wordById.get(p.word);
            return <div key={p.id} className="spread small"><span><b>{w?.en}</b> <span className="muted">{w?.es}</span></span><span className="chip">{((p.avg_ms ?? 0) / 1000).toFixed(1)} s</span></div>;
          })}
        </div>
      </div>
      </>}
      <ErrorBox error={error} />
    </div>
  );
}
