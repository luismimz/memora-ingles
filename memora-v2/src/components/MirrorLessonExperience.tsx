import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { mirrorText } from '../domain/mirrorLesson';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { recordUnitProgress } from '../domain/journey';
import { recordSession } from '../domain/learningProfile';
import { recordWordRecall } from '../domain/memory';
import { clearMirrorCheckpoint, readMirrorCheckpoint, writeMirrorCheckpoint } from '../domain/gameCheckpoint';
import { nextReviewAt } from '../domain/unit';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import { playEnglish, playSpanish, playSnap, stopSpeech } from '../services/audio';
import type { Appearance } from '../useAppearance';
import { GameCard } from './GameCard';
import { MirrorQuestion, MirrorRow, MirrorText } from './MirrorPieces';
import { MirrorWriteTest } from './MirrorWriteTest';
import { ConversationPractice } from './ConversationPractice';
import { PlayBeachScene } from './PlayBeachScene';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import './mirror.css';

const stages = ['Descubrir', 'Español espejo', 'Comparar', 'Probar', 'Conversar', 'Recordar', 'Completado'] as const;
/** One data-driven vertical experience. It uses Memora's real event journal, chat and SRS. */
export function MirrorLessonExperience({ unit, userId, grammarOnly = false, inspection, syncStatus, onExit, onNext, nextLabel, onEvolution, onPractice, appearance, onToggleAppearance }: { unit: AtomicUnit; userId: string; grammarOnly?: boolean; inspection: boolean; syncStatus: SyncStatus; onExit: () => void; onNext: () => void; nextLabel: string; onEvolution: () => void; onPractice?: () => void; appearance: Appearance; onToggleAppearance: () => void }) {
  const checkpointId = grammarOnly ? `${unit.id}:grammar` : unit.id;
  const lesson = unit.mirror!;
  const [checkpoint] = useState(() => inspection ? null : readMirrorCheckpoint(userId, checkpointId, unit.contentVersion ?? '1'));
  const [stage, setStage] = useState(checkpoint?.stage ?? 0);
  const [person, setPerson] = useState(checkpoint?.person ?? false);
  const [reveal, setReveal] = useState(checkpoint?.reveal ?? 0);
  const [index, setIndex] = useState(checkpoint && checkpoint.index < lesson.examples.length ? checkpoint.index : 0);
  const [questionReady, setQuestionReady] = useState(checkpoint?.questionReady ?? false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set(checkpoint?.seen.filter((item) => item < lesson.examples.length) ?? [0]));
  const started = useRef(checkpoint?.startedAt ?? new Date().toISOString());
  const completed = useRef(false);
  const example = lesson.examples[index];
  const first = lesson.examples[0];
  const test = lesson.examples.find((value) => value.id === lesson.testExampleId)!;
  const nextUnseen = lesson.examples.findIndex((_, i) => !seen.has(i));
  const move = (next: number) => { stopSpeech(); setStage(next); };
  useEffect(() => () => stopSpeech(), []);
  useEffect(() => {
    if (inspection) return;
    if (stage === 6) clearMirrorCheckpoint(userId, checkpointId);
    else writeMirrorCheckpoint(userId, checkpointId, unit.contentVersion ?? '1', { stage, person, reveal, index, questionReady, seen: [...seen], startedAt: started.current });
  }, [inspection, stage, person, reveal, index, questionReady, seen, unit.contentVersion, checkpointId, userId]);
  function authored(activityId: string, response: string) {
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId, skill: lesson.id, phase: 'grammar', source: 'authored', modality: 'choice', prompt: lesson.novelty, response, expected: '', correct: null, helped: true, feedback: 'Descubrimiento guiado, no una prueba de dominio.' });
  }
  function finish() {
    if (completed.current) return;
    completed.current = true;
    if (!inspection) {
      const now = new Date();
      const attempts = readLearningActivities(userId).filter((attempt) => attempt.unitId === unit.id && attempt.at >= started.current && attempt.source === 'learner' && attempt.correct !== null);
      const result = { correct: attempts.filter((attempt) => attempt.correct).length, attempted: attempts.length, completedAt: now.toISOString(), nextReviewAt: nextReviewAt(now, 0).toISOString() };
      if (!grammarOnly) recordUnitProgress(userId, unit.id, result);
      recordSession(userId, { ...result, unitId: unit.id });
      const recall = attempts.filter((attempt) => attempt.activityId === 'mirror-recall').at(-1);
      recordWordRecall(userId, unit.words[0], recall?.helped ? 'hesitant' : 'quick', now, 'production', undefined, recall?.helped ?? true);
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: 'mirror-complete', skill: lesson.id, phase: 'completion', source: 'learner', modality: 'writing', prompt: lesson.novelty, response: 'Ficha practicada: traducción, conversación y recuperación.', expected: '', correct: null, helped: false, feedback: 'La primera práctica no demuestra retención a largo plazo. Las frases quedan programadas para repasar.' });
    }
    move(6);
  }
  return <main className="game-screen mirror-screen">
    <header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Inicio</button><span>FICHA ESPEJO · {stages[stage]}</span><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button></header>
    <progress className="mirror-progress" aria-label="Recorrido de la ficha espejo" max={6} value={stage} />
    <p className="mirror-save" role="status">{inspection ? 'Vista de revisión · no guarda progreso' : syncLabels[syncStatus]}</p>
    <section className="game-stage">
      {stage === 4 && questionReady ? <ConversationPractice unit={unit} userId={userId} reviewMode={inspection} onContinue={() => move(5)} /> : <GameCard className="mirror-card"><div className="mirror-content">
        {stage === 0 ? <><p className="eyebrow">VER → DESCUBRIR</p><h1>Hay una pieza escondida.</h1><div className="mirror-discovery"><span className={`mirror-silhouette ${person ? 'is-revealed' : ''}`} aria-label={person ? 'YO, la persona revelada' : 'Persona escondida'}>{person ? 'YO' : <svg viewBox="0 0 50 68" aria-hidden="true"><circle cx="25" cy="17" r="12" /><path d="M7 65V43Q7 31 25 31T43 43V65Z" /></svg>}</span><span>Estoy jugando.</span></div>
          {!person ? <button type="button" className="primary-action" onClick={() => { setPerson(true); playSnap(); authored('mirror-discover-person', 'YO'); void playSpanish(lesson.discovery); }}>Revelar la pieza escondida</button> : <><p className="mirror-discovery-tip">{lesson.discovery}</p><button type="button" className="primary-action" onClick={() => move(1)}>Ver las piezas →</button></>}
          {!grammarOnly ? <div className="mirror-memory">{unit.words[0].en === 'PLAY' && unit.words[0].bridge === 'PLAYA' ? <PlayBeachScene /> : <SceneVisual word={unit.words[0]} />}<p><MnemonicSceneText word={unit.words[0]} /></p><button type="button" className="quiet-action" onClick={() => void playEnglish(unit.words[0].en)}>{unit.words[0].bridge} → {unit.words[0].en} → {unit.words[0].es.toUpperCase()} · 🔊</button><small>El puente ayuda a recordar; escucha la palabra para aprender su sonido.</small></div> : null}
        </> : null}
        {stage === 1 ? <><p className="eyebrow">ESPAÑOL ESPEJO</p><h1>Las mismas piezas, a la vista.</h1><div className="mirror-board"><div className="mirror-row"><small>Español natural</small><p className="mirror-natural">{first.natural}</p></div>{reveal >= 1 ? <MirrorRow pieces={first.mirror} label="Español espejo · hacemos visible YO" language="es" /> : null}{reveal >= 2 ? <MirrorRow pieces={first.english} label="Inglés" language="en" /> : null}</div>
          {reveal >= 2 ? <div className="mirror-legend"><span className="mirror-person">Persona</span><span className="mirror-auxiliary">Estar</span><span className="mirror-action">Acción</span></div> : null}
          {reveal >= 3 ? <p className="mirror-contract"><MirrorText text="I am" lesson={lesson} /> → <MirrorText text="I'm" lesson={lesson} /><small>Se juntan al hablar; significa lo mismo.</small><button type="button" className="quiet-action" onClick={() => void playEnglish(first.contracted)}>🔊 Escuchar {first.contracted}</button></p> : null}
          <button type="button" className="primary-action" onClick={() => { if (reveal < 3) { setReveal(reveal + 1); authored(`mirror-reveal-${reveal + 1}`, reveal === 0 ? mirrorText(first.mirror) : reveal === 1 ? mirrorText(first.english) : first.contracted); if (reveal === 1) void playEnglish(mirrorText(first.english)); } else move(2); }}>{reveal === 0 ? 'Mostrar español espejo' : reveal === 1 ? 'Mostrar inglés' : reveal === 2 ? 'Juntar I + am' : 'Comparar acciones →'}</button>
        </> : null}
        {stage === 2 ? <><p className="eyebrow">COMPARAR</p><h1>Solo cambia la acción.</h1><div className="mirror-tabs" role="tablist" aria-label="Comparar tres acciones">{lesson.examples.map((value, i) => <button type="button" role="tab" id={`example-${i}`} aria-controls="mirror-example" aria-selected={i === index} tabIndex={i === index ? 0 : -1} key={value.id} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + lesson.examples.length) % lesson.examples.length; setIndex(next); setSeen((current) => new Set([...current, next])); document.getElementById(`example-${next}`)?.focus(); } }} onClick={() => { setIndex(i); setSeen((current) => new Set([...current, i])); authored(`mirror-compare-${value.id}`, mirrorText(value.english)); }}>{value.natural.replace('Estoy ', '').replace('.', '')}{seen.has(i) ? <span aria-label="visto"> ✓</span> : null}</button>)}</div>
          <div className="mirror-board" role="tabpanel" id="mirror-example" aria-labelledby={`example-${index}`}><div className="mirror-row"><small>Español natural</small><p className="mirror-natural">{example.natural}</p></div><MirrorRow pieces={example.mirror} label="Español espejo" language="es" /><MirrorRow pieces={example.english} label="Inglés" language="en" onListen={() => void playEnglish(example.contracted)} /></div><p className="mirror-rule">{lesson.scope}</p><button type="button" className="primary-action" onClick={() => { if (nextUnseen < 0) move(3); else { setIndex(nextUnseen); setSeen((current) => new Set([...current, nextUnseen])); authored(`mirror-compare-${lesson.examples[nextUnseen].id}`, mirrorText(lesson.examples[nextUnseen].english)); } }}>{nextUnseen < 0 ? 'Probar sin el modelo →' : 'Ver otra acción →'}</button>
        </> : null}
        {stage === 3 ? <MirrorWriteTest key="test" unit={unit} example={test} lesson={lesson} userId={userId} inspection={inspection} activityId="mirror-test" nextLabel={grammarOnly ? "Usar otra acción →" : "Preparar la conversación →"} onSuccess={() => { if (grammarOnly) { move(5); return; } authored('mirror-question-model', mirrorText(lesson.question.en)); move(4); }} /> : null}
        {stage === 4 && !questionReady ? <><p className="eyebrow">CONVERSAR · ESCUCHA PRIMERO</p><h1>Emma quiere saber qué haces.</h1><MirrorQuestion lesson={lesson} /><button type="button" className="quiet-action" onClick={() => void playEnglish(mirrorText(lesson.question.en))}>🔊 Escuchar a Emma</button><p className="mirror-rule">Hoy solo necesitas reconocer esta pregunta y responder. Ya has comparado «Estoy trabajando».</p><button type="button" className="primary-action" onClick={() => setQuestionReady(true)}>Entrar en la conversación →</button></> : null}
        {stage === 5 ? <MirrorWriteTest key="recall" unit={unit} example={first} lesson={lesson} userId={userId} inspection={inspection} activityId="mirror-recall" nextLabel="Terminar ficha →" recall onSuccess={finish} /> : null}
        {stage === 6 ? <><p className="eyebrow">FICHA COMPLETADA</p><h1>Ya has dicho qué estás haciendo.</h1><p>{grammarOnly ? "Has practicado el patrón con palabras preparadas y has escrito otra frase." : "Has escrito, conversado y recuperado una frase sin el modelo inicial."}</p><p className="mirror-rule">{inspection ? 'Esta revisión no guarda intentos. Para conservarlos, entra con tu cuenta y abre el piloto sin preview.' : 'Las frases quedan en Mi evolución y vuelven a aparecer en el repaso. Practicar una vez no significa dominarlas todavía.'}</p><button type="button" className="primary-action" onClick={onNext}>{nextLabel}</button>{onPractice ? <button type="button" className="arcade-invitation" onClick={onPractice}>✦ Arcade de asociaciones</button> : null}<button type="button" className="quiet-action" onClick={onEvolution}>{inspection ? 'Volver al inicio' : 'Ver mis intentos'}</button><button type="button" className="quiet-action" onClick={onExit}>Terminar por hoy</button></> : null}
      </div></GameCard>}
    </section>
  </main>;
}
