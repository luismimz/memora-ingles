import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import type { AtomicWord, GrammarForm, UnitSentence } from '../domain/unit';
import { playEnglish, playMiss, playSnap, stopSpeech, type PlaybackResult } from '../services/audio';
import { constructionFeedback } from '../domain/sentenceConstruction';
import { SpeechModelButton } from './SpeechModelButton';
import './sentencePreparation.css';

function showProcess(text: string, word: string, stem: string, ending: string): ReactNode {
  const position = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if (position < 0 || !ending) return text;
  return <>{text.slice(0, position)}<span className="builder-process"><span className="morph-root">{stem}</span><span className="morph-intent">{ending}</span></span>{text.slice(position + word.length)}</>;
}

export function SentenceBuilderCard({ sentence, vocabulary = [], sceneWord, processForm, index, total, filledSlots, choiceSeed, onPick, onNext, onAttempt, preparationStep: savedPreparationStep, onPreparationChange, needsModel = false, lastIncorrectChoice, onAcceptModel, vertical = false, grammarHelp }: {
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
  needsModel?: boolean; lastIncorrectChoice?: string; onAcceptModel?: () => void; vertical?: boolean;
  preparationStep?: number;
  onPreparationChange?: (step: number) => void; grammarHelp?: ReactNode;
}) {
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{ slot: number; choice: string } | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | PlaybackResult['status']>('idle');
  const audioRequest = useRef(0);
  const [preparation, setPreparation] = useState({ slot: filledSlots, step: 0 });
  const wrongTimer = useRef<number | null>(null);
  const answeredSlot = useRef(-1);
  useEffect(() => () => { if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current); }, []);

  const completed = filledSlots === sentence.slots.length;
  const observedResult = useRef({ sentence: sentence.en, completed });
  const active = sentence.slots[filledSlots];
  const errorChoice = lastIncorrectChoice ?? (lastError?.slot === filledSlots ? lastError.choice : undefined);
  const errorText = active && errorChoice !== undefined ? constructionFeedback(sentence, filledSlots, errorChoice, vocabulary) : '';
  const preparationIndex = savedPreparationStep !== undefined
    ? Number.isInteger(savedPreparationStep) && savedPreparationStep >= 0 && savedPreparationStep <= (active?.preparation?.length ?? 0) ? savedPreparationStep : 0
    : preparation.slot === filledSlots ? preparation.step : 0;
  const preparationStep = active?.preparation?.[preparationIndex];
  const options = active && (choiceSeed + filledSlots) % 2 ? [...active.choices].reverse() : active?.choices;
  async function listenToSentence() {
    const request = ++audioRequest.current;
    setAudioStatus('loading');
    const result = await Promise.resolve(playEnglish(sentence.en, undefined, true, () => {
      if (audioRequest.current === request) setAudioStatus('playing');
    })).catch(() => ({ status: 'unavailable' as const, source: null }));
    if (audioRequest.current === request) setAudioStatus(result?.status ?? 'unavailable');
  }
  useEffect(() => {
    setAudioStatus('idle');
    // Only narrate a completion observed here, never a restored result.
    const previous = observedResult.current;
    observedResult.current = { sentence: sentence.en, completed };
    if (completed && previous.sentence === sentence.en && !previous.completed) void listenToSentence();
    return () => { audioRequest.current++; stopSpeech(); };
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

  const advancePreparation = () => { stopSpeech(); setPreparation({ slot: filledSlots, step: preparationIndex + 1 }); onPreparationChange?.(preparationIndex + 1); };
  const preparationAdvanceLabel = preparationIndex === (active?.preparation?.length ?? 0) - 1 ? 'Usar estas piezas →' : 'Ver la siguiente pieza →';
  const sentenceAdvanceLabel = index === total - 1 ? 'Usar mi frase →' : 'Siguiente frase →';
  const continueSentence = () => { audioRequest.current++; stopSpeech(); onNext(); };
  return <GameCard key={index} vertical={vertical} stepKey={`${index}:${filledSlots}:${preparationIndex}:${needsModel ? 'model' : 'task'}`} onAdvance={vertical ? preparationStep ? advancePreparation : completed ? continueSentence : undefined : completed ? continueSentence : undefined} advanceLabel={vertical ? preparationStep ? preparationAdvanceLabel : sentenceAdvanceLabel : ''} reserveFooter={!vertical} revealFooter={Boolean(preparationStep && vertical || completed)}>
    <div className="builder-content">
      <p className="eyebrow">{completed ? '✓ FRASE ARMADA' : 'CONSTRUYE'} · {index + 1}/{total}</p>
      {!completed ? <SceneVisual word={sceneWord} compact /> : null}
      <h1>{showProcess(sentence.es, processForm.spanish, processForm.spanishStem, processForm.spanishEnding)}</h1>
      <div className={`sentence-rail ${completed ? 'is-complete' : ''}`} role="group" aria-label="Correspondencia del español con el inglés">
        {sentence.slots.map((slot, slotIndex) => <div className={`sentence-slot ${slotIndex === filledSlots ? 'is-active' : ''} ${slotIndex < filledSlots ? 'is-filled' : ''}`} key={`${slotIndex}-${slot.en}`}>
          <span className="sentence-slot-es">{slot.es}</span>
          <span className="sentence-slot-en">{slotIndex < filledSlots ? slot.en : slotIndex === filledSlots ? '¿…?' : '· · ·'}</span>
        </div>)}
      </div>
      {!completed && preparationStep ? <div className="slot-preparation">
        <p className="eyebrow">PREPARA ESTA PIEZA · {preparationIndex + 1}/{active.preparation!.length}</p>
        <p className="coach-row" lang="es">{preparationStep.es}</p>
        <p className="coach-row" lang="en">{preparationStep.en}</p>
        <p className="coach-caption">{preparationStep.explanation}</p>
        <SpeechModelButton key={`${index}:${filledSlots}:${preparationIndex}:prepare`} text={preparationStep.en} label="Escuchar la pieza" />
        {!vertical ? <button type="button" className="primary-action" onClick={advancePreparation}>{preparationAdvanceLabel}</button> : null}
      </div> : !completed && active && needsModel ? <div className="slot-preparation" role="status"><p>Vamos con ayuda. Para «{active.es}» coloca:</p><p className="coach-row" lang="en">{active.en}</p><p>Queda como modelo consultado, no como acierto.</p><SpeechModelButton key={`${index}:${filledSlots}:repair`} text={active.en} label="Escuchar la pieza" /><button type="button" className="primary-action" onClick={onAcceptModel}>Colocar con ayuda</button></div> : !completed && active ? <div className="slot-picker" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const choice = event.dataTransfer.getData('text/plain');
        if (active.choices.includes(choice)) choose(choice);
      }}>
        <div className="builder-target"><small>Coloca en inglés</small><h2 lang="es">{active.es}</h2></div>
        {active.note ? <p className="builder-note">{active.note}</p> : null}
        {errorText ? <p className="slot-feedback" role="status">{errorText}</p> : null}
        <div className="slot-options">{options?.map((choice) => <button type="button" key={choice} lang="en" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', choice)} onClick={() => choose(choice)} className={wrongChoice === choice ? 'is-wrong' : ''}>{choice}</button>)}</div>
      </div> : <div className="builder-finish" aria-live="polite"><p role="status">Frase armada. Ya puedes usarla.</p><button type="button" className="quiet-action" disabled={audioStatus === 'loading' || audioStatus === 'playing'} onClick={() => void listenToSentence()}>🔊 Escuchar la frase</button>{audioStatus === 'loading' || audioStatus === 'playing' ? <small>{audioStatus === 'loading' ? 'Preparando audio…' : 'Reproduciendo…'}</small> : ['blocked', 'unavailable', 'cancelled'].includes(audioStatus) ? <small>No se completó el audio. Puedes continuar.</small> : null}{!vertical ? <button type="button" className="primary-action" onClick={continueSentence}>{sentenceAdvanceLabel}</button> : null}</div>}
      {grammarHelp ? <div className="builder-grammar-help">{grammarHelp}</div> : null}
    </div>
  </GameCard>;
}
