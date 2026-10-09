import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/common';
import { isDue } from '../lib/srs';
import { localDate, streak } from '../lib/stats';
import { useStore } from '../store';
import { EbbinghausExperiment } from '../features/ebbinghaus/EbbinghausExperiment';

export function Today() {
  const { user, profile, words, progress, days, today, currentDay, wordById } = useStore();
  const all = [...progress.values()];
  const due = all.filter((p) => isDue(p));
  const learnedToday = all.filter((p) => today && p.study_day === today.day && p.status !== 'known').length;
  const learnedTotal = all.filter((p) => p.status !== 'known').length;
  const mastered = all.filter((p) => p.status === 'mastered').length;
  const goal = profile?.daily_goal ?? 100;
  const racha = streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate());
  const lastActivityMs = Math.max(
    ...days.flatMap((day) => [day.started_at, day.finished_at]).filter(Boolean).map((value) => Date.parse(value as string)),
    ...all.flatMap((item) => [item.last_seen, item.learned_at]).filter(Boolean).map((value) => Date.parse(value as string)),
    0,
  );
  const absentFor72Hours = !lastActivityMs || Date.now() - lastActivityMs >= 72 * 3600_000;
  const absentDays = lastActivityMs ? Math.max(1, Math.floor((Date.now() - lastActivityMs) / 86_400_000)) : 3;
  const experimentWords = due.map((item) => wordById.get(item.word)).filter((word): word is NonNullable<typeof word> => Boolean(word)).slice(0, 10);
  const catalogReady = words.some((word) => Boolean(
    ['published', 'active', 'true', 1].includes(word.status as string | number)
      && word.bridge_word?.trim()
      && word.scene_es?.trim()
      && word.target_sentence_en?.trim()
      && word.target_sentence_es?.trim()
      && word.distractor?.trim(),
  ));
  const action = catalogReady
    ? {
      to: '/descubrir',
      label: due.length ? 'Continuar misión' : `Jugar Día ${currentDay}`,
      eyebrow: due.length ? 'PRIMERO · CONTINÚA TU MISIÓN' : 'AHORA · TU ÚNICA MISIÓN',
    }
    : {
      to: '/ajustes',
      label: 'Revisar catálogo →',
      eyebrow: 'CATÁLOGO · AÚN PREPARÁNDOSE',
    };

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
          <h2>Continúa tu misión de hoy</h2>
          <p>{!catalogReady
            ? 'El catálogo todavía se está sincronizando. Puedes comprobar su estado en Ajustes y volver cuando haya contenido listo.'
            : due.length
            ? 'Empieza con una conexión y después recuperaremos lo que toque.'
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

      {absentFor72Hours && experimentWords.length ? <EbbinghausExperiment words={experimentWords} absentDays={absentDays} /> : null}

      <div className="focus-stats">
        <div><span>🧠</span><strong>{learnedTotal}</strong><small>aprendidas</small></div>
        <div><span>🏆</span><strong>{mastered}</strong><small>dominadas</small></div>
        <div><span>🔁</span><strong>{due.length}</strong><small>por recuperar</small></div>
      </div>

      <div className="focus-secondary">
        <Link to="/galeria">Ver mi colección</Link><span>·</span>
        <Link to="/arcade">Abrir Arcade</Link>
      </div>
    </div>
  );
}
