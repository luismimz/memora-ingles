import { useEffect, useRef, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { getPlayableGrammar } from '../domain/unit';
import { readWordMemories, recordChunkExposure, recordSentenceExposure } from '../domain/memory';
import { readGrammarAttempts } from '../domain/grammarMemory';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { MicroArcade } from './MicroArcade';
import { canReusePiecePreparation, piecePreparationKey } from '../domain/piecePreparation';
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
import { meatCookingLesson, meatCookingSkill } from '../domain/meatCookingPractice';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { constructionFeedback } from '../domain/sentenceConstruction';

export function eligibleGrammarUnits(userId: string, units: AtomicUnit[]): AtomicUnit[] {
  const practiced = new Set([...readGrammarAttempts(userId).filter((attempt) => attempt.correct).map((attempt) => attempt.unitId),
    ...readLearningActivities(userId).filter((attempt) => attempt.phase === 'construction' && attempt.correct).map((attempt) => attempt.unitId)]);
  return units.filter((unit) => practiced.has(unit.id) && grammarArcadeRounds(userId, [unit], false, units).length > 0);
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
    const legacyMeat = meatCookingLesson(unit, 'ing');
    const legacyAnswers = legacyBed || legacyComputer || legacyDinner || legacyTeeth || legacyDog || legacyMeat ? new Set(dialogue.turns.filter((turn) => turn.role === 'B').flatMap((turn) => [turn.en, ...turn.acceptedAnswers]).map(normalizeSentenceAnswer)) : null;
    return activities.some((activity) => activity.unitId === unit.id && activity.source === 'learner' && activity.correct === true && ['dialogue', 'transfer'].includes(activity.phase)
      && (!legacyComputer || activity.skill !== computerPlayingSkill)
      && (!legacyDinner || ![dinnerCookingSkill, kitchenLocationSkill].includes(activity.skill))
      && (!legacyTeeth || ![teethBrushingSkill, mirrorLocationSkill].includes(activity.skill))
      && (!legacyDog || ![dogWalkingSkill, treeLocationSkill].includes(activity.skill))
      && (!legacyMeat || activity.skill !== meatCookingSkill)
      && (!legacyAnswers || activity.contentVersion === (unit.contentVersion ?? '1') && legacyAnswers.has(normalizeSentenceAnswer(activity.response))));
  });
};

function ArcadeDialog({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => { current?.close(); stopSpeech(); }; }, []);
  return <dialog ref={dialog} className="micro-dialog" aria-label="Memora Arcade" onCancel={(event) => { event.preventDefault(); onExit(); }}><div className="game-screen play-flow micro-screen arcade-stream-screen"><header className="game-topbar play-header arcade-header"><button type="button" className="activity-back" onClick={onExit}>← Recorrido</button><span className="play-intention">Arcade</span></header><section className="game-stage">{children}</section></div></dialog>;
}

/** Optional modes share the same attempts, SRS and conversation history. */
export function ArcadeExperience({ userId, units: sourceUnits, inspection, onExit, initialMode = 'associations', automatic = false }: { userId: string; units: AtomicUnit[]; inspection: boolean; onExit: () => void; initialMode?: 'associations' | 'grammar'; automatic?: boolean }) {
  // Freeze a prepared pool for this session; answering one round must not erase
  // its own feedback or change the next round underneath the learner.
  const [units] = useState(() => automatic && !inspection ? separatedArcadeUnits(sourceUnits, readLearningActivities(userId)) : sourceUnits);
  const [stage, setStage] = useState<'associations' | 'grammar' | 'build' | 'chat'>(() => initialMode === 'grammar' && (inspection || eligibleGrammarUnits(userId, units).length) ? 'grammar' : 'associations');
  const [mixed, setMixed] = useState(false);
  const [selected, setSelected] = useState<AtomicUnit>(() => (inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units))[0]);
  const [filled, setFilled] = useState(0);
  const [preparationHelp, setPreparationHelp] = useState(false);
  const [, refreshBuild] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const previous = useRef<string>();
  const completedRounds = useRef(0);
  const available = inspection ? units.filter((unit) => unit.communication?.dialogue) : eligibleMixedUnits(userId, units);
  const grammarUnits = inspection ? units : eligibleGrammarUnits(userId, units);
  const buildKey = `${selected?.id}:${filled}`;
  const buildGuard = useRef({ key: buildKey, failures: 0, placed: false, choice: undefined as string | undefined });
  if (buildGuard.current.key !== buildKey) buildGuard.current = { key: buildKey, failures: 0, placed: false, choice: undefined };
  function attemptPiece(choice: string, correct: boolean, slotIndex: number): false | void {
    const guard = buildGuard.current, slot = selected?.sentence.slots[slotIndex];
    if (stage !== 'build' || guard.key !== buildKey || guard.placed || guard.failures >= 2 || slotIndex !== filled || !slot?.choices.includes(choice) || correct !== (choice === slot.en)) return false;
    if (!correct) { guard.failures++; guard.choice = choice; refreshBuild((value) => value + 1); }
    if (!inspection) {
      const attempt = recordLearningActivity(userId, { unitId: selected.id, unitTitle: selected.title, contentVersion: selected.contentVersion ?? '1', activityId: `micro:${sessionId}:build:${slotIndex}`, skill: selected.grammar[0].id, phase: 'construction', source: 'learner', modality: 'choice', prompt: slot.es, response: choice, expected: slot.en, correct, helped: true, pieceSignature: piecePreparationKey(slot, getPlayableGrammar(selected)[0]), parentAttemptId: previous.current, feedback: constructionFeedback(selected.sentence, slotIndex, choice, selected.words) });
      previous.current = correct ? undefined : attempt.id;
    }
  }
  function placePiece(withModel = false) {
    const guard = buildGuard.current, slot = selected?.sentence.slots[filled];
    if (stage !== 'build' || guard.key !== buildKey || guard.placed || !slot || (withModel ? guard.failures < 2 : guard.failures >= 2)) return;
    guard.placed = true;
    if (withModel) setPreparationHelp(true);
    if (!inspection) {
      if (withModel) recordLearningActivity(userId, { unitId: selected.id, unitTitle: selected.title, contentVersion: selected.contentVersion ?? '1', activityId: `micro:${sessionId}:build-model:${filled}`, skill: selected.grammar[0].id, phase: 'construction', source: 'authored', modality: 'choice', prompt: slot.es, response: slot.en, expected: '', correct: null, helped: true, parentAttemptId: previous.current, feedback: 'Pieza colocada con modelo; no es un acierto.' });
      recordChunkExposure(userId, selected.id, selected.sentence, filled);
      if (filled === selected.sentence.slots.length - 1) recordSentenceExposure(userId, selected.id, selected.sentence);
    }
    previous.current = undefined;
    setFilled((value) => value + 1);
  }
  function advanceRound(completed: number) {
    completedRounds.current = completed;
    if (automatic) return;
    if (completed % 5 || completed % 15 === 0 || !grammarUnits.length || mixed) return;
    setStage((current) => current === 'grammar' ? 'associations' : 'grammar');
  }
  const anotherRound = () => { const index = available.findIndex((unit) => unit.id === selected?.id); setSelected(available[(index + 1) % available.length]); setFilled(0); setPreparationHelp(false); previous.current = undefined; setStage('associations'); };
  if (stage === 'grammar') return <ArcadeDialog onExit={onExit}><GrammarArcade units={grammarUnits} userId={userId} inspection={inspection} onExit={onExit} onWords={() => setStage('associations')} initialRound={completedRounds.current} onRoundAdvance={advanceRound} automatic={automatic} /></ArcadeDialog>;
  if (stage === 'associations') return <MicroArcade userId={userId} units={mixed && selected ? [selected] : units} inspection={inspection} onExit={onExit} onUse={mixed && selected ? () => setStage('build') : undefined} onOnlyWords={mixed && selected ? () => setMixed(false) : undefined} onMix={!automatic && !mixed && selected ? () => setMixed(true) : undefined} onGrammar={!automatic && grammarUnits.length ? () => setStage('grammar') : undefined} initialRound={completedRounds.current} onRoundAdvance={advanceRound} automatic={automatic} />;
  if (stage === 'build' && selected) return <ArcadeDialog onExit={onExit}><SentenceBuilderCard modelUsed={Boolean(preparationHelp)} vertical vocabulary={selected.words} needsModel={buildGuard.current.failures >= 2} lastIncorrectChoice={buildGuard.current.choice} onAcceptModel={() => placePiece(true)} compactPreparation={!inspection && canReusePiecePreparation(readLearningActivities(userId), selected.sentence.slots[filled], getPlayableGrammar(selected)[0])} onPreparationReview={() => setPreparationHelp(true)} sentence={selected.sentence} sceneWord={selected.words[0]} processForm={getPlayableGrammar(selected)[0]} index={0} total={1} filledSlots={filled} choiceSeed={1} onAttempt={attemptPiece} onPick={() => placePiece()} onNext={() => { if (filled === selected.sentence.slots.length) setStage('chat'); }} /></ArcadeDialog>;
  if (stage === 'chat' && selected) return <ArcadeDialog onExit={onExit}><ConversationPractice vertical initialHelped={preparationHelp} unit={selected} userId={userId} reviewMode={inspection} checkpointScope={`arcade:${sessionId}`} onContinue={anotherRound} /></ArcadeDialog>;
  return <ArcadeDialog onExit={onExit}><GameCard vertical onAdvance={onExit} advanceLabel="Volver donde estaba" className="micro-card"><div className="micro-content"><h1>Esta escena no está disponible.</h1>{inspection ? <small>Demostración · no guarda progreso</small> : null}
  </div></GameCard></ArcadeDialog>;
}
