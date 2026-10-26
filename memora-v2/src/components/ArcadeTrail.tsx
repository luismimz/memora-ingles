/** Rhythm/orientation only. Icons do not award mastery or complete a challenge. */
export function ArcadeTrail({ current }: { current: number }) {
  return <ol className="arcade-trail" aria-label="Ritmo de estos retos">{[['▦', 'Conecta'], ['♪', 'Escucha'], ['✎', 'Recuerda']].map(([icon, label], index) => <li key={label} aria-current={index === current ? 'step' : undefined}><span aria-hidden="true">{icon}</span><small>{label}</small></li>)}</ol>;
}
