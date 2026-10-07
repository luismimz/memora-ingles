import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/common';
import { localDate, streak } from '../lib/stats';
import { isDue } from '../lib/srs';
import { useStore } from '../store';

interface PathStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  to: string;
  unlock: (stats: PathStats) => boolean;
  done: (stats: PathStats) => boolean;
}

interface PathStats {
  learned: number;
  mastered: number;
  due: number;
  today: number;
  days: number;
  currentDay: number;
}

const STEPS: PathStep[] = [
  {
    id: 'memory', icon: '🧠', title: 'Construye tu memoria', description: 'Aprende palabras y bloques con una imagen, una historia absurda y una escena en inglés.', to: '/sesion',
    unlock: () => true, done: (s) => s.learned >= 10,
  },
  {
    id: 'review', icon: '🔁', title: 'Fija lo aprendido', description: 'Recupera las palabras justo antes de olvidarlas. La repetición se adapta a tus fallos.', to: '/repaso',
    unlock: (s) => s.learned >= 1, done: (s) => s.due === 0 && s.learned >= 1,
  },
  {
    id: 'patterns', icon: '🗣️', title: 'Habla con patrones', description: 'Aprende frases completas como I really want to… y cambia sus piezas sin quedarte en blanco.', to: '/practica/hablar',
    unlock: (s) => s.learned >= 1, done: (s) => s.today >= 5,
  },
  {
    id: 'stories', icon: '📚', title: 'Lee y escucha historias', description: 'Sigue una historia, toca las palabras difíciles, escucha una voz natural y guárdalas.', to: '/biblioteca',
    unlock: (s) => s.learned >= 1, done: () => false,
  },
  {
    id: 'conversation', icon: '💬', title: 'Usa el idioma', description: 'Responde a la IA usando tus palabras y recibe una corrección que puedas reutilizar.', to: '/practica/conversacion',
    unlock: (s) => s.learned >= 5, done: () => false,
  },
  {
    id: 'ear', icon: '🎧', title: 'Entrena el oído', description: 'Haz dictados y escucha tus frases a velocidad normal y lenta hasta reconocerlas.', to: '/practica/dictado',
    unlock: (s) => s.learned >= 5, done: () => false,
  },
  {
    id: 'speak', icon: '🎤', title: 'Pronuncia y gana confianza', description: 'Repite, compara y convierte lo que sabes en una respuesta automática.', to: '/practica/pronunciacion',
    unlock: (s) => s.learned >= 10, done: () => false,
  },
];

export function Path() {
  const { profile, progress, days, today, currentDay } = useStore();
  const all = [...progress.values()];
  const stats: PathStats = {
    learned: all.filter((p) => p.status !== 'known').length,
    mastered: all.filter((p) => p.status === 'mastered').length,
    due: all.filter((p) => isDue(p)).length,
    today: all.filter((p) => today && p.study_day === today.day && p.status !== 'known').length,
    days: streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate()),
    currentDay,
  };
  const goal = profile?.daily_goal ?? 100;
  const dailyProgress = Math.min(stats.today / Math.max(goal, 1), 1);
  const xp = stats.learned * 10 + stats.mastered * 25 + stats.days * 20 + Math.round(dailyProgress * 30);
  const completed = STEPS.filter((step) => step.done(stats)).length;
  const next = STEPS.find((step) => step.unlock(stats) && !step.done(stats));

  return (
    <div className="stack">
      <div className="path-hero">
        <div className="path-hero-copy">
          <span className="chip" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>Día {currentDay} · ruta personal</span>
          <h1>Tu camino para hablar inglés</h1>
          <p>Memoria → patrones → historias → conversación. Cada paso usa lo anterior para que avances sin saturarte.</p>
          <div className="row"><span className="path-xp">⚡ {xp} puntos de impulso</span><span className="path-streak">🔥 {stats.days} {stats.days === 1 ? 'día' : 'días'} de racha</span></div>
        </div>
        <img src="/images/story-library-cover.png" alt="Libro abierto que conduce a un palacio de la memoria" />
      </div>

      <div className="card stack">
        <div className="spread"><div><span className="chip primary">Tu siguiente paso</span><h2 style={{ margin: '.35rem 0 0' }}>{next ? `${next.icon} ${next.title}` : '🎉 Ruta completada por hoy'}</h2></div><b>{completed}/{STEPS.length}</b></div>
        <p className="muted small" style={{ margin: 0 }}>{next?.description ?? 'Vuelve mañana para consolidar y desbloquear nuevos retos.'}</p>
        {next && <Link className="btn" to={next.to}>Continuar la ruta →</Link>}
        <div className="small muted">Progreso de hoy · {stats.today} / {goal} unidades</div>
        <ProgressBar value={stats.today} max={goal} />
      </div>

      <div className="path-grid">
        {STEPS.map((step, index) => {
          const unlocked = step.unlock(stats);
          const isDone = step.done(stats);
          return (
            <Link key={step.id} to={unlocked ? step.to : '#'} onClick={(e) => !unlocked && e.preventDefault()} className={`path-step card link ${isDone ? 'is-done' : ''} ${!unlocked ? 'is-locked' : ''}`} aria-disabled={!unlocked}>
              <div className="path-number">{isDone ? '✓' : index + 1}</div>
              <div className="path-step-icon">{step.icon}</div>
              <div className="path-step-copy"><b>{step.title}</b><span className="small muted">{step.description}</span></div>
              <span className="path-arrow">{isDone ? '✓' : unlocked ? '→' : '🔒'}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid2">
        <Link to="/biblioteca" className="card link feature-card"><span className="feature-icon">📚</span><div><b>Biblioteca de lecturas</b><div className="small muted">Historias breves adaptadas, audio y vocabulario propio.</div></div></Link>
        <Link to="/progreso" className="card link feature-card"><span className="feature-icon">📈</span><div><b>Tu evidencia de avance</b><div className="small muted">Comprueba qué recuerdas a 1 h, 24 h, 7 d y 30 d.</div></div></Link>
      </div>
    </div>
  );
}
