import { Link } from 'react-router-dom';
import { structureFor } from '../data/structures';
import { useStore } from '../store';

const MODES = [
  { to: '/biblioteca', ico: '📚', title: 'Biblioteca de lecturas', desc: 'Lee aventuras breves, escucha cada escena y captura palabras nuevas.' },
  { to: '/practica/hablar', ico: '🗣️', title: 'Hablar desde el principio', desc: 'Palabras frecuentes y patrones para responder, preguntar y ganar confianza.' },
  { to: '/practica/escalera', ico: '🪜', title: 'Frase escalera', desc: 'De «quiero» a una frase larga, pieza a pieza.' },
  { to: '/practica/frases', ico: '📝', title: 'Mis frases', desc: 'Tu banco de frases útiles, corregidas por la IA.' },
  { to: '/practica/conversacion', ico: '💬', title: 'Conversación', desc: 'Habla con la IA usando tus palabras.', ai: true },
  { to: '/practica/historia', ico: '📜', title: 'Historia del día', desc: 'Un relato absurdo con lo que has aprendido.', ai: true },
  { to: '/practica/dictado', ico: '🎧', title: 'Dictado', desc: 'Oye frases reales y escríbelas.' },
  { to: '/practica/pronunciacion', ico: '🎤', title: 'Pronunciación', desc: 'Habla y el micrófono te corrige.' },
  { to: '/practica/contrarreloj', ico: '⚡', title: 'Contrarreloj', desc: 'Empareja palabras en 60 segundos.' },
  { to: '/verbos', ico: '🔀', title: 'Verbos irregulares', desc: 'Por familias: sing-sang-sung…' },
];

export function Practice() {
  const { currentDay, aiInfo } = useStore();
  const s = structureFor(currentDay);
  return (
    <div className="stack">
      <h1>🎯 Practicar</h1>
      <p className="muted">Memorizar es el paso 1. Para <b>dominar</b> una palabra tienes que usarla: escuchar, escribir frases y hablar.</p>
      <Link to="/ruta" className="card path-teaser link"><div className="path-teaser-icon">🧭</div><div className="grow"><b>¿No sabes por dónde empezar?</b><div className="small muted">La Ruta de aprendizaje ordena las actividades para ti.</div></div><span className="path-arrow">→</span></Link>
      <div className="card flat small"><b>Hoy toca:</b> {s.title} · <code>{s.pattern}</code></div>
      <div className="grid2">
        {MODES.map((m) => (
          <Link key={m.to} to={m.to} className="card link">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '2rem' }}>{m.ico}</span>
              <div>
                <b>{m.title}</b> {m.ai && !aiInfo.enabled && <span className="chip">requiere IA</span>}
                <div className="small muted">{m.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
