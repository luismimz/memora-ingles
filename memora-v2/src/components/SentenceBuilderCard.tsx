import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import type { AtomicWord, GrammarForm, UnitSentence } from '../domain/unit';
import { playMiss, playSnap, stopSpeech } from '../services/audio';
import { constructionFeedback } from '../domain/sentenceConstruction';
import { constructionRole } from '../domain/constructionRole';
import { SpeechModelButton } from './SpeechModelButton';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { GrammarText } from './GrammarText';
import './sentencePreparation.css';

function showProcess(text: string, word: string, stem: string, ending: string): ReactNode {
  const position = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if (position < 0 || !ending) return text;
  return <>{text.slice(0, position)}<span className="builder-process"><span className="morph-root">{stem}</span><span className="morph-intent">{ending}</span></span>{text.slice(position + word.length)}</>;
}

export function SentenceBuilderCard({ sentence, vocabulary = [], sceneWord, processForm, index, total, filledSlots, choiceSeed, onPick, onNext, onAttempt, preparationStep: savedPreparationStep, onPreparationChange, needsModel = false, modelUsed = false, lastIncorrectChoice, onAcceptModel, vertical = false, grammarHelp, compactPreparation = false, onPreparationReview }: {
  sentence: UnitSentence;
  vocabulary?: readonly AtomicWord[];
  sceneWord: AtomicWord;
  processForm: GrammarForm;
  index: number;
  total: number;
  filledSlots: number;
  choiceSeed: number;
  onPick: () => void;
  onNext: () => void;
  onAttempt?: (choice: string, correct: boolean, slotIndex: number) => void | false;
  needsModel?: boolean; modelUsed?: boolean; lastIncorrectChoice?: string; onAcceptModel?: () => void; vertical?: boolean;
  preparationStep?: number;
  onPreparationChange?: (step: number) => void; grammarHelp?: ReactNode;
  compactPreparation?: boolean; onPreparationReview?: () => void;
}) {
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{ slot: number; choice: string } | null>(null);
  const playback = useSpeechPlayback();
  const [preparation, setPreparation] = useState({ slot: filledSlots, step: 0 });
  const [connection, setConnection] = useState<string>();
  const wrongTimer = useRef<number | null>(null);
  const answeredSlot = useRef(-1);
  const board = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; choice: string; slot: number; x: number; y: number; left: number; top: number; width: number; moved: boolean }>();
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ choice: string; left: number; top: number; width: number; over: boolean }>();
  useEffect(() => () => { if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current); }, []);

  const completed = filledSlots === sentence.slots.length;
  const observedResult = useRef({ sentence: sentence.en, completed });
  const active = sentence.slots[filledSlots];
  const connectionKey = `${index}:${filledSlots}`;
  const connectionOpen = connection === connectionKey;
  const literal = (text: string) => text.trim().replace(/[.!?,;:]+$/, '').toLocaleLowerCase();
  const connectionExplanation = active?.note ?? active?.preparation?.find((step) => literal(step.en) === literal(active.en))?.explanation;
  const baseSpanish = vocabulary.find((word) => word.en.toLowerCase() === processForm.englishBase?.toLowerCase())?.es ?? (sceneWord.en.toLowerCase() === processForm.englishBase?.toLowerCase() ? sceneWord.es : undefined);
  const pieceRole = (text: string, language: 'en' | 'es') => constructionRole(text, processForm, language, baseSpanish);
  const errorChoice = lastIncorrectChoice ?? (lastError?.slot === filledSlots ? lastError.choice : undefined);
  const errorText = active && errorChoice !== undefined ? constructionFeedback(sentence, filledSlots, errorChoice, vocabulary) : '';
  const preparationIndex = savedPreparationStep !== undefined
    ? Number.isInteger(savedPreparationStep) && savedPreparationStep >= 0 && savedPreparationStep <= (active?.preparation?.length ?? 0) ? savedPreparationStep : 0
    : preparation.slot === filledSlots ? preparation.step : 0;
  const preparationStep = compactPreparation ? undefined : active?.preparation?.[preparationIndex];
  const options = active && (choiceSeed + filledSlots) % 2 ? [...active.choices].reverse() : active?.choices;
  const listenToSentence = () => playback.listen(sentence.en);
  useEffect(() => { setConnection(undefined); }, [sentence.en, filledSlots]);
  useEffect(() => { gesture.current = undefined; setDrag(undefined); }, [sentence.en, filledSlots, preparationIndex, needsModel]);
  useEffect(() => {
    playback.reset();
    // Only narrate a completion observed here, never a restored result.
    const previous = observedResult.current;
    observedResult.current = { sentence: sentence.en, completed };
    if (completed && previous.sentence === sentence.en && !previous.completed) void listenToSentence();
    return () => { playback.reset(); stopSpeech(); };
  }, [completed, sentence.en, filledSlots, preparationIndex, needsModel]);

  function choose(choice: string) {
    if (!active || completed || needsModel || preparationStep || answeredSlot.current === filledSlots || !active.choices.includes(choice)) return;
    if (onAttempt?.(choice, choice === active.en, filledSlots) === false) return;
    if (choice !== active.en) {
      setLastError({ slot: filledSlots, choice });
      setWrongChoice(choice);
      playMiss();
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrongChoice(null), 450);
      return;
    }
    setWrongChoice(null);
    setLastError(null);
    answeredSlot.current = filledSlots;
    playSnap();
    onPick();
  }

  function overTarget(event: PointerEvent<HTMLButtonElement>) {
    const hit = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest('[data-builder-drop]');
    return Boolean(hit && board.current?.contains(hit));
  }
  function beginDrag(event: PointerEvent<HTMLButtonElement>, choice: string) {
    if (completed || needsModel || preparationStep || event.isPrimary === false || event.button > 0) return;
    suppressClick.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    const parent = board.current?.getBoundingClientRect();
    gesture.current = { id: event.pointerId, choice, slot: filledSlots, x: event.clientX, y: event.clientY, left: rect.left - (parent?.left ?? 0), top: rect.top - (parent?.top ?? 0), width: rect.width, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - value.x, event.clientY - value.y) < 8 && !value.moved) return;
    value.moved = true;
    setDrag({ choice: value.choice, left: value.left + event.clientX - value.x, top: value.top + event.clientY - value.y, width: value.width, over: overTarget(event) });
  }
  function cancelDrag() {
    if (gesture.current?.moved) suppressClick.current = true;
    gesture.current = undefined; setDrag(undefined);
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const value = gesture.current;
    if (!value || value.id !== event.pointerId) return;
    const place = value.moved && value.slot === filledSlots && overTarget(event);
    cancelDrag();
    if (place) choose(value.choice);
  }

  const advancePreparation = () => { stopSpeech(); setPreparation({ slot: filledSlots, step: preparationIndex + 1 }); onPreparationChange?.(preparationIndex + 1); };
  const preparationAdvanceLabel = preparationIndex === (active?.preparation?.length ?? 0) - 1 ? 'Usar estas piezas →' : 'Ver la siguiente pieza →';
  const sentenceAdvanceLabel = index === total - 1 ? 'Usar mi frase →' : 'Siguiente frase →';
  const continueSentence = () => { playback.reset(); stopSpeech(); onNext(); };
  return <GameCard feedback={completed ? modelUsed ? 'model' : 'correct' : needsModel ? 'model' : errorText ? 'retry' : undefined} key={index} vertical={vertical} stepKey={`${index}:${filledSlots}:${preparationIndex}:${needsModel ? 'model' : 'task'}`} onAdvance={vertical ? preparationStep ? advancePreparation : completed ? continueSentence : undefined : completed ? continueSentence : undefined} advanceLabel={vertical ? preparationStep ? preparationAdvanceLabel : sentenceAdvanceLabel : ''} reserveFooter={!vertical} revealFooter={Boolean(preparationStep && vertical || completed)}>
    <div ref={board} className={`builder-content builder-workbench${drag ? ' is-dragging' : ''}`}>
      <p className="eyebrow">{completed ? modelUsed ? 'CON APOYO' : '✓ FRASE ARMADA' : preparationStep ? 'DESCUBRE' : needsModel ? 'CON AYUDA' : 'CONSTRUYE'} · {index + 1}/{total}</p>
      {!completed ? <SceneVisual word={sceneWord} compact /> : null}
      <h1>{showProcess(sentence.es, processForm.spanish, processForm.spanishStem, processForm.spanishEnding)}</h1>
      <div className={`sentence-rail ${completed ? 'is-complete' : ''}`} role="group" aria-label="Correspondencia del español con el inglés">
        {sentence.slots.map((slot, slotIndex) => <div data-builder-drop={slotIndex === filledSlots && !preparationStep && !needsModel ? '' : undefined} data-connection-active={connectionOpen && slotIndex === filledSlots} data-piece-role={pieceRole(slot.en, 'en')} className={`sentence-slot ${slotIndex === filledSlots ? 'is-active' : ''} ${slotIndex < filledSlots ? 'is-filled' : ''}${slotIndex === filledSlots && drag?.over ? ' is-drop-over' : ''}`} key={`${slotIndex}-${slot.en}`}>
          <span className="sentence-slot-es">{slot.es}</span>
          <span className="sentence-slot-en">{slotIndex < filledSlots ? slot.en : slotIndex === filledSlots && !preparationStep && !needsModel ? '↓' : '· · ·'}</span>
        </div>)}
      </div>
      {!completed && preparationStep ? <div className="slot-preparation">
        <p className="eyebrow">PREPARA ESTA PIEZA · {preparationIndex + 1}/{active.preparation!.length}</p>
        <p className="coach-row" lang="es">{preparationStep.es}</p>
        <p className="coach-row" lang="en">{preparationStep.en}</p>
        <p className="coach-caption">{preparationStep.explanation}</p>
        <SpeechModelButton key={`${index}:${filledSlots}:${preparationIndex}:prepare`} text={preparationStep.en} label="Escuchar la pieza" />
        {!vertical ? <button type="button" className="primary-action" onClick={advancePreparation}>{preparationAdvanceLabel}</button> : null}
      </div> : !completed && active && needsModel ? <div className="slot-preparation" role="status"><p>Vamos con ayuda. Para «{active.es}» coloca:</p><p className="coach-row" lang="en">{active.en}</p><p>Queda como modelo consultado, no como acierto.</p><SpeechModelButton key={`${index}:${filledSlots}:repair`} text={active.en} label="Escuchar la pieza" /><button type="button" className="primary-action" onClick={onAcceptModel}>Colocar con ayuda</button></div> : !completed && active ? <div className="slot-picker">
        <div className="builder-target"><small>Une español e inglés</small><h2 lang="es" data-piece-role={pieceRole(active.es, 'es')}>{active.es}</h2></div>
        {!(compactPreparation && active.preparation?.length) && active.note ? <p className="builder-note">{active.note}</p> : null}
        {errorText ? <p className="slot-feedback" role="status">{errorText}</p> : null}
        <div className="slot-options" role="group" aria-label={`Piezas para «${active.es}». Toca o arrastra al hueco.`}>{options?.map((choice) => <button type="button" data-piece-role={pieceRole(choice, 'en')} key={choice} lang="en" onPointerDown={(event) => beginDrag(event, choice)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onClick={(event) => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; } choose(choice); }} className={`${wrongChoice === choice ? 'is-wrong' : ''}${drag?.choice === choice ? ' is-lifted' : ''}`}>{choice}</button>)}</div>
        <p className="builder-touch-cue">Toca o arrastra al hueco ↑</p>
        {compactPreparation && active.preparation?.length ? <div className="familiar-piece">
          <details key={connectionKey} onToggle={(event) => { const open = event.currentTarget.open; setConnection(open ? connectionKey : undefined); if (open) onPreparationReview?.(); }}><summary>Cómo encaja esta pieza</summary>
            <div className="familiar-model" role="group" aria-label="Conexión de la pieza activa" data-piece-role={pieceRole(active.en, 'en')}><span lang="es">{active.es}</span><span aria-hidden="true">→</span><strong lang="en">{active.en}</strong></div>
            {connectionExplanation ? <p className="builder-note">{connectionExplanation}</p> : null}
            <SpeechModelButton key={`${index}:${filledSlots}:familiar`} text={sentence.en} label="Escuchar esta pieza en la frase" idleLabel="Escuchar en la frase" />
            {active.preparation?.length ? <details className="piece-teaching-detail"><summary>Ver todas las piezas</summary><ol>{active.preparation.map((step, position) => <li key={position}><p><span lang="es">{step.es}</span><span lang="en">{step.en}</span></p><p>{step.explanation}</p></li>)}</ol></details> : null}
          </details>
        </div> : null}
      </div> : <div className="builder-finish" aria-live="polite">
        <h2 className="builder-message" lang="en"><GrammarText text={sentence.en} form={processForm} /></h2>
        <p role="status">{modelUsed ? 'Frase armada con ayuda. Ya puedes usarla.' : 'Frase armada. Ya puedes usarla.'}</p>
        <button type="button" className="quiet-action" aria-label="Escuchar la frase" aria-busy={playback.audio?.status === 'preparing'} onClick={() => void listenToSentence()}>
          🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : 'Escuchar la frase'}
        </button>
        <AssociationAudioStatus compact state={playback.audio} />
        {!vertical ? <button type="button" className="primary-action" onClick={continueSentence}>{sentenceAdvanceLabel}</button> : null}
      </div>}
      {drag ? <span aria-hidden="true" className="builder-drag-piece" data-piece-role={pieceRole(drag.choice, 'en')} style={{ left: drag.left, top: drag.top, width: drag.width }}>{drag.choice}</span> : null}
      {grammarHelp ? <div className="builder-grammar-help">{grammarHelp}</div> : null}
    </div>
  </GameCard>;
}
