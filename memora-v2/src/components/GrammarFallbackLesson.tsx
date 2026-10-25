import { useEffect, useMemo, useRef, useState } from 'react';
import { grammarCaption, makeGrammarChecks } from '../domain/grammarPractice';
import { getExpandedEnglishSubject, getSpanishSubjectLabel, type GrammarForm } from '../domain/unit';
import { playEnglish, playSpanish, playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { GrammarMorphology } from './GrammarMorphology';
import type { GrammarFallbackPosition } from '../domain/game';

/** Compatibility presentation for forms without an authored coach. No new exercises or memory evidence. */
export function GrammarFallbackLesson({ form, baseSpanish, index, total, onReady, onContinue, vertical = false, initialPosition, onProgress }: {
  form: GrammarForm; baseSpanish?: string; index: number; total: number;
  onReady: () => void; onContinue: () => void; vertical?: boolean;
  initialPosition?: GrammarFallbackPosition; onProgress?: (position: GrammarFallbackPosition) => void;
}) {
  const progressive = (form.visualContract === 'present-continuous' || form.id === 'ing') && getExpandedEnglishSubject(form.subjects[0]) === 'I am';
  const checks = useMemo(() => progressive ? makeGrammarChecks(form) : [], [form, progressive]);
  const [saved] = useState(() => {
    const value = initialPosition;
    if (!value || !Number.isInteger(value.step) || value.step < (progressive ? 0 : 3) || value.step > 4 || !Number.isInteger(value.checkIndex) || value.checkIndex < 0 || value.checkIndex > checks.length || !Number.isInteger(value.subjectIndex) || value.subjectIndex < 0 || value.subjectIndex >= form.subjects.length || typeof value.prepared !== 'boolean' || !['pending', 'correct', 'model'].includes(value.outcome) || !Number.isInteger(value.failures) || value.failures < 0 || value.failures > 2) return undefined;
    if (value.step < 4 && (value.subjectIndex !== 0 || value.checkIndex !== 0 || value.outcome !== 'pending' || value.failures !== 0 || !value.prepared)) return undefined;
    if ((!value.prepared || value.checkIndex === checks.length) && value.outcome !== 'pending') return undefined;
    if (value.outcome === 'model' && value.failures !== 2 || value.outcome === 'pending' && value.failures >= 2) return undefined;
    if (value.step === 4 && checks[value.checkIndex] && form.subjects[value.subjectIndex].phrase !== checks[value.checkIndex].answer) return undefined;
    return value;
  });
  const [step, setStep] = useState(saved?.step ?? (progressive ? 0 : 3));
  const [subjectIndex, setSubjectIndex] = useState(saved?.subjectIndex ?? 0);
  const [checkIndex, setCheckIndex] = useState(saved?.checkIndex ?? 0);
  const [prepared, setPrepared] = useState(saved?.prepared ?? true);
  const [outcome, setOutcome] = useState<'pending' | 'correct' | 'model'>(saved?.outcome ?? 'pending');
  const [failures, setFailures] = useState(saved?.failures ?? 0);
  const [audio, setAudio] = useState('');
  const request = useRef(0), readySent = useRef(false), continued = useRef(false);
  const restoredAudio = useRef(Boolean(saved));
  const check = checks[checkIndex];
  const ready = step === 4 && !check;
  const subject = form.subjects[subjectIndex];
  const caption = progressive ? grammarCaption(form, step, baseSpanish) : form.memoryTrick?.explanation || 'Relaciona las piezas del modelo.';
  const phrase = step === 0 ? form.englishBase || form.english : step === 1 ? form.english : step === 2 ? subject.phrase.replace(subject.en, getExpandedEnglishSubject(subject)) : subject.phrase;
  const explanation = caption || (progressive ? grammarCaption(form, 3, baseSpanish) : '');
  const audioCurrent = useRef({ phrase, caption: explanation }); audioCurrent.current = { phrase, caption: explanation };
  const answerLock = useRef(false);
  const readyCallback = useRef(onReady); readyCallback.current = onReady;
  const positionCallback = useRef(onProgress); positionCallback.current = onProgress;
  useEffect(() => { positionCallback.current?.({ step, subjectIndex, checkIndex, prepared, outcome, failures }); }, [step, subjectIndex, checkIndex, prepared, outcome, failures]);
  async function listen(explanation = false) {
    const token = ++request.current;
    setAudio('Preparando audio…');
    try {
      const started = () => { if (token === request.current) setAudio('Reproduciendo…'); };
      const result = explanation ? await playSpanish(audioCurrent.current.caption || form.memoryTrick?.explanation || '', true, started) : await playEnglish(audioCurrent.current.phrase, undefined, true, started);
      if (token === request.current) setAudio(result.status === 'played' ? '' : 'Audio no disponible · toca 🔊');
    } catch { if (token === request.current) setAudio('Audio no disponible · toca 🔊'); }
  }
  useEffect(() => {
    // A different model cancels the previous voice, but sound never advances a lesson.
    const cancel = () => { request.current++; stopSpeech(); };
    if (restoredAudio.current) { restoredAudio.current = false; return cancel; }
    if (step === 4 && prepared && check && outcome === 'pending') return cancel;
    void listen();
    return cancel;
  }, [phrase, step, checkIndex, prepared, outcome]);
  useEffect(() => { if (ready && !readySent.current) { readySent.current = true; readyCallback.current(); } }, [ready]);
  function answer(value: string) {
    if (step !== 4 || !prepared || !check || outcome !== 'pending' || answerLock.current) return;
    answerLock.current = true;
    const correct = value === check.answer;
    if (correct) { setOutcome('correct'); playSnap(); }
    else { const count = failures + 1; setFailures(count); if (count >= 2) setOutcome('model'); }
    // Drafts/gestures do not answer; a second deliberate choice remains possible after repair.
    if (!correct && failures === 0) answerLock.current = false;
  }
  function advance() {
    if (continued.current) return;
    request.current++; stopSpeech(); setAudio('');
    const complete = () => {
      continued.current = true;
      if (!readySent.current) { readySent.current = true; readyCallback.current(); }
      onContinue();
    };
    if (step < 4) {
      if (vertical && step === 3 && !checks.length) { complete(); return; }
      setStep(step + 1); return;
    }
    if (ready) { continued.current = true; onContinue(); return; }
    if (!prepared) { setPrepared(true); return; }
    if (outcome === 'pending') return;
    const next = checkIndex + 1;
    if (vertical && next >= checks.length) { complete(); return; }
    const nextSubject = checks[next] ? form.subjects.findIndex((item) => item.phrase === checks[next].answer) : -1;
    if (nextSubject >= 0) setSubjectIndex(nextSubject);
    setCheckIndex(next); setPrepared(nextSubject < 0); setOutcome('pending'); setFailures(0); answerLock.current = false;
  }
  const canAdvance = step < 4 || ready || !prepared || outcome !== 'pending';
  const label = step < 3 ? 'Ver la siguiente pieza' : step === 3 && !checks.length ? 'Continuar' : step === 3 || !prepared ? 'Probar con estas piezas' : ready ? index === total - 1 ? 'Montar el mensaje' : 'Siguiente forma' : 'Continuar';
  return <GameCard vertical={vertical} stepKey={`${step}:${checkIndex}:${prepared}:${outcome}`} onAdvance={canAdvance ? advance : undefined} advanceControl advanceLabel={label} revealFooter={canAdvance} className="lesson-card">
    <div className="lesson-content">
      {step === 4 && prepared && check ? outcome !== 'pending' ? <><h1 role="status">{outcome === 'correct' ? '✓ Acertaste' : 'Vamos con el modelo'}</h1><p className="assembled-phrase" lang="en">{check.answer}</p>{outcome === 'model' ? <p>{check.hint}</p> : null}</> : <><h1>{check.prompt}</h1><div className="grammar-check"><div>{check.choices.map((choice) => <button type="button" key={choice} onClick={() => answer(choice)}>{choice}</button>)}</div>{failures > 0 ? <p role="status">{check.hint}</p> : null}</div></> : <>
        <h1>{ready ? 'Ahora, úsalo' : 'Mira cómo encaja'}</h1>
        <GrammarMorphology form={form} baseSpanish={baseSpanish} step={Math.min(step, 3)} joined={step >= 3} subjectIndex={subjectIndex} />
        {caption ? <p className="grammar-caption">{caption}</p> : null}
        {!prepared && getExpandedEnglishSubject(subject) !== subject.en ? <p className="grammar-caption" lang="en">{getExpandedEnglishSubject(subject)} → {subject.en}</p> : null}
      </>}
      {!(step === 4 && prepared && check && outcome === 'pending') ? <><button type="button" className="round-audio" aria-label="Escuchar el modelo" aria-busy={audio === 'Preparando audio…'} title={audio || 'Escuchar el modelo'} onClick={() => void listen()}>🔊</button>{audio && !['Preparando audio…', 'Reproduciendo…'].includes(audio) ? <p role="status">{audio}</p> : null}</> : null}
      {ready ? <details><summary>Otra persona o una explicación</summary>{form.subjects.length > 1 ? <div className="subject-list" aria-label="Cambia quién realiza la acción">{form.subjects.map((item, person) => <button type="button" key={`${item.en}-${item.es}`} onClick={() => setSubjectIndex(person)} aria-pressed={person === subjectIndex}>{getSpanishSubjectLabel(item.es, form.spanish)}</button>)}</div> : null}<button type="button" className="quiet-action" onClick={() => void listen(true)}>🔊 Repetir la explicación</button></details> : null}
    </div>
  </GameCard>;
}
