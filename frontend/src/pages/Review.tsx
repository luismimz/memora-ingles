import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, shuffle, Spinner } from '../components/common';
import { QuizRunner, type AnswerMeta, type QuizItem, type QuizSummary } from '../components/QuizRunner';
import { afterReview, hoursSince, isDue, isLeech, STEP_LABEL } from '../lib/srs';
import { useStore } from '../store';
import type { Mode, Progress } from '../types';

const BATCH = 50;

/** Modo según el escalón: los checkpoints que medimos (+1h, +24h, +7d, +30d) siempre son de producción (escribir). */
function modeFor(p: Progress, flash: boolean): Mode {
  if (flash) return 'flash';
  if (p.step === 3) return 'cloze';
  if (p.step === 5) return 'listen_type';
  if (p.step >= 7) return 'cloze';
  return 'es_en_type';
}

export function Review() {
  const store = useStore();
  const [params] = useSearchParams();
  const rebels = params.get('rebeldes') === '1';
  const [phase, setPhase] = useState<'intro' | 'loading' | 'quiz' | 'done'>('intro');
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [batch, setBatch] = useState<QuizItem[]>([]);
  const pool = useMemo(() => store.words.slice(0, 600), [store.words]);

  const all = [...store.progress.values()];
  const due = all.filter((p) => isDue(p)).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  const leeches = all.filter((p) => p.status !== 'known' && isLeech(p)).sort((a, b) => b.lapses - a.lapses);
  const list = rebels ? leeches : due;
  const byStep = new Map<number, number>();
  for (const p of due) byStep.set(p.step, (byStep.get(p.step) ?? 0) + 1);
  const flash = store.profile?.answer_mode === 'flash';

  const start = async () => {
    setPhase('loading'); setError(null);
    try {
      const chosen = shuffle(list.slice(0, BATCH));
      await store.mnemonicsFor(chosen.map((p) => p.word));
      setBatch(chosen.flatMap((p) => {
        const w = store.wordById.get(p.word);
        return w ? [{ word: w, mode: rebels ? (['es_en_type', 'listen_type', 'cloze'] as Mode[])[Math.floor(Math.random() * 3)] : modeFor(p, flash) }] : [];
      }));
      setPhase('quiz');
    } catch (e) { setError(e); setPhase('intro'); }
  };

  const onAnswer = (item: QuizItem, result: 'ok' | 'doubt' | 'fail', ms: number, meta: AnswerMeta) => {
    const p = store.progress.get(item.word.id);
    if (!p) return;
    const base = { word: p.word, study_day: p.study_day, mode: item.mode, result, ms, hours_since_learned: hoursSince(p.learned_at), mnemonic: meta.mnemonic, hints: meta.hints };
    if (meta.retry || meta.rescue || rebels) {
      store.logAttempts([{ ...base, step: p.step, kind: meta.rescue ? 'rescue' : meta.retry ? 'retry' : 'practice' }]);
      return;
    }
    store.logAttempts([{ ...base, step: p.step, kind: 'review' }]);
    const next = afterReview(p, result, ms);
    store.saveProgress(p.word, { ...next, last_seen: new Date().toISOString() }).catch(setError);
  };

  if (phase === 'loading') return <Spinner />;

  if (phase === 'quiz') {
    return (
      <div className="stack">
        <Link to="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>✕ Salir</Link>
        <QuizRunner items={batch} pool={pool} onAnswer={onAnswer} onDone={(s) => { setSummary(s); setPhase('done'); }} />
        <ErrorBox error={error} />
      </div>
    );
  }

  if (phase === 'done' && summary) {
    const rate = summary.total ? (summary.ok + summary.doubt * 0.5) / summary.total : 0;
    const remaining = rebels ? 0 : [...store.progress.values()].filter((p) => isDue(p)).length;
    return (
      <div className="stack">
        <div className="card hero center stack">
          <div style={{ fontSize: '3rem' }}>{rate >= 0.85 ? '🧠' : rate >= 0.6 ? '💪' : '🌱'}</div>
          <h1 style={{ color: '#fff', margin: 0 }}>{Math.round(rate * 100)}% recordado</h1>
          <div>{summary.ok} ✅ · {summary.doubt} 🤔 · {summary.fail} ❌</div>
        </div>
        {summary.failedWords.length > 0 && (
          <div className="card stack">
            <b>Volverán mañana:</b>
            <div className="row">{summary.failedWords.map((w) => <span key={w.id} className="chip fail">{w.en}</span>)}</div>
          </div>
        )}
        <div className="row">
          <Link to="/" className="btn secondary grow">Volver a Hoy</Link>
          {remaining > 0 && <button className="btn grow" onClick={() => setPhase('intro')}>Seguir ({remaining})</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>{rebels ? '😈 Palabras rebeldes' : '🔁 Repaso'}</h1>
      {rebels ? (
        <p className="muted">Las que más fallas. Practicarlas aquí no cambia su calendario; lo mejor es que en «Palabras» inventes tu propia asociación.</p>
      ) : (
        <p className="muted">Pruebas sorpresa en el momento justo antes de que se olviden: +1 h, +24 h, +3 días, +7 días, +14 días y +30 días.</p>
      )}
      {list.length === 0 ? (
        <div className="card center stack">
          <div style={{ fontSize: '2.5rem' }}>✨</div>
          <b>{rebels ? 'No tienes palabras rebeldes. ¡Bien!' : 'Nada pendiente ahora mismo.'}</b>
          <NextDue progress={all} />
          <Link to="/" className="btn">Volver a Hoy</Link>
        </div>
      ) : (
        <>
          {!rebels && (
            <div className="card stack">
              {[...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([step, n]) => (
                <div key={step} className="spread"><span>{step === 2 ? '📅 ' : ''}Prueba {STEP_LABEL[step]}</span><b>{n}</b></div>
              ))}
            </div>
          )}
          <button className="btn big block" onClick={start}>Empezar ({Math.min(list.length, BATCH)}{list.length > BATCH ? ` de ${list.length}` : ''})</button>
        </>
      )}
      <ErrorBox error={error} />
      {!rebels && all.some((p) => p.status !== 'known' && isLeech(p)) && <Link to="/repaso?rebeldes=1" className="btn secondary">😈 Practicar las rebeldes</Link>}
    </div>
  );
}

function NextDue({ progress }: { progress: Progress[] }) {
  const next = progress.filter((p) => p.status !== 'known' && p.due_at).map((p) => Date.parse(p.due_at!)).sort((a, b) => a - b)[0];
  if (!next) return <div className="muted small">Aprende palabras en la sesión del día y aquí aparecerán sus pruebas.</div>;
  const mins = Math.max(0, Math.round((next - Date.now()) / 60000));
  const txt = mins < 60 ? `${mins} min` : mins < 60 * 24 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} días`;
  return <div className="muted small">Siguiente prueba dentro de {txt}.</div>;
}
