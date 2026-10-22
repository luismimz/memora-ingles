import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import type { AtomicWord, GrammarForm, UnitSentence } from '../domain/unit';
import { playEnglish, playMiss, playSnap, stopSpeech } from '../services/audio';
import { constructionFeedback } from '../domain/sentenceConstruction';
import './sentencePreparation.css';

function showProcess(text: string, word: string, stem: string, ending: string): ReactNode {
  const position = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if (position < 0 || !ending) return text;
  return <>{text.slice(0, position)}<span className="builder-process"><span className="morph-root">{stem}</span><span className="morph-intent">{ending}</span></span>{text.slice(position + word.length)}</>;
}

export function SentenceBuilderCard({ sentence, vocabulary = [], sceneWord, processForm, index, total, filledSlots, choiceSeed, onPick, onNext, onAttempt, preparationStep: savedPreparationStep, onPreparationChange }: {
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
  onAttempt?: (choice: string, correct: boolean, slotIndex: number) => void;
  preparationStep?: number;
  onPreparationChange?: (step: number) => void;
}) {
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{ slot: number; choice: string } | null>(null);
  const [sentenceReady, setSentenceReady] = useState(false);
  const [preparation, setPreparation] = useState({ slot: filledSlots, step: 0 });
  const wrongTimer = useRef<number | null>(null);
  const answeredSlot = useRef(-1);
  useEffect(() => () => { if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current); }, []);

  const completed = filledSlots === sentence.slots.length;
  const active = sentence.slots[filledSlots];
  const errorText = active && lastError?.slot === filledSlots
    ? constructionFeedback(sentence, filledSlots, lastError.choice, vocabulary) : '';
  const preparationIndex = savedPreparationStep !== undefined
    ? Number.isInteger(savedPreparationStep) && savedPreparationStep >= 0 && savedPreparationStep <= (active?.preparation?.length ?? 0) ? savedPreparationStep : 0
    : preparation.slot === filledSlots ? preparation.step : 0;
  const preparationStep = active?.preparation?.[preparationIndex];
  const options = active && (choiceSeed + filledSlots) % 2 ? [...active.choices].reverse() : active?.choices;
  useEffect(() => {
    if (!completed) return undefined;
    let active = true;
    void playEnglish(sentence.en, undefined, true).finally(() => {
      if (active) setSentenceReady(true);
    });
    return () => { active = false; stopSpeech(); };
  }, [completed, sentence.en]);

  function choose(choice: string) {
    if (!active || completed || preparationStep || answeredSlot.current === filledSlots) return;
    onAttempt?.(choice, choice === active.en, filledSlots);
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

  return <GameCard key={index} onAdvance={completed && sentenceReady ? onNext : undefined} advanceLabel="" reserveFooter revealFooter={completed && sentenceReady}>
    <div className="builder-content">
      <p className="eyebrow">CONSTRUYE · {index + 1}/{total}</p>
      <SceneVisual word={sceneWord} compact />
      <h1>{showProcess(sentence.es, processForm.spanish, processForm.spanishStem, processForm.spanishEnding)}</h1>
      <div className={`sentence-rail ${completed ? 'is-complete' : ''}`} role="group" aria-label="Correspondencia del español con el inglés">
        {sentence.slots.map((slot, slotIndex) => <div className={`sentence-slot ${slotIndex === filledSlots ? 'is-active' : ''} ${slotIndex < filledSlots ? 'is-filled' : ''}`} key={`${slotIndex}-${slot.en}`}>
          <span className="sentence-slot-es">{slot.es}</span>
          <span className="sentence-slot-en">{slotIndex < filledSlots ? slot.en : slotIndex === filledSlots ? '¿…?' : '· · ·'}</span>
        </div>)}
      </div>
      {!completed && preparationStep ? <div className="slot-preparation">
        <p className="eyebrow">PREPARA ESTA PIEZA · {preparationIndex + 1}/{active.preparation!.length}</p>
        <p className="coach-caption">{preparationStep.explanation}</p>
        <p className="coach-row" lang="es">{preparationStep.es}</p>
        <p className="coach-row" lang="en">{preparationStep.en}</p>
        <button type="button" className="quiet-action" onClick={() => void playEnglish(preparationStep.en)}>🔊 Escuchar la pieza</button>
        <button type="button" className="primary-action" onClick={() => { stopSpeech(); setPreparation({ slot: filledSlots, step: preparationIndex + 1 }); onPreparationChange?.(preparationIndex + 1); }}>{preparationIndex === active.preparation!.length - 1 ? 'Usar estas piezas →' : 'Ver la siguiente pieza →'}</button>
      </div> : !completed && active ? <div className="slot-picker" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const choice = event.dataTransfer.getData('text/plain');
        if (active.choices.includes(choice)) choose(choice);
      }}>
        <p>Elige para «{active.es}»</p>
        {active.note ? <p className="builder-note">{active.note}</p> : null}
        {errorText ? <p className="slot-feedback" role="status">{errorText}</p> : null}
        <div className="slot-options">{options?.map((choice) => <button type="button" key={choice} lang="en" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', choice)} onClick={() => choose(choice)} className={wrongChoice === choice ? 'is-wrong' : ''}>{choice}</button>)}</div>
      </div> : <div className="builder-finish" aria-live="polite"><span>{sentenceReady ? 'Frase construida' : 'Puedes escucharla o seguir a tu ritmo.'}</span><button type="button" className="primary-action" onClick={() => { stopSpeech(); onNext(); }}>{index === total - 1 ? 'Usar mi frase →' : 'Siguiente frase →'}</button></div>}
    </div>
  </GameCard>;
}
