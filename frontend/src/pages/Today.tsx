import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/common';
import { palaceFor } from '../data/palaces';
import { structureFor } from '../data/structures';
import { isDue, isLeech } from '../lib/srs';
import { localDate, streak } from '../lib/stats';
import { useStore } from '../store';
import { DAY_JOURNEY, journeyProgress } from '../data/dayJourney';

export function Today() {
  const { user, profile, progress, days, today, currentDay } = useStore();
  const all = [...progress.values()];
  const due = all.filter((p) => isDue(p));
  const learnedToday = all.filter((p) => today && p.study_day === today.day && p.status !== 'known').length;
  const goal = profile?.daily_goal ?? 100;
  const leeches = all.filter((p) => p.status !== 'known' && isLeech(p)).length;
  const learnedTotal = all.filter((p) => p.status !== 'known').length;
  const mastered = all.filter((p) => p.status === 'mastered').length;
  const known = all.filter((p) => p.status === 'known').length;
  const racha = streak(days.filter((d) => d.learned > 0 || d.exam_total > 0).map((d) => d.date), localDate());
  const structure = structureFor(currentDay);
  const palace = palaceFor(currentDay);
  const journeyDone = journeyProgress();
  const journeyChapter = DAY_JOURNEY[journeyDone];
  const firstWin = all.length === 0 && journeyDone === 0;
  const sessionDone = learnedToday >= goal;
  const phase = due.length > 0 ? 3 : sessionDone ? 3 : learnedToday > 0 || journeyDone > 0 ? 2 : 1;
  let perfectWordDone = false;
  try { perfectWordDone = Boolean(localStorage.getItem('memora.h1-perfect-word-complete')); } catch { /* almacenamiento opcional */ }
  const nextAction = due.length > 0
    ? { eyebrow: 'PASO 1 · CONSOLIDAR', title: 'Rescata lo que ya aprendiste', text: `${due.length} ${due.length === 1 ? 'unidad te espera' : 'unidades te esperan'} antes de añadir algo nuevo.`, to: '/repaso', label: 'Empezar repaso' }
    : firstWin
      ? { eyebrow: 'PASO 1 · TU PRIMERA VICTORIA', title: 'Vive tu primera escena', text: 'En tres minutos aprenderás una frase útil, la escucharás y la producirás tú mismo.', to: '/recorrido', label: 'Empezar mi escena' }
    : !sessionDone
      ? { eyebrow: 'PASO 1 · RECORDAR', title: learnedToday ? 'Continúa donde lo dejaste' : 'Tu primera misión del día', text: learnedToday ? 'Termina la habitación actual y construye una base sólida.' : 'Diez unidades, una asociación visual y una frase que puedas usar.', to: '/sesion', label: learnedToday ? 'Continuar sesión' : 'Empezar con 10' }
      : journeyChapter
        ? { eyebrow: 'PASO 2 · HISTORIA DEL DÍA', title: `${journeyChapter.emoji} ${journeyChapter.title}`, text: 'La siguiente escena conecta lo que has aprendido con una situación real.', to: '/recorrido', label: 'Continuar historia' }
        : { eyebrow: 'PASO 3 · HACERLO TUYO', title: 'Ahora haz que salga de ti', text: 'Convierte las palabras en una respuesta, una historia y una conversación.', to: '/practica/hablar', label: 'Abrir práctica' };

  return (
    <div className="stack today-page">
      <div className="today-heading"><div><span className="eyebrow">MEMORA · SESIÓN GUIADA</span><h1>Hola{user?.first_name ? `, ${user.first_name}` : ''}. Hoy tienes una escena.</h1><p className="muted">No tienes que decidir qué estudiar. Sigue el siguiente paso y convierte la escena en palabras que puedas usar.</p></div><div className="day-badge"><b>DÍA</b><strong>{currentDay}</strong><span>de 30</span></div></div>

      <div className="method-rail"><div className={`method-step ${phase >= 1 ? 'active' : ''}`}><span>1</span><div><b>Recordar</b><small>asociación + imagen</small></div></div><div className="method-line" /><div className={`method-step ${phase >= 2 ? 'active' : ''}`}><span>2</span><div><b>Usar</b><small>frases + historia</small></div></div><div className="method-line" /><div className={`method-step ${phase >= 3 ? 'active' : ''}`}><span>3</span><div><b>Consolidar</b><small>repaso espaciado</small></div></div></div>

      <Link to="/palabra-perfecta" className={`perfect-word-entry link ${perfectWordDone ? 'complete' : ''}`}>
        <div className="perfect-word-entry-art"><img src="/images/mnemonics/borrow-donkey-phone-h1-v1.jpg" alt="Un burro hablando por un móvil prestado" /></div>
        <div className="grow"><span className="eyebrow">{perfectWordDone ? 'H1 · MISIÓN COMPLETADA' : 'NUEVA EXPERIENCIA · 4–6 MIN'}</span><h2>{perfectWordDone ? 'Ya puedes recuperar y usar “borrow”' : 'Prueba una palabra perfecta'}</h2><p>{perfectWordDone ? 'Repite el circuito para comprobar si la escena sigue en tu memoria.' : 'Escucha, recuerda una escena absurda, descubre la estructura y crea una frase que sea realmente tuya.'}</p><div className="entry-proof"><span>🔊 Voz natural</span><span>🧠 Recuperación</span><span>✍️ Producción</span></div></div>
        <strong>{perfectWordDone ? 'Repetir →' : 'Empezar →'}</strong>
      </Link>

      {due.length > 0 && <Link to="/repaso" className="priority-banner link"><span className="priority-icon">🔁</span><div className="grow"><b>Antes de aprender algo nuevo</b><span>{due.length} {due.length === 1 ? 'palabra necesita' : 'palabras necesitan'} que compruebes si siguen en tu memoria.</span></div><strong>Repasar →</strong></Link>}

      <section className="guided-start"><div className="guided-start-copy"><span className="eyebrow light">{nextAction.eyebrow}</span><h2>{nextAction.title}</h2><p>{nextAction.text}</p><Link to={nextAction.to} className="btn guided-start-action">{nextAction.label} →</Link></div><div className="guided-start-map"><div className={`guided-node ${phase >= 1 ? 'active' : ''}`}><span>🧠</span><b>Recordar</b><small>imagen + sonido</small></div><div className="guided-connector" /><div className={`guided-node ${phase >= 2 ? 'active' : ''}`}><span>🗣️</span><b>Usar</b><small>frases propias</small></div><div className="guided-connector" /><div className={`guided-node ${phase >= 3 ? 'active' : ''}`}><span>🏆</span><b>Consolidar</b><small>repaso espaciado</small></div></div></section>

      {firstWin && <section className="first-win card"><div className="first-win-art" aria-hidden="true">🌅<span>☕</span><span>🗣️</span></div><div className="grow"><span className="eyebrow">LA RECOMPENSA LLEGA EN 3 MINUTOS</span><h2>Hoy no vas a mirar una lista: vas a contar tu mañana.</h2><p className="muted">Una mini escena con audio, imagen mental y una frase escrita por ti. Cuando la completes, desbloqueas el siguiente capítulo.</p></div><Link className="btn" to="/recorrido">Quiero mi primera victoria →</Link></section>}

      <section className="daily-hero"><div className="daily-hero-top"><span className="eyebrow light">FASE 1 · PALACIO DE LA MEMORIA</span><span className="hero-day">{palace.emoji} {palace.name}</span></div><h2>{firstWin ? 'Tu primera frase empieza aquí ✨' : sessionDone ? 'Tu sesión base está completa 🎉' : 'Construye una base que puedas usar'}</h2><p>{firstWin ? 'Primero vive una escena. Después añadiremos palabras y asociaciones para que se quede.' : sessionDone ? 'Ahora conviértela en frases, escucha la historia y habla con ella.' : `${goal} unidades pequeñas: palabras, bloques y estructuras que volverán a aparecer en contexto.`}</p><div className="daily-progress"><div className="spread small"><span>{learnedToday} / {goal} unidades</span><b>{Math.round(Math.min(learnedToday / Math.max(goal, 1), 1) * 100)}%</b></div><ProgressBar value={learnedToday} max={goal} /></div><Link to={firstWin ? '/recorrido' : sessionDone ? '/recorrido' : '/sesion'} className="btn hero-action">{firstWin ? 'Vivir mi primera escena →' : sessionDone ? 'Continuar historia →' : learnedToday ? 'Continuar sesión →' : 'Empezar sesión →'}</Link></section>

      <section className="journey-home-card card"><div className="journey-home-art" aria-hidden="true">{journeyChapter?.emoji ?? '🏆'}</div><div className="grow"><span className="eyebrow">HISTORIA DEL DÍA · {journeyDone}/{DAY_JOURNEY.length} ESCENAS</span><h2>{journeyChapter ? `${journeyChapter.moment}: ${journeyChapter.title}` : 'Has completado tu día en inglés'}</h2><p className="muted">{journeyChapter ? journeyChapter.sceneEs : 'Vuelve mañana para seguir ampliando la historia.'}</p><ProgressBar value={journeyDone} max={DAY_JOURNEY.length} /></div><Link className="btn secondary" to="/recorrido">{journeyChapter ? 'Continuar escena →' : 'Repasar recorrido →'}</Link></section>

      <div className="section-heading"><div><span className="eyebrow">FASE 2 · TRANSFERENCIA</span><h2>Ahora haz que salga de ti</h2></div><Link to="/ruta" className="text-link">Ver la ruta completa →</Link></div>
      <div className="practice-grid"><Link to="/practica/hablar" className="practice-tile tile-teal"><span className="tile-icon">🗣️</span><div><b>Patrones para hablar</b><span>I really want to… · Actually, …</span></div><strong>→</strong></Link><Link to="/biblioteca" className="practice-tile tile-orange"><span className="tile-icon">📚</span><div><b>Historia y lectura</b><span>Lee, escucha y toca lo que no entiendas.</span></div><strong>→</strong></Link><Link to="/practica/conversacion" className="practice-tile tile-blue"><span className="tile-icon">💬</span><div><b>Conversación</b><span>Responde con tus palabras y recibe ayuda.</span></div><strong>→</strong></Link><Link to="/practica/dictado" className="practice-tile tile-sand"><span className="tile-icon">🎧</span><div><b>Oído y dictado</b><span>Escucha a velocidad real y escribe.</span></div><strong>→</strong></Link><Link to="/desafios" className="practice-tile tile-purple"><span className="tile-icon">🎮</span><div><b>Desafíos y ranking</b><span>Ordena, escucha, recuerda y reta a tu familia.</span></div><strong>→</strong></Link></div>

      <div className="section-heading"><div><span className="eyebrow">FASE 3 · EVIDENCIA</span><h2>¿Se está quedando?</h2></div><Link to="/progreso" className="text-link">Ver resultados →</Link></div>
      <div className="evidence-grid"><div className="evidence-card"><span className="evidence-icon">🧠</span><strong>{learnedTotal}</strong><span>en tu memoria</span></div><div className="evidence-card"><span className="evidence-icon">🏆</span><strong>{mastered}</strong><span>dominadas</span></div><div className="evidence-card"><span className="evidence-icon">🔥</span><strong>{racha}</strong><span>{racha === 1 ? 'día' : 'días'} de racha</span></div><Link to="/repaso?rebeldes=1" className="evidence-card evidence-link"><span className="evidence-icon">🧩</span><strong>{leeches}</strong><span>para rescatar</span></Link></div>

      <div className="today-footer"><span>📍 Estructura de hoy: <b>{structure.title}</b> · <code>{structure.pattern}</code></span><span>{known} palabras ya las conocías</span></div>
    </div>
  );
}
