import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KIND_LABEL } from '../../../shared/classify.mjs';
import { ErrorBox, fmtTime, playNaturalFast, ProgressBar, Rich, shuffle, SpeakBtn, Spinner, toast } from '../components/common';
import { ExposureCard, soundBadge, type MnemonicChoice } from '../components/ExposureCard';
import { QuizRunner, type AnswerMeta, type QuizItem, type QuizSummary } from '../components/QuizRunner';
import { palaceFor } from '../data/palaces';
import { ai, items } from '../lib/api';
import { afterExam } from '../lib/srs';
import { useStore } from '../store';
import type { PilotReport, Result, StudyDay, Word } from '../types';

type Phase = 'setup' | 'filter' | 'preparing' | 'learn' | 'room' | 'recall' | 'exam' | 'result';
const SIZES = [10, 25, 50, 100];
const POMODORO = 25 * 60;
const RECENT_ROUNDS_KEY = 'memora.association-recent-words';

interface WordLog { exposeMs: number; choice?: MnemonicChoice; action?: string; exam?: { result: Result; ms: number; hints: number }; rescues: number }

export function Session() {
  const store = useStore();
  const { profile, words, progress, today, currentDay } = store;
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStarted = useRef(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [size, setSize] = useState(profile?.round_size ?? 10);
  const [pilot, setPilot] = useState(false);
  const [pilotDone, setPilotDone] = useState<boolean | null>(null);
  const [day, setDay] = useState<StudyDay | null>(today);
  const [selected, setSelected] = useState<Word[]>([]);
  const [knownNow, setKnownNow] = useState(0);
  const [roomIdx, setRoomIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [, tick] = useState(0);
  const sessionStart = useRef(Date.now());
  const learnStart = useRef(0);
  const examStart = useRef(0);
  const logs = useRef(new Map<number, WordLog>());
  const log = (id: number) => { if (!logs.current.has(id)) logs.current.set(id, { exposeMs: 0, rescues: 0 }); return logs.current.get(id)!; };

  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { items.list<PilotReport>('pilot_reports', { fields: 'id', limit: 1 }).then((r) => setPilotDone(r.length > 0)).catch(() => setPilotDone(false)); }, []);

  const pilotWords = useMemo(() => words.filter((w) => w.pilot).sort((a, b) => (a.pilot ?? 0) - (b.pilot ?? 0)), [words]);
  const palace = palaceFor(day?.day ?? currentDay);
  const learnedToday = [...progress.values()].filter((p) => day && p.study_day === day.day && p.status !== 'known').length;
  const goal = profile?.daily_goal ?? 100;
  const elapsed = (day?.seconds ?? 0) + (phase !== 'setup' && phase !== 'result' ? (Date.now() - sessionStart.current) / 1000 : 0);
  const rooms = useMemo(() => chunk(selected, 10), [selected]);
  const roomOffset = Math.floor(learnedToday / 10);
  const examItems = useMemo<QuizItem[]>(() => {
    const mode = profile?.answer_mode === 'flash' ? 'flash' : 'es_en_type';
    return shuffle(selected).map((w) => ({ word: w, mode }));
  }, [selected, profile?.answer_mode]);
  const pool = useMemo(() => words.slice(0, 600), [words]);

  const nextUnseenWords = (count: number) => {
    const available = words.filter((w) => !progress.has(w.id));
    if (!available.length) return [];
    let recent: number[] = [];
    try { recent = JSON.parse(localStorage.getItem(RECENT_ROUNDS_KEY) || '[]'); } catch { /* almacenamiento opcional */ }
    const recentSet = new Set(recent);
    let candidates = available.filter((w) => !recentSet.has(w.id));
    if (candidates.length < Math.min(count, available.length)) candidates = available;
    const list = candidates.slice(0, count);
    try {
      const keep = Math.min(200, Math.max(20, available.length - count));
      localStorage.setItem(RECENT_ROUNDS_KEY, JSON.stringify([...recent, ...list.map((w) => w.id)].slice(-keep)));
    } catch { /* almacenamiento opcional */ }
    return list;
  };

  const start = async (asPilot = false, direct = false) => {
    setError(null);
    try {
      const d = await store.startToday();
      setDay(d);
      setPilot(asPilot);
      sessionStart.current = Date.now();
      logs.current = new Map();
      setSelected([]); setKnownNow(0); setRoomIdx(0); setWordIdx(0);
      if (asPilot) await prepare(pilotWords);
      else if (direct) await prepare(nextUnseenWords(size));
      else setPhase('filter');
      if (!asPilot && size !== profile?.round_size) store.updateProfile({ round_size: size }).catch(() => {});
    } catch (e) { setError(e); }
  };

  useEffect(() => {
    if (searchParams.get('autostart') !== '1' || autoStarted.current || phase !== 'setup' || !words.length) return;
    autoStarted.current = true;
    void start(false, true);
  }, [searchParams, phase, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const prepare = async (list: Word[]) => {
    if (!list.length) { setError(new Error('No quedan palabras nuevas en la lista.')); setPhase('setup'); return; }
    setSelected(list);
    setPhase('preparing');
    try { await store.mnemonicsFor(list.map((w) => w.id), { fill: true }); } catch (e) { setError(e); }
    learnStart.current = Date.now();
    setPhase('learn');
  };

  const saveDaySeconds = async (extra: Partial<StudyDay> = {}) => {
    if (!day) return;
    const secs = Math.round((Date.now() - sessionStart.current) / 1000);
    sessionStart.current = Date.now();
    const fresh = store.days.find((d) => d.id === day.id) ?? day;
    const patch = { seconds: (fresh.seconds ?? 0) + secs, ...extra };
    await store.updateDay(day.id, patch);
    setDay({ ...fresh, ...patch });
  };

  const onExamDone = async (s: QuizSummary) => {
    setSummary(s);
    setPhase('result');
    const now = Date.now();
    try {
      await Promise.all(selected.map((w) => {
        const l = log(w.id);
        const r = l.exam ?? { result: 'fail' as Result, ms: 0 };
        const mode = l.choice?.mode ?? store.progress.get(w.id)?.mnemonic_mode ?? 'auto';
        const mnemonic = mode === 'none' ? null : (l.choice?.mnemonic?.id ?? store.activeMnemonic(w.id)?.id ?? null);
        return store.saveProgress(w.id, { ...afterExam(r.result, r.ms, now), study_day: day!.day, mnemonic, mnemonic_mode: mode, last_seen: new Date(now).toISOString() });
      }));
      const fresh = store.days.find((d) => d.id === day!.id) ?? day!;
      await saveDaySeconds({
        learned: (fresh.learned ?? 0) + selected.length,
        known: (fresh.known ?? 0) + knownNow,
        exam_ok: (fresh.exam_ok ?? 0) + s.ok + s.doubt,
        exam_total: (fresh.exam_total ?? 0) + s.total,
        finished_at: new Date().toISOString(),
      });
      scheduleSurprise();
    } catch (e) { setError(e); }
  };

  // ---------- Pantallas ----------
  if (phase === 'setup') {
    return (
      <div className="stack association-start">
        <Link to="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>← Inicio</Link>
        <section className="association-start-card">
          <span className="eyebrow light">DÍA {day?.day ?? currentDay} · RONDA RECOMENDADA</span>
          <div className="association-start-icon">🧠</div>
          <h1>Diez palabras. Diez conexiones.</h1>
          <p>No tienes que configurar nada: primero crearás la imagen mental, después usarás cada palabra y al final la recuperarás sin mirar.</p>
          <div className="session-plan"><span>🧠 Asociación</span><i>→</i><span>💬 Frase</span><i>→</i><span>⚡ Recuerdo</span></div>
          <button className="btn big association-start-action" onClick={() => start(false, true)}>Empezar 10 asociaciones →</button>
        </section>

        <div className="card stack compact-progress">
          <div className="spread"><b>Hoy</b><span>{learnedToday} / {goal}</span></div>
          <ProgressBar value={learnedToday} max={goal} />
          <span className="small muted">{palace.emoji} Tus escenas se guardarán en {palace.name}.</span>
        </div>

        <details className="card round-options">
          <summary>Opciones de la ronda</summary>
          <div className="stack small">
            <span>Palabras por ronda</span>
            <div className="row">{SIZES.map((n) => <button key={n} className={`btn small ${size === n ? '' : 'secondary'} grow`} onClick={() => setSize(n)}>{n}</button>)}</div>
            <button className="btn secondary" onClick={() => start(false, false)}>Filtrar primero las que ya conozco</button>
            {pilotWords.length > 0 && pilotDone === false && <button className="btn ghost" onClick={() => start(true)}>Abrir prueba piloto</button>}
          </div>
        </details>
        <ErrorBox error={error} />
      </div>
    );
  }

  if (phase === 'filter') return <Filter size={size} day={day!} onKnown={() => setKnownNow((k) => k + 1)} onDone={prepare} />;
  if (phase === 'preparing') return <div className="stack center preparing-memory" style={{ paddingTop: '20vh' }}><Spinner /><h2>Preparando tus conexiones…</h2><p className="muted">Cada palabra entrará con una asociación, una frase y su audio natural.</p></div>;

  const Header = (
    <div className="spread">
      <button className="btn ghost" onClick={() => { if (confirm('¿Salir de la sesión? Perderás esta ronda.')) nav('/'); }}>✕</button>
      {pilot && <span className="chip accent">🧪 Piloto</span>}
      <div className="session-stepper" aria-label="Progreso de la sesión"><span className={phase === 'learn' ? 'active' : ''}>🧠 Asociar</span><i>→</i><span className={phase === 'room' || phase === 'recall' ? 'active' : ''}>🧩 Ordenar</span><i>→</i><span className={phase === 'exam' || phase === 'result' ? 'active' : ''}>✍️ Producir</span></div>
      <span className={`timer chip ${elapsed > POMODORO ? 'fail' : 'primary'}`}>⏱️ {elapsed > POMODORO ? `+${fmtTime(elapsed - POMODORO)}` : fmtTime(POMODORO - elapsed)}</span>
    </div>
  );

  if (phase === 'learn') {
    const room = rooms[roomIdx];
    const w = room[wordIdx];
    const spot = palace.spots[(roomOffset + roomIdx) % palace.spots.length];
    const n = roomIdx * 10 + wordIdx + 1;
    return (
      <div className="stack">
        {Header}
        <div className="spread small muted"><span>Habitación {roomIdx + 1}/{rooms.length} · {spot}</span><span>{n}/{selected.length}</span></div>
        <ProgressBar value={n - 1} max={selected.length} />
        <ExposureCard key={w.id} word={w} spot={`${palace.name} · ${spot}`} autoSpeak={Boolean(profile?.auto_speak)}
          choice={logs.current.get(w.id)?.choice}
          onChoice={(c) => { const l = log(w.id); l.choice = c; l.action = c.mode === 'none' ? 'none' : 'changed'; tick((x) => x + 1); }}
          onDone={(ms) => {
            const l = log(w.id);
            l.exposeMs += Math.min(ms, 120_000);
            store.logAttempts([{ word: w.id, study_day: day!.day, step: null, kind: 'expose', mode: 'learn', result: 'ok', ms: Math.min(ms, 120_000), hours_since_learned: null, mnemonic: l.choice ? l.choice.mnemonic?.id ?? null : store.activeMnemonic(w.id)?.id ?? null }]);
            if (wordIdx + 1 < room.length) setWordIdx(wordIdx + 1); else setPhase('room');
          }} />
        {wordIdx > 0 && <button className="btn ghost" onClick={() => setWordIdx(wordIdx - 1)}>← Volver a la anterior</button>}
      </div>
    );
  }

  if (phase === 'room' || phase === 'recall') {
    const room = rooms[roomIdx];
    const spot = palace.spots[(roomOffset + roomIdx) % palace.spots.length];
    const last = roomIdx + 1 >= rooms.length;
    const ms = room.reduce((s, w) => s + (logs.current.get(w.id)?.exposeMs ?? 0), 0);
    const next = () => { if (last) { examStart.current = Date.now(); setPhase('exam'); } else { setRoomIdx(roomIdx + 1); setWordIdx(0); setPhase('learn'); } };
    if (phase === 'recall') {
      return <div className="stack">{Header}<RoomRecall words={room} spot={`${palace.emoji} ${palace.name} · ${spot}`} day={day!} roomKey={`${roomOffset + roomIdx + 1}`} onNext={next} last={last} /></div>;
    }
    return (
      <div className="stack">
        {Header}
        <div className="card center stack">
          <div style={{ fontSize: '2.4rem' }}>🚪</div>
          <h2 style={{ margin: 0 }}>Habitación {roomIdx + 1} completada</h2>
          <div className="muted">{room.length} palabras en {fmtTime(ms / 1000)} · <b>{Math.round(ms / 1000 / room.length)} s por palabra</b></div>
          <div className="small muted">A este ritmo, 100 palabras ≈ {Math.round((ms / room.length) * 100 / 60000)} min</div>
        </div>
        <button className="btn big block" onClick={next}>{last ? '📝 Al examen' : 'Siguiente habitación →'}</button>
        <button className="btn ghost" onClick={() => setPhase('recall')}>🔁 Repasar esta habitación (opcional)</button>
      </div>
    );
  }

  if (phase === 'exam') {
    return (
      <div className="stack">
        {Header}
        <div className="card flat center small"><b>📝 Examen.</b> Escribe cada palabra en inglés. Puedes pedir pistas 💡: aciertas igual, pero cuenta como «con ayuda».</div>
        <QuizRunner items={examItems} pool={pool} title="Examen de la ronda"
          onAnswer={(item, result, ms, meta: AnswerMeta) => {
            const l = log(item.word.id);
            if (meta.rescue) l.rescues++;
            else if (!meta.retry) l.exam = { result, ms, hints: meta.hints };
            store.logAttempts([{
              word: item.word.id, study_day: day!.day, step: 0, kind: meta.rescue ? 'rescue' : meta.retry ? 'retry' : 'exam',
              mode: item.mode, result, ms, hours_since_learned: 0, mnemonic: meta.mnemonic, hints: meta.hints,
            }]);
          }}
          onDone={onExamDone} />
      </div>
    );
  }

  // ---------- Resultado ----------
  const s = summary!;
  const rate = s.total ? (s.ok + s.doubt * 0.5) / s.total : 0;
  const nextSize = rate >= 0.9 ? SIZES[Math.min(SIZES.indexOf(size) + 1, SIZES.length - 1)] : rate < 0.7 ? SIZES[Math.max(SIZES.indexOf(size) - 1, 0)] : size;
  if (pilot) {
    return <PilotResult words={selected} logs={logs.current} summary={s} learnMs={examStart.current - learnStart.current}
      onSaved={() => setPilotDone(true)} error={error} />;
  }
  return (
    <div className="stack">
      <div className="card hero center stack">
        <div style={{ fontSize: '3rem' }}>{rate >= 0.9 ? '🏆' : rate >= 0.7 ? '💪' : '🌱'}</div>
        <h1 style={{ color: '#fff', margin: 0 }}>{Math.round(rate * 100)}%</h1>
        <div>{s.ok} ✅ · {s.doubt} 🤔 · {s.fail} ❌ de {s.total}{s.hinted ? ` · ${s.hinted} con pistas` : ''}</div>
        <div className="muted small">Hoy: {learnedToday} / {goal} palabras · {fmtTime(day?.seconds ?? 0)} de estudio</div>
      </div>
      <div className="card stack">
        <b>{rate >= 0.9 ? `¡Brutal! Sube a ${nextSize}.` : rate >= 0.7 ? 'Bien. Mantén el tamaño.' : `Baja a ${nextSize} y mira bien cada escena unos segundos más.`}</b>
        <p className="small muted" style={{ margin: 0 }}>⏰ En <b>1 hora</b>, prueba sorpresa de estas palabras en «Repaso». Mañana, otra.</p>
      </div>
      <ErrorBox error={error} />
      <div className="row">
        <Link to="/" className="btn secondary grow">Terminar por hoy</Link>
        {learnedToday < goal && <button className="btn grow" onClick={() => { setSize(nextSize); setPhase('setup'); }}>Otra ronda de {nextSize} →</button>}
      </div>
    </div>
  );
}

/** Informe de la prueba piloto + cuestionario. Se guarda en pilot_reports. */
function PilotResult({ words, logs, summary, learnMs, onSaved, error }: {
  words: Word[]; logs: Map<number, WordLog>; summary: QuizSummary; learnMs: number; onSaved: () => void; error: unknown;
}) {
  const store = useStore();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<unknown>(null);
  const rows = words.map((w) => {
    const l = logs.get(w.id) ?? { exposeMs: 0, rescues: 0 };
    const m = l.choice ? l.choice.mnemonic : store.activeMnemonic(w.id);
    return { w, l, m };
  });
  const avgS = rows.reduce((a, r) => a + r.l.exposeMs / 1000, 0) / Math.max(rows.length, 1);
  const recall = summary.total ? (summary.ok + summary.doubt * 0.5) / summary.total : 0;
  const byKind = new Map<string, { n: number; ok: number; s: number }>();
  for (const { w, l } of rows) {
    const k = w.kind ?? 'keyword';
    const agg = byKind.get(k) ?? { n: 0, ok: 0, s: 0 };
    agg.n++; agg.s += l.exposeMs / 1000; agg.ok += l.exam?.result === 'ok' ? 1 : l.exam?.result === 'doubt' ? 0.5 : 0;
    byKind.set(k, agg);
  }
  const QUESTIONS: [string, string][] = [
    ['sentido', '¿Las asociaciones tenían sentido para ti?'],
    ['ritmo', '¿10-15 s por palabra te parece un buen ritmo?'],
    ['confianza', '¿Confías en recordarlas mañana?'],
    ['separacion', '¿Queda claro qué es pronunciación real y qué es truco?'],
    ['diversion', '¿Te ha resultado ameno?'],
  ];

  const save = async () => {
    setSaveErr(null);
    try {
      await items.create('pilot_reports', {
        data: {
          words: rows.map(({ w, l, m }) => ({ en: w.en, kind: w.kind, expose_s: Math.round(l.exposeMs / 100) / 10, exam: l.exam ?? null, rescues: l.rescues, keyword: m?.keyword ?? null, phon_score: m?.phon_score ?? null, action: l.action ?? null })),
          avg_expose_s: Math.round(avgS * 10) / 10, learn_min: Math.round(learnMs / 6000) / 10, recall: Math.round(recall * 100) / 100,
          ok: summary.ok, doubt: summary.doubt, fail: summary.fail, hinted: summary.hinted,
          by_kind: Object.fromEntries(byKind),
        },
        ratings, comment,
      });
      setSaved(true); onSaved(); toast('🧪 ¡Gracias! Informe guardado');
    } catch (e) { setSaveErr(e); }
  };

  return (
    <div className="stack">
      <div className="card hero center stack">
        <div style={{ fontSize: '2.6rem' }}>🧪</div>
        <h1 style={{ color: '#fff', margin: 0 }}>Resultado de la prueba</h1>
        <div className="stats-row" style={{ color: 'var(--text)' }}>
          <div className="stat"><div className="v">{Math.round(avgS)} s</div><div className="l">por palabra (objetivo 10-15)</div></div>
          <div className="stat"><div className="v">{Math.round(recall * 100)}%</div><div className="l">recuerdo inmediato</div></div>
          <div className="stat"><div className="v">{Math.max(1, Math.round(learnMs / 60000))} min</div><div className="l">aprendiendo {words.length} palabras</div></div>
          <div className="stat"><div className="v">{Math.round((avgS * 100) / 60)} min</div><div className="l">proyección para 100</div></div>
        </div>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Por tipo de palabra</h3>
        {[...byKind.entries()].map(([k, a]) => (
          <div key={k} className="spread small"><span>{KIND_LABEL[k as keyof typeof KIND_LABEL] ?? k} ({a.n})</span><span>{Math.round(a.s / a.n)} s · {Math.round((a.ok / a.n) * 100)}% recordado</span></div>
        ))}
      </div>

      <div className="card table-wrap" style={{ padding: '8px 12px' }}>
        <table className="data">
          <thead><tr><th>Palabra</th><th>Tipo</th><th>Truco</th><th>Tiempo</th><th>Examen</th></tr></thead>
          <tbody>
            {rows.map(({ w, l, m }) => (
              <tr key={w.id}>
                <td><b>{w.en}</b></td>
                <td className="small">{KIND_LABEL[w.kind ?? 'keyword']}</td>
                <td className="small">{m ? <>{m.keyword} {soundBadge(m.phon_score)}</> : l.action === 'none' ? 'sin truco (elegido)' : '—'}{l.action === 'changed' && ' ✍️'}</td>
                <td>{Math.round(l.exposeMs / 1000)} s</td>
                <td>{l.exam ? (l.exam.result === 'ok' ? '✅' : l.exam.result === 'doubt' ? (l.exam.hints ? '💡' : '🤔') : '❌') : '—'}{l.rescues ? ` 🛟${l.rescues}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!saved ? (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Tu opinión (1 = nada, 5 = mucho)</h3>
          {QUESTIONS.map(([k, q]) => (
            <div key={k} className="stack" style={{ gap: '.3rem' }}>
              <span className="small"><b>{q}</b></span>
              <div className="row">{[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`btn small ${ratings[k] === n ? '' : 'secondary'}`} onClick={() => setRatings((r) => ({ ...r, [k]: n }))}>{n}</button>
              ))}</div>
            </div>
          ))}
          <label className="field">¿Qué cambiarías? ¿Qué asociación no te encajó y por qué?
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <ErrorBox error={saveErr ?? error} />
          <button className="btn big" disabled={Object.keys(ratings).length < QUESTIONS.length} onClick={save}>Guardar informe</button>
        </div>
      ) : (
        <div className="card stack">
          <b>✅ Informe guardado.</b>
          <p className="small muted" style={{ margin: 0 }}>Lo importante viene ahora: la prueba sorpresa de estas palabras a <b>+1 h</b> y <b>+24 h</b> dirá si se quedan. Míralo en «Progreso → Asociaciones».</p>
          <Link to="/" className="btn">Volver a Hoy</Link>
        </div>
      )}
    </div>
  );
}

/** Filtro rápido: descarta las palabras que ya conoces. */
function Filter({ size, day, onKnown, onDone }: { size: number; day: StudyDay; onKnown: () => void; onDone: (w: Word[]) => void }) {
  const store = useStore();
  const candidates = useMemo(() => store.words.filter((w) => !store.progress.has(w.id)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Word[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const finished = useRef(false);
  const w = candidates[i];
  const finish = (list: Word[]) => { if (!finished.current) { finished.current = true; onDone(list); } };

  useEffect(() => { if (w && store.profile?.auto_speak) playNaturalFast(w.en); }, [w, store.profile?.auto_speak]);
  useEffect(() => { if (picked.length >= size || (!w && i > 0)) finish(picked); }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!w) return <div className="card center">No quedan palabras nuevas. <button className="btn" onClick={() => finish(picked)}>Continuar con {picked.length}</button></div>;

  const unknown = () => { setPicked((p) => [...p, w]); setConfirming(false); setI(i + 1); };
  const known = () => {
    store.saveProgress(w.id, { status: 'known', study_day: day.day, step: 0, reps: 0, lapses: 0, ok: 0, doubt: 0, fail: 0 }).catch(() => {});
    store.logAttempts([{ word: w.id, study_day: day.day, step: null, kind: 'practice', mode: 'filter', result: 'ok', ms: 0, hours_since_learned: null }]);
    onKnown(); setKnownCount((k) => k + 1); setConfirming(false); setI(i + 1);
  };

  return (
    <div className="stack">
      <div className="spread">
        <span className="chip primary">🔎 ¿La conoces?</span>
        <span className="small muted">Para aprender: {picked.length}/{size} · Ya sabías: {knownCount}</span>
      </div>
      <ProgressBar value={picked.length} max={size} />
      <div className="card word-card pop" key={w.id}>
        <div className="en">{w.en}</div>
        <div className="row" style={{ justifyContent: 'center' }}><SpeakBtn text={w.en} /></div>
        {confirming && <div className="es" style={{ marginTop: '.75rem' }}>¿Significa «{w.es}»?</div>}
      </div>
      {!confirming ? (
        <div className="row">
          <button className="btn fail big grow" onClick={unknown}>✗ No / dudo</button>
          <button className="btn ok big grow" onClick={() => setConfirming(true)}>✓ La sé</button>
        </div>
      ) : (
        <div className="row">
          <button className="btn secondary big grow" onClick={unknown}>No, me equivoqué</button>
          <button className="btn ok big grow" onClick={known}>Sí, la sabía</button>
        </div>
      )}
      <p className="small muted center">Sé honesto: si dudas, apréndela.</p>
      {picked.length > 0 && <button className="btn ghost" onClick={() => finish(picked)}>Empezar ya con {picked.length} →</button>}
    </div>
  );
}

/** Repaso opcional de una habitación. */
function RoomRecall({ words, spot, day, roomKey, onNext, last }: {
  words: Word[]; spot: string; day: StudyDay; roomKey: string; onNext: () => void; last: boolean;
}) {
  const store = useStore();
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [chain, setChain] = useState(day.chains?.[roomKey] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [en, setEn] = useState(false);

  const makeChain = async () => {
    setBusy(true); setError(null);
    try {
      const out = await ai<{ story_es: string; story_en: string }>('chain', {
        place: spot, model: store.aiModel,
        items: words.map((w) => ({ en: w.en, es: w.es, keyword: store.activeMnemonic(w.id)?.keyword })),
      });
      setChain(out);
      const fresh = store.days.find((d) => d.id === day.id) ?? day;
      await store.updateDay(day.id, { chains: { ...(fresh.chains ?? {}), [roomKey]: out } });
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>🚪 Repasa la habitación</h2>
        <div className="muted small">{spot} · di cada palabra en inglés y toca para comprobar.</div>
        {words.map((w) => (
          <button key={w.id} className="list-item" style={{ background: 'none', border: 0, width: '100%', textAlign: 'left' }}
            onClick={() => { setShown((s) => new Set(s).add(w.id)); playNaturalFast(w.en); }}>
            <span style={{ fontSize: '1.3rem' }}>{store.activeMnemonic(w.id)?.emoji?.slice(0, 2) ?? '•'}</span>
            <span className="grow"><b>{w.es}</b></span>
            <span style={{ fontWeight: 900, color: shown.has(w.id) ? 'var(--primary)' : 'var(--muted)' }}>{shown.has(w.id) ? w.en : '👆 ?'}</span>
          </button>
        ))}
      </div>
      {store.aiInfo.enabled && (
        <div className="card stack">
          {chain ? (
            <>
              <b>🔗 Historia encadenada</b>
              <div><Rich text={en ? chain.story_en : chain.story_es} /></div>
              <button className="btn ghost small" onClick={() => setEn(!en)}>{en ? '🇪🇸 Español' : '🇬🇧 English'}</button>
            </>
          ) : <button className="btn secondary" disabled={busy} onClick={makeChain}>{busy ? '⏳' : '🔗 Unir la habitación en una historia (IA)'}</button>}
          <ErrorBox error={error} />
        </div>
      )}
      <button className="btn big" onClick={onNext}>{last ? '📝 Al examen' : 'Siguiente habitación →'}</button>
    </div>
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function scheduleSurprise() {
  try {
    if (!('Notification' in window)) return;
    const fire = () => setTimeout(() => {
      new Notification('⏰ ¡Prueba sorpresa!', { body: 'Ha pasado 1 hora: comprueba si recuerdas tus palabras.', icon: '/icon.svg' });
    }, 60 * 60 * 1000);
    if (Notification.permission === 'granted') fire();
    else if (Notification.permission === 'default') Notification.requestPermission().then((p) => p === 'granted' && fire());
  } catch { /* sin notificaciones */ }
}
