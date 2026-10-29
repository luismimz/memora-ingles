import { ScreenHeading } from './ScreenHeading';
import { NavigationMenu } from './NavigationMenu';
import { StoryScene } from './StoryScene';
import { storyCards, storyChapters, storyJourney } from '../domain/storyJourney';
import { readTrickCheckpoint } from '../domain/trickCheckpoint';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import './learningSpace.css';

/** A pause in the same journey, not a second curriculum or progress store. */
export function StoryHub({ userId, inspection = false, syncStatus, onResume, onEvolution, onProfile, onLegacy, onExit }: {
  userId: string; inspection?: boolean; syncStatus: SyncStatus;
  onResume: () => void; onEvolution?: () => void; onProfile: () => void;
  onLegacy: () => void; onExit: () => void;
}) {
  const saved = inspection ? null : readTrickCheckpoint(userId, storyJourney.id, storyJourney.version);
  const finished = saved?.checkId === 'end' && saved.stage >= storyCards.length;
  const card = (saved?.checkId === 'end' && !finished ? storyCards[saved.stage] : storyCards.find(item => item.id === saved?.checkId)) ?? storyCards[0];
  const chapter = storyChapters[card.chapter];
  return <main className="learning-space story-hub">
    <header className="space-header"><span className="space-brand">m <span>MEMORA</span></span>
      <NavigationMenu label="Tu espacio"><button onClick={onProfile}>Perfil y ajustes</button><button onClick={onExit}>{inspection ? 'Salir de la revisión' : 'Cerrar sesión'}</button></NavigationMenu>
    </header>
    <section className="hub-resume" aria-labelledby="hub-title">
      <p className="eyebrow">{finished ? 'UN MOMENTO PARA VOLVER' : 'TU HISTORIA SIGUE AQUÍ'}</p>
      <ScreenHeading id="hub-title">{finished ? 'Lo vivido también se recuerda.' : chapter.title}</ScreenHeading>
      <StoryScene card={card} />
      <p className="hub-next">{finished ? 'Consulta tus repasos o explora el curso anterior.' : card.title}</p>
      <button className="primary-action" onClick={onResume}>{finished ? 'Ver mis repasos' : 'Volver a mi historia'} <span aria-hidden="true">↗</span></button>
      <p className="hub-sync" role="status">{inspection ? 'Vista de revisión · sin guardar práctica' : syncLabels[syncStatus]}</p>
    </section>
    <nav className="hub-destinations" aria-label="Fuera de la historia">
      {onEvolution ? <button onClick={onEvolution}><span aria-hidden="true">◌</span><strong>Mi memoria</strong><small>Frases, intentos y próximos repasos</small><span aria-hidden="true">↗</span></button> : null}
      <button onClick={onProfile}><span aria-hidden="true">◒</span><strong>A mi ritmo</strong><small>Reloj, apariencia y ajustes</small><span aria-hidden="true">↗</span></button>
    </nav>
    <details className="hub-previous"><summary>Mi curso anterior</summary><p>Tu posición y tus actividades siguen guardadas.</p><button className="quiet-action" onClick={onLegacy}>Abrir mi curso anterior</button></details>
  </main>;
}
