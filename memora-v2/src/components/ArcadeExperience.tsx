import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { getPlayableGrammar } from '../domain/unit';
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
import { missingGrammarWords } from '../domain/learningModes';
import { separatedArcadeUnits } from '../domain/arcadeCadence';
import { bedMakingLesson } from '../domain/bedMakingPractice';
import { computerPlayingLesson, computerPlayingSkill } from '../domain/computerPlayingPractice';
import { dinnerCookingLesson, dinnerCookingSkill } from '../domain/dinnerCookingPractice';
import { kitchenLocationSkill } from '../domain/kitchenLocationPractice';
import { teethBrushingLesson, teethBrushingSkill } from '../domain/teethBrushingPractice';
import { mirrorLocationSkill } from '../domain/mirrorLocationPractice';
import { dogWalkingLesson, dogWalkingSkill } from '../domain/dogWalkingPractice';
import { treeLocationSkill } from '../domain/treeLocationPractice';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';

export function eligibleGrammarUnits(userId: string, units: AtomicUnit[]): AtomicUnit[] {
  const practiced = new Set([...readGrammarAttempts(userId).filter((attempt) => attempt.correct).map((attempt) => attempt.unitId),
    ...readLearningActivities(userId).filter((attempt) => attempt.phase === 'construction' && attempt.correct).map((attempt) => attempt.unitId)]);
  return units.filter((unit) => practiced.has(unit.id) && grammarArcadeRounds(userId, [unit]).length > 0);
}
export const eligibleMixedUnits = (userId: string, units: AtomicUnit[]) => {
  const activities = readLearningActivities(userId);
  const memories = readWordMemories(userId);
  return eligibleGrammarUnits(userId, units).filter((unit) => {
    const dialogue = unit.communication?.dialogue;
    if (!dialogue || missingGrammarWords(unit, memories).length) return false;
    // A short prepared mission does not prepare WITH A PILLOW in its legacy
    // sibling. Keep that manual mixed conversation gated by its own response.
    const legacyBed = bedMakingLesson(unit, 'ing');
    const legacyComputer = computerPlayingLesson(unit, 'ing');
    const legacyDinner = dinnerCookingLesson(unit, 'ing');
    const legacyTeeth = teethBrushingLesson(unit, 'ing');
    const legacyDog = dogWalkingLesson(unit, 'ing');
    const legacyAnswers = legacyBed || legacyComputer || legacyDinner || legacyTeeth || legacyDog ? new Set(dialogue.turns.filter((turn) => turn.role === 'B').flatMap((turn) => [turn.en, ...turn.acceptedAnswers]).map(normalizeSentenceAnswer)) : null;
    return activities.some((activity) => activity.unitId === unit.id && activity.source === 'learner' && activity.correct === true && ['dialogue', 'transfer'].includes(activity.phase)
      && (!legacyComputer || activity.skill !== computerPlayingSkill)
      && (!legacyDinner || ![dinnerCookingSkill, kitchenLocationSkill].includes(activity.skill))
      && (!legacyTeeth || ![teethBrushingSkill, mirrorLocationSkill].includes(activity.skill))
      && (!legacyDog || ![dogWalkingSkill, treeLocationSkill].includes(activity.skill))
      && (!legacyAnswers || activity.contentVersion === (unit.contentVersion ?? '1') && legacyAnswers.has(normalizeSentenceAnswer(activity.response))));
  });
};

function ArcadeDialog({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => { current?.close(); stopSpeech(); }; }, []);
  return <dialog ref={dialog} className="micro-dialog" aria-label="Memora Arcade" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen micro-screen"><header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Volver donde estaba</button><span>MEMORA ARCADE</span></header><section className="game-stage">{children}</section></div></dialog>;
}

/** Optional modes share the same attempts, SRS and conversation history. */
export function ArcadeExperience({ userId, units: sourceUnits, inspection, onExit, initialMode = 'associations', automatic = false }: { userId: string; units: AtomicUnit[]; inspection: boolean; onExit: () => void; initialMode?: 'associations' | 'grammar'; automatic?: boolean }) {
  // Freeze a prepared pool for this session; answering one round must not erase
  // its own feedback or change the next round underneath the learner.
  const [units] = useState(() => automatic && !inspection ? separatedArcadeUnits(sourceUnits, readLearningActivities(userId)) : sourceUnits);
  const [stage, setStage] = useState<'associations' | 'grammar' | 'build' | 'chat' | 'finish'>(() => initialMode === 'grammar' && (inspection || eligibleGrammarUnits(userId, units).length) ? 'grammar' : 'associations');
  const [mixed, setMixed] = useState(false);
  const [selected, setSelected] = useState<AtomicUnit>(() => (inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units))[0]);
  const [filled, setFilled] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const previous = useRef<string>();
  const completedRounds = useRef(0);
  const available = inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units);
  const grammarUnits = inspection ? units : eligibleGrammarUnits(userId, units);
  function advanceRound(completed: number) {
    completedRounds.current = completed;
    if (automatic) return;
    if (completed % 5 || completed % 15 === 0 || !grammarUnits.length || mixed) return;
    setStage((current) => current === 'grammar' ? 'associations' : 'grammar');
  }
  const anotherRound = () => { const index = available.findIndex((unit) => unit.id === selected?.id); setSelected(available[(index + 1) % available.length]); setFilled(0); previous.current = undefined; setStage('associations'); };
  if (stage === 'grammar') return <ArcadeDialog onExit={onExit}><GrammarArcade units={grammarUnits} userId={userId} inspection={inspection} onExit={onExit} onWords={() => setStage('associations')} initialRound={completedRounds.current} onRoundAdvance={advanceRound} automatic={automatic} /></ArcadeDialog>;
  if (stage === 'associations') return <MicroArcade userId={userId} units={mixed && selected ? [selected] : units} inspection={inspection} onExit={onExit} onUse={mixed && selected ? () => setStage('build') : undefined} onOnlyWords={mixed && selected ? () => setMixed(false) : undefined} onMix={!automatic && !mixed && selected ? () => setMixed(true) : undefined} onGrammar={!automatic && grammarUnits.length ? () => setStage('grammar') : undefined} initialRound={completedRounds.current} onRoundAdvance={advanceRound} automatic={automatic} />;
  if (stage === 'build' && selected) return <ArcadeDialog onExit={onExit}><SentenceBuilderCard sentence={selected.sentence} sceneWord={selected.words[0]} processForm={getPlayableGrammar(selected)[0]} index={0} total={1} filledSlots={filled} choiceSeed={1} onAttempt={(choice, correct, slotIndex) => {
    if (!inspection) { const slot = selected.sentence.slots[slotIndex]; const attempt = recordLearningActivity(userId, { unitId: selected.id, unitTitle: selected.title, contentVersion: selected.contentVersion ?? '1', activityId: `micro:${sessionId}:build:${slotIndex}`, skill: selected.grammar[0].id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, parentAttemptId: previous.current, feedback: correct ? 'Pieza recuperada con opciones.' : 'Compara las piezas y prueba otra vez.' }); previous.current = correct ? undefined : attempt.id; }
  }} onPick={() => { if (!inspection) { recordChunkExposure(userId, selected.id, selected.sentence, filled); if (filled === selected.sentence.slots.length - 1) recordSentenceExposure(userId, selected.id, selected.sentence); } setFilled((value) => value + 1); }} onNext={() => setStage('chat')} /></ArcadeDialog>;
  if (stage === 'chat' && selected) return <ArcadeDialog onExit={onExit}><ConversationPractice unit={selected} userId={userId} reviewMode={inspection} checkpointScope={`arcade:${sessionId}`} onContinue={() => setStage('finish')} /></ArcadeDialog>;
  return <ArcadeDialog onExit={onExit}><GameCard className="micro-card"><div className="micro-content"><p className="eyebrow">ASOCIAR → USAR → CONVERSAR</p><h1>¡Lo has usado!</h1>{inspection ? <small>Demostración · no guarda progreso</small> : null}
    <button type="button" className="primary-action" onClick={anotherRound}>Continuar →</button><button type="button" className="quiet-action" onClick={() => { setMixed(false); anotherRound(); }}>Solo palabras</button><button type="button" className="quiet-action" onClick={onExit}>Volver donde estaba</button>
  </div></GameCard></ArcadeDialog>;
}
