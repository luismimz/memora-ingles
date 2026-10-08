import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/common';
import { isDue } from '../lib/srs';
import { localDate, streak } from '../lib/stats';
import { useStore } from '../store';

export function Today() {
  const { user, profile, progress, days, today, currentDay, words } = useStore();
  const all = [...progress.values()];
  const due = all.filter((p) => isDue(p));
  const learnedToday = all.filter((p) => today && p.study_day === today.day && p.status !== 'known').length;
  const learnedTotal = all.filter((p) => p.status !== 'known').length;
  const mastered = all.filter((p) => p.status === 'mastered').length;
  const goal = profile?.daily_goal ?? 100;
  const racha = streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate());
  const nextTen = Math.min(10, Math.max(0, words.length - all.length));
  const action = due.length
    ? { to: '/repaso', label: `Recuperar ${due.length} ${due.length === 1 ? 'recuerdo' : 'recuerdos'}`, eyebrow: 'PRIMERO · LO QUE TU MEMORIA NECESITA' }
    : { to: '/sesion?autostart=1', label: `Crear ${nextTen || 10} asociaciones`, eyebrow: 'AHORA · TU ÚNICA MISIÓN' };

  return (
    <div className="stack today-focus">
      <header className="focus-heading">
        <div>
          <span className="eyebrow">DÍA {currentDay} DE 30</span>
          <h1>Hola{user?.first_name ? `, ${user.first_name}` : ''}. Vamos a dejar algo en tu memoria.</h1>
          <p className="muted">No elijas entre menús. Memora decide el siguiente paso y tú solo avanzas.</p>
        </div>
        <div className="focus-streak"><span>🔥</span><strong>{racha}</strong><small>{racha === 1 ? 'día' : 'días'}</small></div>
      </header>

      <section className="memory-mission">
        <div className="memory-mission-copy">
          <span className="eyebrow light">{action.eyebrow}</span>
          <h2>{due.length ? 'Haz fuerte lo que ya aprendiste' : 'Convierte 10 palabras en 10 escenas'}</h2>
          <p>{due.length
            ? 'Recupéralas sin mirar. Después Memora te dará palabras nuevas.'
            : 'Oyes la palabra, conectas una imagen absurda, la usas en una frase y la recuperas sin ayuda.'}</p>
          <Link className="btn memory-mission-action" to={action.to}>{action.label} →</Link>
        </div>
        <div className="memory-loop" aria-label="Método de la sesión">
          <div><span>🧠</span><b>Asociar</b><small>sonido + escena</small></div>
          <i>→</i>
          <div><span>💬</span><b>Usar</b><small>frase real</small></div>
          <i>→</i>
          <div><span>⚡</span><b>Recuperar</b><small>sin mirar</small></div>
        </div>
      </section>

      <section className="today-meter card">
        <div className="spread"><div><span className="eyebrow">AVANCE DE HOY</span><h2>{learnedToday} de {goal} unidades</h2></div><strong>{Math.round(Math.min(learnedToday / Math.max(goal, 1), 1) * 100)}%</strong></div>
        <ProgressBar value={learnedToday} max={goal} />
        <p className="small muted">Cada unidad cuenta solo cuando la has visto, usado y comprobado. No por abrir una tarjeta.</p>
      </section>

      <div className="focus-stats">
        <div><span>🧠</span><strong>{learnedTotal}</strong><small>aprendidas</small></div>
        <div><span>🏆</span><strong>{mastered}</strong><small>dominadas</small></div>
        <div><span>🔁</span><strong>{due.length}</strong><small>por recuperar</small></div>
      </div>

      <div className="focus-secondary">
        <Link to="/palabras">Ver mis asociaciones</Link><span>·</span>
        <Link to="/biblioteca">Leer una historia</Link><span>·</span>
        <Link to="/progreso">Comprobar mi progreso</Link>
      </div>
    </div>
  );
}
