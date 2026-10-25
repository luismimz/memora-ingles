import { ScreenHeading } from './ScreenHeading';
import { NavigationMenu } from './NavigationMenu';
import { useState } from 'react';
import { readGameCheckpoint, readMirrorCheckpoint } from '../domain/gameCheckpoint';
import { isReviewDue, readUnitProgress } from '../domain/journey';
import { readLearningActivities } from '../domain/learningActivity';
import { loadLearningProfile } from '../domain/learningProfile';
import { isKnownForDirection, readWordMemories } from '../domain/memory';
import { catalogueStats } from '../domain/catalogueStats';
import { completedVocabularyStop, journeyPresentation } from '../domain/journeyMap';
import { JourneyMap } from './JourneyMap';
import type { UnitSummary } from '../services/directus';
import type { Appearance } from '../useAppearance';
import type { LearningMode } from '../domain/game';
import './homeGuided.css';
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

/** One way forward. Maps, practice modes and evidence are secondary, not competing starts. */
export function JourneyHome(props: Props) {
  const { units, userId, resumeUnitId, error, onOpen, onConverse, onArcade, onManageContent,
    onFusionDemo, onGrammarReview, onEvolution, onMirror, onTryPreview, onExit, onProfile,
    appearance, onToggleAppearance, onWords, onGrammar, resumeLearningMode = 'adventure' } = props;
  const [showAllWords, setShowAllWords] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const catalogue = catalogueStats(units);
  const memories = readWordMemories(userId);
  const stories = buildJourneyRoute(units, memories);
  const lockedIds = new Set(stories.filter((stop) => missingTrickWords(stop, memories, userId).length).map((stop) => stop.id));
  const knownUnitIds = new Set(stories.flatMap((unit) => [unit.id, ...(unit.routeTrick ? [unit.routeTrick.sourceId] : [])]));
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
  const retainedWords = uniqueWords.filter((memory) => isKnownForDirection(memory, 'recall') || isKnownForDirection(memory, 'production'));
  const conversations = new Set(activities.filter((item) => item.source === 'learner' && (item.phase === 'dialogue' || item.phase === 'transfer')).map((item) => item.unitId)).size;
  const conversationUnit = [...completed].reverse().find((unit) => unit.hasDialogue && activities.some((activity) => activity.unitId === unit.id && activity.source === 'learner' && activity.correct === true && ['dialogue', 'transfer'].includes(activity.phase)));
  const trickCheckpoint = resume?.routeTrick ? readTrickCheckpoint(userId, resume.id, resume.contentVersion ?? '1') : null;
  const currentIndex = featured ? stories.findIndex((unit) => unit.id === featured.id) + 1 : 0;
  const missionLabel = featured?.routeTrick ? trickCheckpoint?.continuation?.phase === 'build' ? 'Monta tu mensaje' : trickCheckpoint?.continuation?.phase === 'conversation' ? 'Responde al personaje' : 'Descubre cómo decirlo' : resume ? gameCheckpoint ? gameCheckpoint.phase === 'recall' && gameCheckpoint.recognitionStyle === 'scene-delivery-v1' ? 'Lleva la palabra a su escena' : activityLabels[gameCheckpoint.phase] ?? 'Retoma esta práctica' : mirrorStageLabels[mirrorCheckpoint?.stage ?? 0] ?? 'Continúa esta actividad'
    : featured && completedIds.has(featured.id) ? 'Vuelve a practicar' : featuredPresentation?.pack ? 'Conecta y recuerda estas palabras' : 'Descubre esta historia';

  return <main className="journey-screen home-v2 home-guided" id="inicio">
    <header className="home-guided-header">
      <a className="journey-brand" href="#inicio" aria-label="Memora, ir al inicio"><span className="brand-mark">M</span><span>MEMORA</span></a>
      <NavigationMenu label="Navegación principal">
        <button type="button" onClick={onProfile}>Perfil y ajustes</button>
        <button type="button" onClick={onEvolution} disabled={!onEvolution}>Mi evolución</button>
        <button type="button" onClick={onToggleAppearance}>Activar modo {appearance === 'light' ? 'oscuro' : 'claro'}</button>
        <button type="button" onClick={onExit}>Salir</button>
      </NavigationMenu>
    </header>
    {error ? <p className="journey-error" role="alert">{error}</p> : null}
    <div className="home-guided-body">
      {featured ? <section className="home-now" aria-labelledby="home-adventure-title">
        <div className="home-now-context"><span>{resume ? 'Actividad en curso' : completedIds.has(featured.id) ? 'Práctica conocida' : 'Tu siguiente paso'}</span><small aria-label={`Paso ${currentIndex} de ${stories.length}`}>{`${currentIndex} / ${stories.length}`}</small></div>
        <div className="home-now-main"><ScreenHeading id="home-adventure-title">{missionLabel}</ScreenHeading><p className="home-now-place">{featuredPresentation?.title}</p>
          <button type="button" className="primary-action home-continue" onClick={() => onOpen(featured)}>{completedIds.has(featured.id) && !resume ? 'Volver a practicar' : 'Continuar jugando'} <span aria-hidden="true">→</span></button>
          <details className="home-about"><summary>Qué voy a hacer</summary><p>{featuredPresentation?.subtitle}</p><p>{resume ? 'Tu actividad y tus ayudas siguen donde las dejaste.' : 'Te enseñamos antes de pedirte una respuesta.'}</p></details>
        </div>
      </section> : <section className="journey-empty"><ScreenHeading>La aventura está preparándose.</ScreenHeading><p>Aún no hay una misión publicada.</p>{onTryPreview ? <button type="button" className="primary-action" onClick={onTryPreview}>Probar la experiencia →</button> : null}</section>}
        <details className="home-progress"><summary><span>Tu progreso</span><small>{uniqueWords.length ? `${uniqueWords.length} ${uniqueWords.length === 1 ? 'palabra' : 'palabras'} con práctica registrada` : 'Tu primera historia empieza aquí.'}</small></summary><div className="home-evidence-content">
          <p>{retainedWords.length} palabras con recuperaciones sin pistas registradas · {conversations} escenas conversadas · {dueCount} oportunidades de repaso. No equivale a dominio.</p>
          {uniqueWords.length ? <div className="home-word-list">{(showAllWords ? uniqueWords : uniqueWords.slice(0, 8)).map((memory) => <span key={memory.key}><strong lang="en">{memory.word.en}</strong><small>{memory.word.es}</small></span>)}</div> : <p>Todavía no hay práctica de palabras registrada.</p>}
          {uniqueWords.length > 8 ? <button type="button" className="home-text-button" onClick={() => setShowAllWords((value) => !value)}>{showAllWords ? 'Mostrar menos' : `Ver todas las ${uniqueWords.length} palabras`}</button> : null}
          <button type="button" className="home-text-button" onClick={onEvolution} disabled={!onEvolution}>Ver Mi evolución →</button>
        </div></details>
      <details className="home-explore"><summary>Explorar</summary><div className="home-secondary" aria-label="Apoyos opcionales">
        {stories.length ? <details className="home-map-panel" onToggle={(event) => setShowMap(event.currentTarget.open)}><summary>Ver mi recorrido <small>Ubicarme o elegir otra parada</small></summary>{showMap ? <><p>{completed.length} paradas completadas. El catálogo contiene {catalogue.words} palabras y {catalogue.expressions} expresiones; no son palabras aprendidas.</p><JourneyMap units={stories} currentId={featured?.id} completedIds={completedIds} lockedIds={lockedIds} onOpen={onOpen} onLockedOpen={onOpen} /></> : null}</details> : null}
        <details className="home-practice-panel"><summary>Practicar por mi cuenta <small>Opcional · no hace falta para continuar</small></summary><nav className="home-practice-links" aria-label="Práctica libre">
          <button type="button" onClick={onWords} disabled={!onWords}>Aprender palabras</button><button type="button" onClick={onGrammar} disabled={!onGrammar}>Gramática</button><button type="button" onClick={onArcade} disabled={!onArcade}>Arcade</button>
          {conversationUnit ? <button type="button" onClick={() => onConverse(conversationUnit)}>Volver a una conversación conocida</button> : null}
        </nav></details>
      </div></details>
      {onManageContent || onFusionDemo || onGrammarReview || onMirror ? <details className="home-tools"><summary>Herramientas y pruebas</summary><div>{onManageContent ? <button type="button" onClick={onManageContent}>Gestionar contenido</button> : null}{onMirror ? <button type="button" onClick={onMirror}>Ficha Espejo</button> : null}{onGrammarReview ? <button type="button" onClick={onGrammarReview}>Revisar trucos</button> : null}{onFusionDemo ? <button type="button" onClick={onFusionDemo}>Laboratorio TURN</button> : null}</div></details> : null}
    </div>
  </main>;
}
