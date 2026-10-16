import { useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { lessonForForm } from '../domain/grammarLesson';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { recordSession } from '../domain/learningProfile';
import { clearTrickCheckpoint, readTrickCheckpoint, writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { GrammarCoach } from './GrammarCoach';
import { GameCard } from './GameCard';
import { stopSpeech } from '../services/audio';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import type { Appearance } from '../useAppearance';

export function JourneyTrickExperience({ unit, stop, userId, inspection, onFinished, onNext, onExit, syncStatus, appearance, onToggleAppearance }: {
  unit: AtomicUnit; stop: UnitSummary; userId: string; inspection: boolean; onFinished: () => void; onNext: () => void; onExit: () => void;
  syncStatus: SyncStatus; appearance: Appearance; onToggleAppearance: () => void;
}) {
  const trick = stop.routeTrick!;
  const form = unit.grammar.find((candidate) => candidate.id === trick.formId);
  const base = unit.words.find((word) => word.en.toLowerCase() === form?.englishBase?.toLowerCase())?.es.toLowerCase();
  const lesson = form ? lessonForForm(form, base) : null;
  const [checkpoint] = useState(() => inspection ? null : readTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1'));
  const [finished, setFinished] = useState(false);
  const completed = useRef(false);
  const started = useRef(new Date().toISOString());
  function finish() {
    if (completed.current) return;
    completed.current = true;
    stopSpeech();
    if (!inspection) {
      // Attempts stay attached to the real source unit, not a fictitious Directus record.
      const now = new Date().toISOString();
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `trick-completed:${trick.formId}`, skill: trick.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: trick.title, response: 'Truco practicado con palabras preparadas.', expected: '', correct: null, helped: false });
      const attempts = readLearningActivities(userId).filter((activity) => activity.unitId === unit.id && activity.skill === trick.skill && activity.at >= started.current && activity.source === 'learner' && activity.correct !== null);
      recordSession(userId, { unitId: unit.id, completedAt: now, correct: attempts.filter((activity) => activity.correct).length, attempted: attempts.length });
      clearTrickCheckpoint(userId, stop.id);
      onFinished();
    }
    setFinished(true);
  }
  return <main className="game-screen journey-trick">
    <header className="game-topbar"><button type="button" className="activity-back" onClick={() => { stopSpeech(); onExit(); }}>← Recorrido</button><span>✦ PARADA TRUCO</span><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button></header>
    <p className="mirror-save" role="status">{inspection ? 'Vista de prueba · no guarda progreso' : syncLabels[syncStatus]}</p>
    {!finished && lesson ? <h1 className="sr-only">{trick.title}</h1> : null}
    <section className="game-stage">{!lesson ? <GameCard><h1>Este truco necesita revisión.</h1><p>Tu progreso se conserva. Puedes seguir con las palabras.</p><button type="button" onClick={onNext}>Continuar con las palabras →</button></GameCard> : finished ? <GameCard className="complete-card"><div className="complete-content"><div className="reward-burst" aria-hidden="true">✦</div><p className="eyebrow">UNA PIEZA MÁS</p><h1>¡Tus palabras ya dicen algo nuevo!</h1><p>{trick.title}</p><p>Una práctica, no una promesa de dominio. Tus intentos quedan en Mi evolución.</p><button type="button" className="primary-action" onClick={onNext}>Continuar jugando →</button><button type="button" className="quiet-action" onClick={onExit}>Terminar por hoy</button></div></GameCard> : <GrammarCoach lesson={lesson} form={form} userId={userId} unitId={unit.id} unitTitle={unit.title} contentVersion={unit.contentVersion ?? '1'} reviewMode={inspection} requirePractice schedulePractice checkpoint={checkpoint} onProgress={(state) => { if (!inspection && !completed.current) writeTrickCheckpoint(userId, stop.id, unit.contentVersion ?? '1', state); }} onReady={() => {}} onContinue={finish} />}</section>
  </main>;
}
