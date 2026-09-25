import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import type { Word } from '../../types';

/** Palabras que ya estás aprendiendo (no las que ya sabías), las más recientes primero. */
export function useLearnedWords(): Word[] {
  const { progress, wordById } = useStore();
  return [...progress.values()]
    .filter((p) => p.status !== 'known' && p.learned_at)
    .sort((a, b) => Date.parse(b.learned_at!) - Date.parse(a.learned_at!))
    .flatMap((p) => { const w = wordById.get(p.word); return w ? [w] : []; });
}

export function BackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="stack" style={{ gap: '.25rem' }}>
      <Link to="/practica" className="btn ghost" style={{ alignSelf: 'flex-start' }}>← Practicar</Link>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

export function NeedsAi() {
  return (
    <div className="card center stack">
      <div style={{ fontSize: '2rem' }}>🤖</div>
      <b>Esta práctica necesita la IA.</b>
      <p className="small muted" style={{ margin: 0 }}>Añade <code>OPENROUTER_API_KEY</code> en el servidor (Directus) y recarga.</p>
    </div>
  );
}

export function NeedsWords() {
  return (
    <div className="card center stack">
      <b>Primero aprende algunas palabras.</b>
      <Link to="/sesion" className="btn">Ir a la sesión del día</Link>
    </div>
  );
}
