import { useState } from 'react';
import { BackHeader } from './shared';
import { CONVERSATION_PATH } from '../../data/conversationPath';
import { sentenceScore } from '../../lib/answer';
import { normalize } from '../../lib/answer';
import { SentenceDiff } from '../../components/SentenceDiff';
import { ProgressBar, SpeakBtn } from '../../components/common';

const LABELS = { cognado: 'cognado útil', conector: 'palabra puente', verbo: 'verbo frecuente', patrón: 'bloque para hablar' };

export function ConversationPath() {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [creative, setCreative] = useState('');
  const [creativeChecked, setCreativeChecked] = useState(false);
  const [creativePassed, setCreativePassed] = useState(false);
  const lesson = CONVERSATION_PATH[lessonIdx];
  const score = checked ? sentenceScore(answer, lesson.challenge[1]) : 0;
  const passed = score >= .8;

  const changeLesson = (next: number) => {
    setLessonIdx(next); setAnswer(''); setChecked(false); setShowExamples(false); setCreative(''); setCreativeChecked(false); setCreativePassed(false);
  };
  const validateCreative = () => {
    const tokens = normalize(creative).split(' ').filter(Boolean);
    const ok = lesson.mission.required.every((word) => tokens.includes(normalize(word)));
    setCreativePassed(ok); setCreativeChecked(true);
  };

  return (
    <div className="stack">
      <BackHeader title="🗣️ Hablar desde el principio" subtitle="Palabras frecuentes y patrones completos para responder, preguntar y no quedarte en blanco." />
      <div className="card flat stack">
        <div className="spread"><b>Ruta de conversación</b><span className="chip primary">{lessonIdx + 1}/{CONVERSATION_PATH.length}</span></div>
        <ProgressBar value={lessonIdx + 1} max={CONVERSATION_PATH.length} />
        <div className="lesson-tabs" aria-label="Lecciones de conversación">
          {CONVERSATION_PATH.map((item, i) => <button key={item.id} className={`lesson-tab ${i === lessonIdx ? 'active' : ''}`} onClick={() => changeLesson(i)}>{i + 1}</button>)}
        </div>
      </div>

      <div className="card stack">
        <span className="chip accent" style={{ alignSelf: 'flex-start' }}>Objetivo: {lesson.goal}</span>
        <h2 style={{ margin: 0 }}>{lesson.title}</h2>
        <code>{lesson.pattern}</code>
        <p className="muted" style={{ margin: 0 }}>{lesson.explain}</p>
      </div>

      <div className="grid2">
        {lesson.units.map((unit) => <div className="card flat unit-card" key={unit.en}>
          <div className="spread"><b>{unit.en}</b><span className="chip">{LABELS[unit.kind]}</span></div>
          <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{unit.es}</div>
          {unit.note && <div className="small muted">⚠️ {unit.note}</div>}
        </div>)}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Así suena en una conversación</h3>
        <p className="small muted" style={{ margin: 0 }}>Escucha las frases, quédate con el patrón y después intenta crear una respuesta que no esté escrita aquí.</p>
        <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowExamples((v) => !v)}>{showExamples ? 'Ocultar ejemplos' : '💡 Ver ejemplos (pista)'}</button>
        {showExamples && lesson.examples.map(([en, es]) => <div key={en} className="example">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{en}</b><SpeakBtn text={en} /></div>
          <div className="small muted">{es}</div>
        </div>)}
        <div className="row"><SpeakBtn text={lesson.say} title="Escuchar frase clave" /><SpeakBtn text={lesson.say} title="Escuchar despacio" slow /><span className="small muted">Escucha y repite la frase clave dos veces.</span></div>
      </div>

      <div className="card stack">
        <span className="chip primary" style={{ alignSelf: 'flex-start' }}>Ahora tú</span>
        <div className="big-prompt" style={{ fontSize: '1.35rem' }}>{lesson.challenge[0]}</div>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (answer.trim()) setChecked(true); }}>
          <input className="answer-input" value={answer} onChange={(e) => { setAnswer(e.target.value); setChecked(false); }} placeholder="Escríbelo en inglés…" autoCapitalize="off" autoComplete="off" />
          {!checked && <button className="btn" disabled={!answer.trim()}>Comprobar · Enter ↵</button>}
        </form>
        {!checked ? null : <>
          <div className={`feedback ${passed ? 'ok' : 'doubt'}`}>{passed ? '✅ ¡Bien! Ya puedes usar esta frase.' : '🔁 Casi. Mira las piezas que faltan y vuelve a intentarlo.'}</div>
          <SentenceDiff given={answer} expected={lesson.challenge[1]} />
          <div className="row"><SpeakBtn text={lesson.challenge[1]} /><b>{lesson.challenge[1]}</b></div>
          {passed && <div className="creative-mission stack"><div className="spread"><span className="chip accent">⚡ MISIÓN BRILLANTE · +20</span><span className="small muted">No hay una única respuesta correcta</span></div><h3 style={{ margin: 0 }}>{lesson.mission.title}</h3><p style={{ margin: 0 }}>{lesson.mission.prompt}</p><div className="small muted">Pista: {lesson.mission.hint}</div>{!creativeChecked ? <form className="stack" onSubmit={(e) => { e.preventDefault(); if (creative.trim()) validateCreative(); }}><input className="answer-input" value={creative} onChange={(e) => { setCreative(e.target.value); setCreativeChecked(false); }} placeholder="Tu respuesta, con tus palabras…" autoCapitalize="off" autoComplete="off" /><button className="btn">Validar misión · Enter ↵</button></form> : <div className={`feedback ${creativePassed ? 'ok' : 'doubt'}`}>{creativePassed ? '🌟 ¡Misión superada! Has creado una frase tuya.' : `💡 Casi: intenta incluir ${lesson.mission.required.join(', ')}.`}</div>}</div>}
          <div className="row">
            <button className="btn secondary grow" onClick={() => { setAnswer(''); setChecked(false); setCreative(''); setCreativeChecked(false); setCreativePassed(false); }}>Intentarlo otra vez</button>
            {lessonIdx < CONVERSATION_PATH.length - 1 && <button className="btn grow" disabled={passed && !creativeChecked} onClick={() => changeLesson(lessonIdx + 1)}>{passed && !creativeChecked ? 'Completa tu misión →' : 'Siguiente →'}</button>}
          </div>
          {passed && !creativeChecked && <button className="text-link" onClick={() => setCreativeChecked(true)}>Saltar misión por ahora</button>}
        </>}
      </div>
    </div>
  );
}
