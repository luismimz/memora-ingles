import { useState } from 'react';
import { isReviewDue, journeySteps, readUnitProgress } from '../domain/journey';
import { loadLearningProfile, personalRank, readAvatar } from '../domain/learningProfile';
import type { UnitSummary } from '../services/directus';
import type { Appearance } from '../useAppearance';

export function JourneyHome({ units, userId, resumeUnitId, error, onOpen, onArcade, onManageContent, onFusionDemo, onGrammarReview, onEvolution, onMirror, onTryPreview, onExit, onProfile, appearance, onToggleAppearance }: {
  units: UnitSummary[];
  userId: string;
  resumeUnitId?: string | null;
  error?: string | null;
  onOpen: (unit: UnitSummary) => void;
  onArcade?: () => void;
  onManageContent?: () => void;
  onFusionDemo?: () => void;
  onGrammarReview?: () => void;
  onEvolution?: () => void;
  onMirror?: () => void;
  onTryPreview?: () => void;
  onExit: () => void;
  onProfile: () => void;
  appearance: Appearance;
  onToggleAppearance: () => void;
}) {
  const [showAllStories, setShowAllStories] = useState(false);
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const orderedUnits = journeySteps.map((step) => byId.get(step.id)).filter((unit): unit is UnitSummary => Boolean(unit));
  const orderedIds = new Set(orderedUnits.map((unit) => unit.id));
  const playableUnits = [...orderedUnits, ...units.filter((unit) => !orderedIds.has(unit.id))];
  const dueUnit = playableUnits.find((unit) => isReviewDue(readUnitProgress(userId, unit.id)));
  const nextUnit = playableUnits.find((unit) => !readUnitProgress(userId, unit.id));
  const resumeUnit = playableUnits.find((item) => item.id === resumeUnitId);
  const featured = resumeUnit ?? dueUnit ?? nextUnit ?? playableUnits[0];
  const featuredProgress = featured ? readUnitProgress(userId, featured.id) : null;
  const profile = loadLearningProfile(userId, units);
  const duePieces = profile.dueWords + profile.dueChunks + profile.dueSentences;
  const rank = personalRank(profile.activeDays);
  const avatar = readAvatar(userId);
  const completedUnits = playableUnits.filter((unit) => readUnitProgress(userId, unit.id));
  const completedScenes = completedUnits.length;
  const learnedWords = new Set(completedUnits.flatMap((unit) => unit.words ?? []).map((word) => word.en.trim().toLocaleLowerCase('en-US'))).size;
  const needsArcade = duePieces > 0 && Boolean(onArcade);
  const hasLearningHistory = completedScenes > 0 || learnedWords > 0;
  const actionTitle = needsArcade ? `${duePieces} ${duePieces === 1 ? 'pieza vuelve' : 'piezas vuelven'}` : featured?.title;
  const actionLabel = resumeUnit ? 'Volver a la historia' : needsArcade ? 'Repasar ahora' : dueUnit ? 'Repasar ahora' : featuredProgress ? 'Continuar' : 'Empezar';
  const actionEyebrow = resumeUnit ? 'TE QUEDASTE AQUÍ' : needsArcade || dueUnit ? 'TOCA RECORDAR' : featuredProgress ? 'SIGUE POR AQUÍ' : 'EMPIEZA POR AQUÍ';
  const actionCopy = resumeUnit ? 'Esta es la última historia que abriste. Puedes retomarla o elegir otra debajo.' : needsArcade ? 'Una ráfaga corta. Memora ya eligió qué necesitas.' : dueUnit ? 'Es buen momento para recuperar esta escena.' : featuredProgress ? 'Vuelve a practicar esta historia.' : 'Una escena corta. Sin elegir lecciones.';
  const runPrimaryAction = () => { if (!resumeUnit && needsArcade && onArcade) onArcade(); else if (featured) onOpen(featured); };
  const continueUnit = needsArcade ? nextUnit : null;

  return <main className="journey-screen">
    <header className="journey-header"><a className="journey-brand" href="/" aria-label="Ir al inicio"><span className="brand-mark">M</span><span>MEMORA</span></a><nav className="journey-menu" aria-label="Navegación principal"><a href="/" aria-current="page">Inicio</a>{onEvolution ? <button type="button" onClick={onEvolution}>Mi evolución</button> : null}<button type="button" onClick={onProfile}>{avatar ? <img src={avatar} alt="" /> : null}<span>Perfil</span></button>{onArcade ? <button type="button" onClick={onArcade}>Arcade</button> : null}{onFusionDemo ? <button type="button" onClick={onFusionDemo}>TURN · laboratorio</button> : null}{onManageContent ? <button type="button" onClick={onManageContent}>Contenido</button> : null}</nav><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`} title={`Modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><button type="button" className="journey-exit" onClick={onExit}>Salir</button></header>
    {onMirror ? <nav className="review-nav" aria-label="Ficha Espejo disponible"><button type="button" onClick={onMirror}>Ficha Espejo · Estoy jugando →</button><small>Un truco, tres acciones y una conversación</small></nav> : null}
    {error ? <p className="journey-error" role="alert">{error}</p> : null}
    {onGrammarReview ? <nav className="review-nav" aria-label="Revisión de gramática"><button type="button" onClick={onGrammarReview}>Probar los trucos gramaticales</button><small>Solo revisión</small></nav> : null}
    <div className="journey-home-body">{actionTitle ? <section className={`journey-focus ${hasLearningHistory ? '' : 'is-first-visit'}`} aria-label="Tu única acción recomendada"><div className="journey-focus-copy"><p className="eyebrow">{actionEyebrow}</p><h1>{actionTitle}</h1><p>{actionCopy}</p><button type="button" className="primary-action" onClick={runPrimaryAction}>{actionLabel} →</button></div>{hasLearningHistory ? <div className="journey-focus-stats" aria-label="Tu progreso"><p className="eyebrow">MUNDO 1 · LA CASA VIVA</p><div><strong>{completedScenes}</strong><span>escenas vividas</span></div><div><strong>{learnedWords}</strong><span>palabras practicadas</span></div><small>{profile.activeDays} {profile.activeDays === 1 ? 'día activo' : 'días activos'} · {rank.name}</small></div> : null}</section> : <section className="journey-empty"><p>Aún no hay una escena publicada.</p>{onTryPreview ? <button type="button" className="primary-action" onClick={onTryPreview}>Empezar la experiencia →</button> : null}</section>}
    {hasLearningHistory ? <nav className="journey-shortcuts" aria-label="Accesos rápidos">
      {onArcade && !needsArcade ? <button type="button" onClick={onArcade}><span aria-hidden="true">✦</span><strong>Arcade</strong><small>Práctica rápida</small></button> : null}
      {continueUnit ? <button type="button" onClick={() => onOpen(continueUnit)}><span aria-hidden="true">→</span><strong>Seguir</strong><small>{continueUnit.title}</small></button> : null}
      <button type="button" onClick={onProfile}><span aria-hidden="true">◌</span><strong>Mi progreso</strong><small>Memoria y constancia</small></button>
    </nav> : null}
    {playableUnits.length ? <section className="journey-stories" aria-label="Historias disponibles"><div className="journey-stories-heading"><div><p className="eyebrow">HISTORIAS DE LA CASA</p><p>También puedes volver directamente a cualquier escena.</p></div><span>{completedScenes}/{playableUnits.length} vividas</span></div><div className="journey-story-list">{(showAllStories ? playableUnits : playableUnits.slice(0, 5)).map((story, index) => { const completed = Boolean(readUnitProgress(userId, story.id)); return <button type="button" className={story.id === featured?.id ? 'is-next' : ''} key={story.id} onClick={() => onOpen(story)}><small>{completed ? '✓ VIVIDA' : `HISTORIA ${index + 1}`}</small><strong>{story.title}</strong>{story.words?.length ? <span>{story.words.map((word) => word.en).join(' · ')}</span> : null}{story.sentence?.en ? <em>{story.sentence.en}</em> : null}</button>; })}</div>{playableUnits.length > 5 ? <button type="button" className="journey-stories-toggle" onClick={() => setShowAllStories((visible) => !visible)}>{showAllStories ? 'Ver menos historias' : `Ver las ${playableUnits.length - 5} historias restantes`}</button> : null}</section> : null}</div>
  </main>;
}
