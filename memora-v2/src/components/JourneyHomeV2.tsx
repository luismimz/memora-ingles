import { useState } from 'react';
import { readGameCheckpoint, readMirrorCheckpoint } from '../domain/gameCheckpoint';
import { isReviewDue, readUnitProgress } from '../domain/journey';
import { readLearningActivities } from '../domain/learningActivity';
import { loadLearningProfile, readAvatar } from '../domain/learningProfile';
import { readWordMemories } from '../domain/memory';
import { shouldOfferMicroArcade } from '../domain/microArcade';
import { catalogueStats } from '../domain/catalogueStats';
import { completedVocabularyStop, journeyPresentation } from '../domain/journeyMap';
import { JourneyMap } from './JourneyMap';
import { JourneyScene } from './JourneyScene';
import type { UnitSummary } from '../services/directus';
import type { Appearance } from '../useAppearance';
import type { LearningMode } from '../domain/game';
import './homeV2.css';
import { buildJourneyRoute, completedTrick, missingTrickWords } from '../domain/journeyTricks';
import { readTrickCheckpoint } from '../domain/trickCheckpoint';

type Props = {
  units: UnitSummary[]; userId: string; resumeUnitId?: string | null; error?: string | null;
  resumeLearningMode?: LearningMode;
  onOpen: (unit: UnitSummary) => void; onConverse: (unit: UnitSummary) => void;
  onWords?: () => void; onGrammar?: () => void;
  onArcade?: () => void; onManageContent?: () => void; onFusionDemo?: () => void;
  onGrammarReview?: () => void; onEvolution?: () => void; onMirror?: () => void;
  onTryPreview?: () => void; onExit: () => void; onProfile: () => void;
  appearance: Appearance; onToggleAppearance: () => void;
};

const activityLabels: Record<string, string> = {
  associate: 'Conecta las palabras', recall: 'Recuerda lo que aprendiste',
  reward: 'Usa tus nuevas palabras', grammar: 'Descubre un truco',
  build: 'Construye una frase', conversation: 'Habla con un personaje',
};
const mirrorStageLabels = ['Descubre la pieza escondida', 'Compara las piezas', 'Cambia la acción', 'Prueba la frase', 'Conversa con Emma', 'Recuerda sin modelo'];

/** Home as a hub: the mission remains primary, while optional practice never hijacks Continue. */
export function JourneyHome(props: Props) {
  const { units, userId, resumeUnitId, error, onOpen, onConverse, onArcade, onManageContent,
    onFusionDemo, onGrammarReview, onEvolution, onMirror, onTryPreview, onExit, onProfile,
    appearance, onToggleAppearance, onWords, onGrammar, resumeLearningMode = 'adventure' } = props;
  const [showAllWords, setShowAllWords] = useState(false);
  const catalogue = catalogueStats(units);
  const stories = buildJourneyRoute(units);
  const memories = readWordMemories(userId);
  const lockedIds = new Set(stories.filter((stop) => missingTrickWords(stop, memories).length).map((stop) => stop.id));
  const knownUnitIds = new Set(stories.map((unit) => unit.id));
  const activities = readLearningActivities(userId).filter((item) => knownUnitIds.has(item.unitId));
  const completed = stories.filter((unit) => unit.routeTrick ? completedTrick(unit, activities) : readUnitProgress(userId, unit.id) || completedVocabularyStop(unit, activities));
  const completedIds = new Set(completed.map((unit) => unit.id));
  const next = stories.find((unit) => !completedIds.has(unit.id) && !lockedIds.has(unit.id));
  const due = stories.find((unit) => isReviewDue(readUnitProgress(userId, unit.id)));
  const checkpointFor = (id: string) => resumeLearningMode === 'adventure' ? id : `${id}:${resumeLearningMode}`;
  const resume = stories.find((unit) => unit.id === resumeUnitId && !lockedIds.has(unit.id) && (unit.routeTrick ? readTrickCheckpoint(userId, unit.id, unit.contentVersion ?? '1') : readGameCheckpoint(userId, checkpointFor(unit.id), unit.contentVersion ?? '1') || readMirrorCheckpoint(userId, checkpointFor(unit.id), unit.contentVersion ?? '1')));
  // Completion remembers the following stop before the learner presses Continue.
  // It has no checkpoint yet and must not send someone who stopped at mission 10 back to 1.
  const queued = stories.find((unit) => unit.id === resumeUnitId && !completedIds.has(unit.id) && !lockedIds.has(unit.id));
  const featured = resume ?? queued ?? next ?? due ?? stories[0];
  const featuredPresentation = featured ? journeyPresentation(featured) : null;
  const gameCheckpoint = resume ? readGameCheckpoint(userId, checkpointFor(resume.id), resume.contentVersion ?? '1') : null;
  const mirrorCheckpoint = resume ? readMirrorCheckpoint(userId, checkpointFor(resume.id), resume.contentVersion ?? '1') : null;
  const profile = loadLearningProfile(userId, units);
  const dueCount = profile.dueWords + profile.dueChunks + profile.dueSentences + profile.dueReviews;
  const wordMemories = readWordMemories(userId).filter((memory) => memory.correct > 0 && stories.some((unit) => unit.words?.some((word) => word.en.toLowerCase() === memory.word.en.toLowerCase())));
  const uniqueWords = [...new Map(wordMemories.map((memory) => [memory.word.en.toLowerCase(), memory])).values()];
  const conversations = new Set(activities.filter((item) => item.source === 'learner' && (item.phase === 'dialogue' || item.phase === 'transfer')).map((item) => item.unitId)).size;
  const conversationUnit = [...completed].reverse().find((unit) => unit.hasDialogue);
  const inviteArcade = Boolean(onArcade && uniqueWords.length && featured && (dueCount > 0 || shouldOfferMicroArcade(userId, featured.id)));
  const avatar = readAvatar(userId);
  const currentIndex = featured ? stories.findIndex((unit) => unit.id === featured.id) + 1 : 0;
  const missionLabel = featured?.routeTrick ? 'Un truco breve con palabras que ya has practicado' : resume ? gameCheckpoint ? activityLabels[gameCheckpoint.phase] : mirrorStageLabels[mirrorCheckpoint?.stage ?? 0] ?? 'Continúa esta actividad'
    : featured && completedIds.has(featured.id) ? 'Vuelve a practicar' : featuredPresentation?.pack ? 'Conecta y recuerda estas palabras' : 'Descubre esta historia';

  return <main className="journey-screen home-v2" id="inicio">
    <div className={`home-play-hub ${stories.length ? 'has-map' : ''}`}>
    <header className="journey-header home-header">
      <a className="journey-brand" href="#inicio" aria-label="Memora, ir al inicio"><span className="brand-mark">M</span><span>MEMORA</span></a>
      <nav className="home-nav" aria-label="Navegación principal">
        <a href="#inicio" aria-current="page">Inicio</a>
        <button type="button" onClick={onGrammar}>Gramática</button>
        <button type="button" onClick={onArcade} disabled={!onArcade}>Arcade</button>
        <button type="button" onClick={onEvolution} disabled={!onEvolution}>Mi evolución</button>
      </nav>
      <button type="button" className="home-profile" onClick={onProfile} aria-label="Abrir perfil y progreso">{avatar ? <img src={avatar} alt="" /> : <span aria-hidden="true">◉</span>}<span>{completed.length}/{stories.length} paradas</span></button>
      <button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button>
      <button type="button" className="journey-exit" onClick={onExit}>Salir</button>
    </header>

    {error ? <p className="journey-error" role="alert">{error}</p> : null}
    <div className="home-hub-content">
      <div className="home-intro"><div><h1>Tu aventura</h1><p className="home-catalogue" aria-label="Contenido disponible"><strong>{catalogue.words}</strong> {catalogue.words === 1 ? 'palabra en el catálogo' : 'palabras en el catálogo'}{catalogue.expressions > 0 ? <> · <strong>{catalogue.expressions}</strong> {catalogue.expressions === 1 ? 'expresión' : 'expresiones'}</> : null}</p></div><span>{completed.length} de {stories.length} paradas completadas</span></div>
      {stories.length ? <JourneyMap units={stories} currentId={featured?.id} completedIds={completedIds} lockedIds={lockedIds} onOpen={onOpen} /> : null}
    </div>
    </div>

    <div className="home-body">
      {featured ? <section className="home-adventure" aria-labelledby="home-adventure-title">
        <div className="home-adventure-art">{featuredPresentation?.pack ? <JourneyScene scene={featuredPresentation.scene} /> : <img src="/house-adventure.svg" alt="Ilustración de la Casa Viva: una puerta iluminada, un kiwi travieso y unas llaves escondidas" />}<span>{featuredPresentation?.place}</span></div>
        <div className="home-adventure-copy"><p className="eyebrow">{resume ? 'JUSTO DONDE LO DEJASTE' : `PARADA ${currentIndex} DE ${stories.length}`}</p><h2 id="home-adventure-title">{featuredPresentation?.title}</h2><p className="home-adventure-story">{featuredPresentation?.subtitle}</p>{featuredPresentation?.pack ? <p className="home-current-words" lang="en">{featuredPresentation.terms}</p> : null}<p className="home-current-step"><span aria-hidden="true">✦</span> {missionLabel}</p><button type="button" className="primary-action" onClick={() => onOpen(featured)}>{resume ? 'Continuar jugando' : readUnitProgress(userId, featured.id) ? 'Volver a jugar' : featuredPresentation?.pack ? 'Descubrir palabras' : 'Empezar misión'} <span aria-hidden="true">→</span></button><div className="home-adventure-progress"><div role="progressbar" aria-label="Misiones completadas del mundo" aria-valuemin={0} aria-valuemax={stories.length} aria-valuenow={completed.length}><span style={{ width: `${stories.length ? completed.length / stories.length * 100 : 0}%` }} /></div><small>{completed.length}/{stories.length} misiones de este recorrido</small></div></div>
      </section> : <section className="journey-empty"><h2>La aventura está preparándose.</h2><p>Aún no hay una misión publicada.</p>{onTryPreview ? <button type="button" className="primary-action" onClick={onTryPreview}>Probar la experiencia →</button> : null}</section>}

      <section className="home-modes" aria-label="Elige cómo aprender"><div className="home-section-heading"><p className="eyebrow">ELIGE TU MOMENTO</p><h2>¿Qué te apetece hacer?</h2></div><div className="home-mode-grid">
        <button type="button" className="home-mode home-mode-words" onClick={onWords}><span aria-hidden="true">◈</span><strong>Aprender palabras</strong><small>Historias absurdas que se quedan contigo.</small><b aria-hidden="true">↗</b></button>
        <button type="button" className="home-mode home-mode-arcade" onClick={onArcade} disabled={!onArcade}><span aria-hidden="true">✦</span><strong>Arcade</strong><small>Recuerda las palabras con sus asociaciones.</small><b aria-hidden="true">↗</b></button>
        <button type="button" className="home-mode home-mode-chat" onClick={onGrammar} disabled={!onGrammar}><span aria-hidden="true">◌</span><strong>Gramática fácil</strong><small>Trucos y frases con tus palabras aprendidas.</small><b aria-hidden="true">↗</b></button>
      </div>{conversationUnit ? <button type="button" className="home-text-button" onClick={() => onConverse(conversationUnit)}>Volver a mi conversación conocida →</button> : null}</section>

      {inviteArcade ? <aside className="home-arcade-invite" aria-label="Invitación a Arcade"><div><p className="eyebrow">UNA RONDA OPCIONAL</p><h2>¿Aún recuerdas la escena?</h2><p>{dueCount ? `${dueCount} ${dueCount === 1 ? 'recuerdo espera' : 'recuerdos esperan'} una vuelta rápida.` : 'Una asociación corta para cambiar el ritmo.'} Puedes volver a la historia cuando quieras.</p></div><button type="button" onClick={onArcade}>Jugar una ronda <span aria-hidden="true">↗</span></button></aside> : null}

      <section className="home-progress" aria-label="Tu progreso real"><div><strong>{uniqueWords.length}</strong><span>palabras recordadas</span></div><div><strong>{conversations}</strong><span>{conversations === 1 ? 'escena conversada' : 'escenas conversadas'}</span></div><div><strong>{dueCount}</strong><span>{dueCount === 1 ? 'repaso pendiente' : 'repasos pendientes'}</span></div><button type="button" onClick={onEvolution} disabled={!onEvolution}>Ver Mi evolución <span aria-hidden="true">→</span></button></section>

      <section className="home-library" id="palabras" aria-labelledby="home-words-title"><div className="home-section-heading"><p className="eyebrow">TUS PALABRAS</p><h2 id="home-words-title">Cada palabra guarda una historia.</h2><p>Vuelve a una misión para descubrir nuevas asociaciones o recordar las que ya conoces.</p></div>{uniqueWords.length ? <div className="home-word-list">{(showAllWords ? uniqueWords : uniqueWords.slice(0, 8)).map((memory) => <span key={memory.key}><strong lang="en">{memory.word.en}</strong><small>{memory.word.es}</small></span>)}</div> : <p className="home-empty-copy">Todavía no hay palabras recordadas. Empieza una historia y pronto aparecerán aquí.</p>}{uniqueWords.length > 8 ? <button type="button" className="home-text-button" onClick={() => setShowAllWords((value) => !value)}>{showAllWords ? 'Mostrar menos' : `Ver todas las ${uniqueWords.length} palabras`}</button> : null}{(next ?? featured) ? <button type="button" className="home-text-button" onClick={onWords}>{next ? 'Descubrir palabras en la siguiente misión →' : 'Volver a una historia →'}</button> : null}</section>

      {onManageContent || onFusionDemo || onGrammarReview || onMirror ? <details className="home-tools"><summary>Herramientas y pruebas</summary><div>{onManageContent ? <button type="button" onClick={onManageContent}>Gestionar contenido</button> : null}{onMirror ? <button type="button" onClick={onMirror}>Ficha Espejo</button> : null}{onGrammarReview ? <button type="button" onClick={onGrammarReview}>Revisar trucos</button> : null}{onFusionDemo ? <button type="button" onClick={onFusionDemo}>Laboratorio TURN</button> : null}</div></details> : null}
    </div>
  </main>;
}
