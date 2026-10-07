import { Link } from 'react-router-dom';
import { structureFor } from '../data/structures';
import { useStore } from '../store';

const MODES = [
  { phase: 'Usar', to: '/practica/hablar', ico: '🗣️', title: 'Hablar desde el principio', desc: 'Palabras frecuentes y patrones para responder, preguntar y ganar confianza.' },
  { phase: 'Usar', to: '/practica/escalera', ico: '🪜', title: 'Frase escalera', desc: 'De «quiero» a una frase larga, pieza a pieza.' },
  { phase: 'Usar', to: '/practica/frases', ico: '📝', title: 'Mis frases', desc: 'Tu banco de frases útiles, corregidas por la IA.' },
  { phase: 'Vivirlo', to: '/biblioteca', ico: '📚', title: 'Biblioteca de lecturas', desc: 'Lee aventuras breves, escucha cada escena y captura palabras nuevas.' },
  { phase: 'Vivirlo', to: '/practica/historia', ico: '📜', title: 'Historia del día', desc: 'Un relato continuo con lo que has aprendido.', ai: true },
  { phase: 'Vivirlo', to: '/contenido-real', ico: '🎬', title: 'Canciones y películas', desc: 'Añade un enlace oficial y guarda frases que realmente quieras entender.' },
  { phase: 'Vivirlo', to: '/practica/conversacion', ico: '💬', title: 'Conversación', desc: 'Habla con la IA usando tus palabras.', ai: true },
  { phase: 'Comprobar', to: '/practica/dictado', ico: '🎧', title: 'Dictado', desc: 'Oye frases reales y escríbelas.' },
  { phase: 'Comprobar', to: '/practica/pronunciacion', ico: '🎤', title: 'Pronunciación', desc: 'Habla y el micrófono te corrige.' },
  { phase: 'Comprobar', to: '/practica/contrarreloj', ico: '⚡', title: 'Contrarreloj', desc: 'Empareja palabras en 60 segundos.' },
  { phase: 'Comprobar', to: '/desafios', ico: '🎮', title: 'Desafíos y ranking', desc: 'Ordena frases, rescata historias y compite con tu familia.' },
  { phase: 'Comprobar', to: '/phrasal-verbs', ico: '🔀', title: 'Phrasal verbs', desc: 'Las unidades que más aparecen en conversaciones reales.' },
  { phase: 'Comprobar', to: '/verbos', ico: '🔀', title: 'Verbos irregulares', desc: 'Por familias: sing-sang-sung…' },
];

export function Practice() {
  const { currentDay, aiInfo } = useStore();
  const s = structureFor(currentDay);
  return (
    <div className="stack practice-page">
      <div className="page-heading"><div><span className="eyebrow">FASE 2 · TRANSFERENCIA</span><h1>Practicar para que salga de ti</h1><p className="muted">Memorizar es el paso 1. Ahora escucha, construye, lee y habla con lo que acabas de aprender.</p></div><div className="settings-orb">🎯</div></div>
      <Link to="/ruta" className="card path-teaser link"><div className="path-teaser-icon">🧭</div><div className="grow"><b>¿No sabes por dónde empezar?</b><div className="small muted">La Ruta de aprendizaje ordena las actividades para ti.</div></div><span className="path-arrow">→</span></Link>
      <div className="card flat small"><b>Hoy toca:</b> {s.title} · <code>{s.pattern}</code></div>
      {['Usar', 'Vivirlo', 'Comprobar'].map((phase) => <section className="practice-section" key={phase}><div className="section-heading"><div><span className="eyebrow">{phase === 'Usar' ? 'PATRONES Y PRODUCCIÓN' : phase === 'Vivirlo' ? 'CONTEXTO Y CONEXIÓN' : 'OÍDO Y EVIDENCIA'}</span><h2>{phase}</h2></div><span className="small muted">{MODES.filter((m) => m.phase === phase).length} actividades</span></div><div className="grid2">{MODES.filter((m) => m.phase === phase).map((m) => <Link key={m.to} to={m.to} className="card link practice-mode-card"><span className="practice-mode-icon">{m.ico}</span><div><b>{m.title}</b>{m.ai && !aiInfo.enabled && <span className="chip">requiere IA</span>}<div className="small muted">{m.desc}</div></div><span className="path-arrow">→</span></Link>)}</div></section>)}
    </div>
  );
}
