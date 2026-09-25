import { useState } from 'react';
import { ErrorBox, Rich, SpeakBtn, toast } from '../../components/common';
import { SentenceDiff } from '../../components/SentenceDiff';
import { STRUCTURES, structureFor } from '../../data/structures';
import { ai, items } from '../../lib/api';
import { sentenceScore } from '../../lib/answer';
import { speak } from '../../lib/speech';
import { useStore } from '../../store';
import { BackHeader, useLearnedWords } from './shared';

interface Correction { correct: boolean; corrected: string; explanation_es: string; natural: string; score: number }

export function Ladder() {
  const store = useStore();
  const [dayIdx, setDayIdx] = useState(Math.min(store.currentDay, STRUCTURES.length));
  const s = structureFor(dayIdx);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<number | null>(null);
  const [free, setFree] = useState('');
  const [fb, setFb] = useState<Correction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [peek, setPeek] = useState<Set<number>>(new Set());
  const learned = useLearnedWords().slice(0, 30);
  const done = step >= s.ladder.length;

  const check = () => {
    const [, en] = s.ladder[step];
    const score = sentenceScore(answer, en);
    setChecked(score);
    speak(en);
  };
  const next = () => { setStep(step + 1); setAnswer(''); setChecked(null); };

  const correct = async () => {
    setBusy(true); setError(null);
    try {
      const out = await ai<Correction>('correct', { sentence: free, words: learned.map((w) => w.en).slice(0, 15), model: store.aiModel });
      setFb(out);
      await items.create('sentences', { kind: 'ladder', en: out.corrected || free, es: null, words: [], feedback: out.explanation_es, score: out.score });
      toast('📝 Guardada en «Mis frases»');
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <BackHeader title="🪜 Frase escalera" subtitle="Traduce cada peldaño. Cada uno añade una pieza hasta llegar a una frase larga que podrás usar de verdad." />
      <div className="row">
        <select value={dayIdx} onChange={(e) => { setDayIdx(Number(e.target.value)); setStep(0); setAnswer(''); setChecked(null); setFb(null); setShowExamples(false); setPeek(new Set()); }} style={{ maxWidth: 360 }}>
          {STRUCTURES.map((x, i) => <option key={i} value={i + 1}>Día {i + 1}: {x.title}</option>)}
        </select>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>{s.title}</h3>
        <code>{s.pattern}</code>
        <p className="small muted" style={{ margin: 0 }}>{s.explain}</p>
        {/* Los ejemplos se parecen a la respuesta: se muestran solo si los pides (cuenta como pista). */}
        {showExamples ? s.examples.map(([en, es]) => (
          <div key={en} className="example"><div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'space-between' }}><b>{en}</b><SpeakBtn text={en} /></div><div className="small muted">{es}</div></div>
        )) : <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowExamples(true)}>💡 Ver ejemplos (pista)</button>}
      </div>

      {/* Peldaños ya hechos: solo el español; el inglés, si lo necesitas, tocando (así lo recuerdas tú). */}
      {s.ladder.slice(0, step).map(([es, en], i) => (
        <button key={i} className="card flat" style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }} onClick={() => setPeek((p) => new Set(p).add(i))}>
          <div className="small muted">{es}</div>
          {peek.has(i) ? <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{en}</b><SpeakBtn text={en} /></div>
            : <div className="small" style={{ color: 'var(--primary)' }}>👆 tocar para ver cómo lo dijiste</div>}
        </button>
      ))}

      {!done ? (
        <div className="card stack">
          <span className="chip primary" style={{ alignSelf: 'flex-start' }}>Peldaño {step + 1}/{s.ladder.length}</span>
          <div className="big-prompt" style={{ fontSize: '1.4rem' }}>{s.ladder[step][0]}</div>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (checked === null) check(); else next(); }}>
            <input type="text" className="answer-input" style={{ fontSize: '1.1rem' }} value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="En inglés…" autoCapitalize="off" autoComplete="off" readOnly={checked !== null} />
            {checked === null ? (
              <div className="row">
                <button type="button" className="btn secondary grow" onClick={() => { setAnswer(''); setChecked(0); speak(s.ladder[step][1]); }}>Ver solución</button>
                <button className="btn grow" disabled={!answer.trim()}>Comprobar</button>
              </div>
            ) : (
              <>
                <SentenceDiff given={answer} expected={s.ladder[step][1]} />
                <div className="row"><SpeakBtn text={s.ladder[step][1]} /><SpeakBtn text={s.ladder[step][1]} slow /><span className="small muted">Repítela en voz alta 2 veces.</span></div>
                <button className="btn big" autoFocus>Siguiente peldaño →</button>
              </>
            )}
          </form>
        </div>
      ) : (
        <div className="card stack">
          <div className="feedback ok">🎉 ¡Escalera completada! Ahora hazla tuya.</div>
          <p className="small" style={{ margin: 0 }}>Escribe <b>tu propia frase larga</b> con esta estructura y alguna de tus palabras recientes:</p>
          <div className="row">{learned.slice(0, 12).map((w) => <button key={w.id} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => setFree((f) => `${f}${f && !f.endsWith(' ') ? ' ' : ''}${w.en}`)}>{w.en}</button>)}</div>
          <textarea value={free} onChange={(e) => setFree(e.target.value)} placeholder="I want to ... because ..." />
          {store.aiInfo.enabled
            ? <button className="btn" disabled={!free.trim() || busy} onClick={correct}>{busy ? '⏳ Corrigiendo…' : '🤖 Corregir y guardar'}</button>
            : <button className="btn" disabled={!free.trim()} onClick={async () => { await items.create('sentences', { kind: 'ladder', en: free }); toast('Guardada'); }}>Guardar en «Mis frases»</button>}
          {fb && (
            <div className="stack">
              <div className={`feedback ${fb.correct ? 'ok' : 'doubt'}`}>{fb.correct ? '✅' : '✏️'} {fb.corrected} <span className="chip">{fb.score}/10</span></div>
              <div className="small"><Rich text={fb.explanation_es} /></div>
              {fb.natural && <div className="example"><div className="small muted">Un nativo diría:</div><div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'space-between' }}><b>{fb.natural}</b><SpeakBtn text={fb.natural} /></div></div>}
            </div>
          )}
          <ErrorBox error={error} />
          <button className="btn secondary" onClick={() => { setStep(0); setAnswer(''); setChecked(null); setFree(''); setFb(null); setShowExamples(false); setPeek(new Set()); }}>↺ Repetir la escalera</button>
        </div>
      )}
    </div>
  );
}
