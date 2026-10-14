import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameCard } from './GameCard';
import { SceneVisual } from './SceneVisual';
import type { AtomicWord, GrammarForm, UnitSentence } from '../domain/unit';
import { playEnglish, playMiss, playSnap, stopSpeech } from '../services/audio';

function showProcess(text: string, word: string, stem: string, ending: string): ReactNode {
  const position = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if (position < 0 || !ending) return text;
  return <>{text.slice(0, position)}<span className="builder-process"><span className="morph-root">{stem}</span><span className="morph-intent">{ending}</span></span>{text.slice(position + word.length)}</>;
}

export function SentenceBuilderCard({ sentence, sceneWord, processForm, index, total, filledSlots, choiceSeed, onPick, onNext, onAttempt }: {
  sentence: UnitSentence;
  sceneWord: AtomicWord;
  processForm: GrammarForm;
  index: number;
  total: number;
  filledSlots: number;
  choiceSeed: number;
  onPick: () => void;
  onNext: () => void;
  onAttempt?: (choice: string, correct: boolean, slotIndex: number) => void;
}) {
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [sentenceReady, setSentenceReady] = useState(false);
  const wrongTimer = useRef<number | null>(null);
  const answeredSlot = useRef(-1);
  useEffect(() => () => { if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current); }, []);

  const completed = filledSlots === sentence.slots.length;
  const active = sentence.slots[filledSlots];
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
    if (!active || completed || answeredSlot.current === filledSlots) return;
    onAttempt?.(choice, choice === active.en, filledSlots);
    if (choice !== active.en) {
      setWrongChoice(choice);
      playMiss();
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrongChoice(null), 450);
      return;
    }
    setWrongChoice(null);
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
      {!completed && active ? <div className="slot-picker" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const choice = event.dataTransfer.getData('text/plain');
        if (active.choices.includes(choice)) choose(choice);
      }}>
        <p>Elige para «{active.es}»</p>
        {active.note ? <p className="builder-note">{active.note}</p> : null}
        <div className="slot-options">{options?.map((choice) => <button type="button" key={choice} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', choice)} onClick={() => choose(choice)} className={wrongChoice === choice ? 'is-wrong' : ''}>{choice}</button>)}</div>
      </div> : <div className="builder-finish" aria-live="polite"><span>{sentenceReady ? 'Frase construida' : 'Puedes escucharla o seguir a tu ritmo.'}</span><button type="button" className="primary-action" onClick={() => { stopSpeech(); onNext(); }}>{index === total - 1 ? 'Usar mi frase →' : 'Siguiente frase →'}</button></div>}
    </div>
  </GameCard>;
}
