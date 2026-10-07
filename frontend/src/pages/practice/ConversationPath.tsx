import { useState } from 'react';
import { BackHeader } from './shared';
import { CONVERSATION_PATH } from '../../data/conversationPath';
import { sentenceScore } from '../../lib/answer';
import { SentenceDiff } from '../../components/SentenceDiff';
import { ProgressBar, SpeakBtn } from '../../components/common';

const LABELS = { cognado: 'cognado útil', conector: 'palabra puente', verbo: 'verbo frecuente', patrón: 'bloque para hablar' };

export function ConversationPath() {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const lesson = CONVERSATION_PATH[lessonIdx];
  const score = checked ? sentenceScore(answer, lesson.challenge[1]) : 0;
  const passed = score >= .8;

  const changeLesson = (next: number) => {
    setLessonIdx(next); setAnswer(''); setChecked(false);
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
        {lesson.examples.map(([en, es]) => <div key={en} className="example">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b>{en}</b><SpeakBtn text={en} /></div>
          <div className="small muted">{es}</div>
        </div>)}
        <div className="row"><SpeakBtn text={lesson.say} title="Escuchar frase clave" /><SpeakBtn text={lesson.say} title="Escuchar despacio" slow /><span className="small muted">Escucha y repite la frase clave dos veces.</span></div>
      </div>

      <div className="card stack">
        <span className="chip primary" style={{ alignSelf: 'flex-start' }}>Ahora tú</span>
        <div className="big-prompt" style={{ fontSize: '1.35rem' }}>{lesson.challenge[0]}</div>
        <input className="answer-input" value={answer} onChange={(e) => { setAnswer(e.target.value); setChecked(false); }} placeholder="Escríbelo en inglés…" autoCapitalize="off" autoComplete="off" />
        {!checked ? <button className="btn" disabled={!answer.trim()} onClick={() => setChecked(true)}>Comprobar</button> : <>
          <div className={`feedback ${passed ? 'ok' : 'doubt'}`}>{passed ? '✅ ¡Bien! Ya puedes usar esta frase.' : '🔁 Casi. Mira las piezas que faltan y vuelve a intentarlo.'}</div>
          <SentenceDiff given={answer} expected={lesson.challenge[1]} />
          <div className="row"><SpeakBtn text={lesson.challenge[1]} /><b>{lesson.challenge[1]}</b></div>
          <div className="row">
            <button className="btn secondary grow" onClick={() => { setAnswer(''); setChecked(false); }}>Intentarlo otra vez</button>
            {lessonIdx < CONVERSATION_PATH.length - 1 && <button className="btn grow" onClick={() => changeLesson(lessonIdx + 1)}>Siguiente →</button>}
          </div>
        </>}
      </div>
    </div>
  );
}
