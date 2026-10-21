import type { LessonCheck } from '../domain/grammarLesson';
import './grammarSituation.css';

/** A scene describes a meaning; it does not assess or write learner progress. */
export function SituationScreen({ state }: { state: 'playing' | 'waiting' }) {
  const playing = state === 'playing';
  return <svg viewBox="0 0 200 110" role="img" aria-label={playing ? 'Una persona está jugando con el mando' : 'El mando sigue guardado; la persona espera'}>
    <rect x="78" y="8" width="110" height="64" rx="8" fill="#ac8058" />
    <rect x="85" y="15" width="96" height="48" rx="4" fill={playing ? '#356f65' : '#d6d7c1'} />
    {playing ? <><circle cx="128" cy="38" r="7" fill="#f5ce73" /><path d="M94 51H115M148 25H170" stroke="#fff8df" strokeWidth="4" /></> : <path d="M125 27V50M140 27V50" stroke="#667566" strokeWidth="5" />}
    <circle cx="34" cy="33" r="14" fill="#cc9a51" /><path d="M34 50V83M34 60L58 70M34 60L19 76" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
    <path d="M19 99L34 83L49 99M70 83H190" stroke="#997250" strokeWidth="7" strokeLinecap="round" />
    <g transform={playing ? 'translate(47 63)' : 'translate(119 87)'}><rect width="31" height="16" rx="6" fill="#383c36" /><path d="M7 8H15M11 4V12" stroke="#fff8df" strokeWidth="2" /><circle cx="24" cy="8" r="2" fill="#f5ce73" /></g>
    {playing ? <path d="M77 68L87 59" stroke="#cc9a51" strokeWidth="3" /> : null}
  </svg>;
}

export function GrammarSituation({ check, selected, feedback, onAnswer, onListen }: {
  check: LessonCheck; selected: string; feedback: 'idle' | 'help' | 'correct'; onAnswer: (answer: string) => void; onListen: () => void;
}) {
  if (!check.situation) return null;
  const scene = check.situation.scenes.find((item) => item.choice === selected);
  return <div className="grammar-situation">
    <p className="situation-message" lang="en">{check.situation.message}</p>
    <button type="button" className="quiet-action" onClick={onListen} aria-label="Escuchar el mensaje inglés">🔊 Escuchar</button>
    <div className="situation-options" role="group" aria-label="Elige la escena que comunica el mensaje">
      {check.situation.scenes.map((item) => <button type="button" key={item.choice} aria-pressed={selected === item.choice} disabled={feedback === 'correct'} onClick={() => onAnswer(item.choice)}><SituationScreen state={item.state} /><span>{item.choice}</span></button>)}
    </div>
    {scene && feedback !== 'idle' ? <div className="situation-result" role="status"><SituationScreen state={scene.state} /><p>{feedback === 'correct' ? 'Mensaje entregado: la pantalla muestra la acción en marcha.' : 'Has dejado el mando guardado. ¿Es eso lo que cuenta el mensaje?'}</p></div> : null}
  </div>;
}
