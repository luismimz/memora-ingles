import { useEffect, useState } from 'react';
import { KIND_LABEL } from '../../../shared/classify.mjs';
import { request, items } from '../lib/api';
import { BUCKETS, pct } from '../lib/stats';
import type { PilotReport } from '../types';
import { ErrorBox, Spinner } from './common';
import { soundBadge } from './ExposureCard';

type Cells = Record<string, { n: number; rate: number | null }>;
interface Row { key: string | number; cells: Cells; keyword?: string; source?: string; phon_score?: number | null; word?: string }
interface StatsRes { byMnemonic: Row[]; bySource: Row[]; byKind: Row[]; byPhonetic: Row[]; byHints: Row[] }

const SOURCE: Record<string, string> = { seed: '⭐ escrita a mano', ai: '🤖 IA', user: '✍️ tuya', 'sin mnemotecnia': '➖ sin truco' };

function rateStyle(r: number | null) {
  if (r === null) return {};
  if (r >= 0.85) return { background: 'var(--ok-soft)', color: 'var(--ok)' };
  if (r >= 0.6) return { background: 'var(--doubt-soft)', color: 'var(--doubt)' };
  return { background: 'var(--fail-soft)', color: 'var(--fail)' };
}

function Table({ rows, label }: { rows: Row[]; label: (r: Row) => React.ReactNode }) {
  if (!rows.length) return <p className="small muted">Aún sin datos.</p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th></th>{BUCKETS.map((b) => <th key={b.key}>{b.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.key)}>
              <td>{label(r)}</td>
              {BUCKETS.map((b) => {
                const c = r.cells[b.key];
                return <td key={b.key}>{c?.rate == null ? <span className="muted">—</span> : <span className="cell-rate" style={rateStyle(c.rate)} title={`${c.n} palabras`}>{pct(c.rate)}<small> ·{c.n}</small></span>}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ¿Qué tipo de truco retiene mejor? Datos de todos los alumnos (las asociaciones privadas de otros no se muestran). */
export function AssociationStats() {
  const [data, setData] = useState<StatsRes | null>(null);
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    request<StatsRes>('GET', '/memora/mnemonic-stats').then(setData).catch(setError);
    items.list<PilotReport>('pilot_reports', { sort: '-created_at' }).then(setReports).catch(() => {});
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  const byM = [...data.byMnemonic].sort((a, b) => (b.cells.exam?.n ?? 0) - (a.cells.exam?.n ?? 0));

  return (
    <div className="stack">
      {reports[0] && <PilotSummary report={reports[0]} />}
      <div className="card stack">
        <h2 style={{ margin: 0 }}>🧠 ¿Qué trucos funcionan?</h2>
        <p className="small muted" style={{ margin: 0 }}>Recuerdo en el primer intento de cada ventana, según el origen del truco. «Sin truco» es tu grupo de control natural.</p>
        <Table rows={data.bySource} label={(r) => SOURCE[String(r.key)] ?? String(r.key)} />
      </div>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>🔊 Según lo bien que suena la palabra puente</h3>
        <Table rows={data.byPhonetic} label={(r) => String(r.key)} />
      </div>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>🏷️ Según el tipo de palabra</h3>
        <Table rows={data.byKind} label={(r) => KIND_LABEL[r.key as keyof typeof KIND_LABEL] ?? String(r.key)} />
      </div>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>💡 Con o sin pistas en el examen</h3>
        <Table rows={data.byHints} label={(r) => String(r.key)} />
      </div>
      <div className="card stack">
        <div className="spread"><h3 style={{ margin: 0 }}>📋 Cada asociación</h3><button className="btn ghost small" onClick={() => setAll(!all)}>{all ? 'Ver menos' : `Ver todas (${byM.length})`}</button></div>
        <Table rows={all ? byM : byM.slice(0, 12)} label={(r) => <span className="small"><b>{r.word}</b> → {r.keyword} {soundBadge(r.phon_score)}</span>} />
      </div>
    </div>
  );
}

function PilotSummary({ report }: { report: PilotReport }) {
  const d = report.data as { avg_expose_s?: number; recall?: number; learn_min?: number; hinted?: number };
  return (
    <div className="card stack" style={{ borderColor: 'var(--accent)' }}>
      <h2 style={{ margin: 0 }}>🧪 Tu prueba piloto</h2>
      <div className="stats-row">
        <div className="stat"><div className="v">{d.avg_expose_s ?? '—'} s</div><div className="l">por palabra</div></div>
        <div className="stat"><div className="v">{d.recall != null ? `${Math.round(d.recall * 100)}%` : '—'}</div><div className="l">recuerdo inmediato</div></div>
        <div className="stat"><div className="v">{d.learn_min ?? '—'} min</div><div className="l">aprendiendo</div></div>
      </div>
      <div className="small muted">Tu valoración: {Object.entries(report.ratings).map(([k, v]) => `${k} ${v}/5`).join(' · ')}</div>
      {report.comment && <div className="small">💬 {report.comment}</div>}
    </div>
  );
}
