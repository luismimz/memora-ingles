import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { getPlayableGrammar } from '../domain/unit';
import { missingGrammarWords } from '../domain/learningModes';
import { readWordMemories, recordChunkExposure, recordSentenceExposure } from '../domain/memory';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { MicroArcade } from './MicroArcade';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { ConversationPractice } from './ConversationPractice';
import { GameCard } from './GameCard';
import { stopSpeech } from '../services/audio';
import { GrammarArcade } from './GrammarArcade';
import { grammarArcadeRounds } from '../domain/grammarArcadeRounds';

export function eligibleGrammarUnits(userId: string, units: AtomicUnit[]): AtomicUnit[] {
  const memories = readWordMemories(userId);
  const practiced = new Set([...readGrammarAttempts(userId).filter((attempt) => attempt.correct).map((attempt) => attempt.unitId),
    ...readLearningActivities(userId).filter((attempt) => attempt.phase === 'construction' && attempt.correct).map((attempt) => attempt.unitId)]);
  return units.filter((unit) => practiced.has(unit.id) && !missingGrammarWords(unit, memories).length && grammarArcadeRounds(userId, [unit]).length > 0);
}
export const eligibleMixedUnits = (userId: string, units: AtomicUnit[]) => eligibleGrammarUnits(userId, units).filter((unit) => unit.communication?.dialogue);

function ArcadeDialog({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => { current?.close(); stopSpeech(); }; }, []);
  return <dialog ref={dialog} className="micro-dialog" aria-label="Memora Arcade" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen micro-screen"><header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Volver donde estaba</button><span>MEMORA ARCADE</span></header><section className="game-stage">{children}</section></div></dialog>;
}

/** Optional modes share the same attempts, SRS and conversation history. */
export function ArcadeExperience({ userId, units, inspection, onExit, initialMode = 'associations' }: { userId: string; units: AtomicUnit[]; inspection: boolean; onExit: () => void; initialMode?: 'associations' | 'grammar' }) {
  const [stage, setStage] = useState<'associations' | 'grammar' | 'build' | 'chat' | 'finish'>(() => initialMode === 'grammar' && (inspection || eligibleGrammarUnits(userId, units).length) ? 'grammar' : 'associations');
  const [mixed, setMixed] = useState(false);
  const [selected, setSelected] = useState<AtomicUnit>(() => (inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units))[0]);
  const [filled, setFilled] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const previous = useRef<string>();
  const available = inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units);
  const grammarUnits = inspection ? units : eligibleGrammarUnits(userId, units);
  const anotherRound = () => { const index = available.findIndex((unit) => unit.id === selected?.id); setSelected(available[(index + 1) % available.length]); setFilled(0); previous.current = undefined; setStage('associations'); };
  if (stage === 'grammar') return <ArcadeDialog onExit={onExit}><GrammarArcade units={grammarUnits} userId={userId} inspection={inspection} onExit={onExit} onWords={() => setStage('associations')} /></ArcadeDialog>;
  if (stage === 'associations') return <MicroArcade userId={userId} units={mixed && selected ? [selected] : units} inspection={inspection} onExit={onExit} onUse={mixed && selected ? () => setStage('build') : undefined} onOnlyWords={mixed && selected ? () => setMixed(false) : undefined} onMix={!mixed && selected ? () => setMixed(true) : undefined} onGrammar={grammarUnits.length ? () => setStage('grammar') : undefined} />;
  if (stage === 'build' && selected) return <ArcadeDialog onExit={onExit}><SentenceBuilderCard sentence={selected.sentence} sceneWord={selected.words[0]} processForm={getPlayableGrammar(selected)[0]} index={0} total={1} filledSlots={filled} choiceSeed={1} onAttempt={(choice, correct, slotIndex) => {
    if (!inspection) { const slot = selected.sentence.slots[slotIndex]; const attempt = recordLearningActivity(userId, { unitId: selected.id, unitTitle: selected.title, contentVersion: selected.contentVersion ?? '1', activityId: `micro:${sessionId}:build:${slotIndex}`, skill: selected.grammar[0].id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, parentAttemptId: previous.current, feedback: correct ? 'Pieza recuperada con opciones.' : 'Compara las piezas y prueba otra vez.' }); previous.current = correct ? undefined : attempt.id; }
  }} onPick={() => { if (!inspection) { recordChunkExposure(userId, selected.id, selected.sentence, filled); if (filled === selected.sentence.slots.length - 1) recordSentenceExposure(userId, selected.id, selected.sentence); } setFilled((value) => value + 1); }} onNext={() => setStage('chat')} /></ArcadeDialog>;
  if (stage === 'chat' && selected) return <ArcadeDialog onExit={onExit}><ConversationPractice unit={selected} userId={userId} reviewMode={inspection} checkpointScope={`arcade:${sessionId}`} onContinue={() => setStage('finish')} /></ArcadeDialog>;
  return <ArcadeDialog onExit={onExit}><GameCard className="micro-card"><div className="micro-content"><p className="eyebrow">ASOCIAR → USAR → CONVERSAR</p><h1>¡Lo has usado!</h1>{inspection ? <small>Demostración · no guarda progreso</small> : null}
    <button type="button" className="primary-action" onClick={anotherRound}>Continuar →</button><button type="button" className="quiet-action" onClick={() => { setMixed(false); anotherRound(); }}>Solo palabras</button><button type="button" className="quiet-action" onClick={onExit}>Volver donde estaba</button>
  </div></GameCard></ArcadeDialog>;
}
