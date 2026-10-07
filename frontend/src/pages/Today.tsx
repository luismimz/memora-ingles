import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/common';
import { palaceFor } from '../data/palaces';
import { structureFor } from '../data/structures';
import { isDue, isLeech } from '../lib/srs';
import { localDate, streak } from '../lib/stats';
import { useStore } from '../store';

export function Today() {
  const { user, profile, progress, days, today, currentDay } = useStore();
  const all = [...progress.values()];
  const due = all.filter((p) => isDue(p));
  const fromYesterday = due.filter((p) => p.study_day === currentDay - 1);
  const learnedToday = all.filter((p) => today && p.study_day === today.day && p.status !== 'known').length;
  const goal = profile?.daily_goal ?? 100;
  const leeches = all.filter((p) => p.status !== 'known' && isLeech(p)).length;
  const learnedTotal = all.filter((p) => p.status !== 'known').length;
  const known = all.filter((p) => p.status === 'known').length;
  const mastered = all.filter((p) => p.status === 'mastered').length;
  const racha = streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate());
  const structure = structureFor(currentDay);
  const palace = palaceFor(currentDay);
  const sessionDone = learnedToday >= goal;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="muted small">Hola{user?.first_name ? `, ${user.first_name}` : ''} 👋</div>
          <h1 style={{ margin: 0 }}>Día {currentDay} {currentDay <= 30 ? <span className="muted" style={{ fontWeight: 700 }}>de 30</span> : '· mantenimiento'}</h1>
        </div>
        <div className="center">
          <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔥</div>
          <div className="small" style={{ fontWeight: 900 }}>{racha} {racha === 1 ? 'día' : 'días'}</div>
        </div>
      </div>
      <ProgressBar value={Math.min(currentDay - 1, 30)} max={30} />

      <Link to="/ruta" className="card path-teaser link">
        <div className="path-teaser-icon">🧭</div>
        <div className="grow"><span className="chip primary">Nueva ruta</span><h3 style={{ margin: '.3rem 0 .15rem' }}>Memoria → frases → historias → conversación</h3><div className="small muted">Sigue el siguiente paso en vez de abrir actividades al azar.</div></div>
        <span className="path-arrow">→</span>
      </Link>

      {/* Paso 1: repaso */}
      {due.length > 0 && (
        <Link to="/repaso" className="card link" style={{ borderColor: 'var(--accent)' }}>
          <div className="spread">
            <div>
              <span className="chip accent">Paso 1 · primero lo de antes</span>
              <h2 style={{ margin: '.4rem 0 .2rem' }}>🔁 {due.length} repasos pendientes</h2>
              <div className="muted small">
                {fromYesterday.length > 0 ? `Incluye la prueba de ${fromYesterday.length} palabras de ayer: ¿se quedaron en la memoria?` : 'Comprueba si lo aprendido sigue ahí antes de meter palabras nuevas.'}
              </div>
            </div>
            <span style={{ fontSize: '1.8rem' }}>→</span>
          </div>
        </Link>
      )}

      {/* Paso 2: sesión del día */}
      <div className="card hero stack">
        <div>
          <span className="chip" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>{due.length ? 'Paso 2' : 'Paso 1'} · 25 minutos</span>
          <h2 style={{ margin: '.5rem 0 .2rem', color: '#fff' }}>{sessionDone ? '🎉 ¡Objetivo de hoy cumplido!' : `🧠 ${goal} palabras nuevas`}</h2>
          <div className="muted small">Palacio de hoy: {palace.emoji} {palace.name} · 10 habitaciones de 10 palabras</div>
        </div>
        <div className="spread small"><span>{learnedToday} / {goal} aprendidas hoy</span><span>{Math.round((learnedToday / goal) * 100)}%</span></div>
        <ProgressBar value={learnedToday} max={goal} />
        <Link to="/sesion" className="btn white big block">{learnedToday === 0 ? 'Empezar la sesión' : sessionDone ? 'Aprender más palabras' : 'Continuar'}</Link>
      </div>

      {/* Paso 3: usar */}
      <div className="card stack">
        <span className="chip primary" style={{ alignSelf: 'flex-start' }}>{due.length ? 'Paso 3' : 'Paso 2'} · de memorizar a hablar</span>
        <h3 style={{ margin: 0 }}>🪜 Estructura del día: {structure.title}</h3>
        <p className="muted small" style={{ margin: 0 }}>{structure.explain}</p>
          <div className="row">
            <Link to="/practica/escalera" className="btn small">Frase escalera</Link>
            <Link to="/practica/historia" className="btn secondary small">📜 Historia del día</Link>
            <Link to="/practica/conversacion" className="btn secondary small">💬 Conversar</Link>
            <Link to="/biblioteca" className="btn secondary small">📚 Biblioteca</Link>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat"><div className="v">{learnedTotal}</div><div className="l">aprendidas</div></div>
        <div className="stat"><div className="v">{mastered}</div><div className="l">dominadas (+30 d)</div></div>
        <div className="stat"><div className="v">{known}</div><div className="l">ya las sabías</div></div>
        <Link to="/repaso?rebeldes=1" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="v">{leeches}</div><div className="l">😈 rebeldes</div>
        </Link>
      </div>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/verbos" className="btn secondary small">🔀 Verbos irregulares</Link>
        <Link to="/ajustes" className="btn secondary small">⚙️ Ajustes</Link>
      </div>
    </div>
  );
}
