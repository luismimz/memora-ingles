import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { LessonCheck, SituationState } from '../domain/grammarLesson';
import './grammarSituation.css';

/** A scene describes a meaning; it does not assess or write learner progress. */
export function SituationScreen({ state }: { state: SituationState }) {
  if (state === 'brushing' || state === 'brush-ready') {
    const active = state === 'brushing';
    return <svg viewBox="0 0 200 110" role="img" aria-label={active ? 'Una persona se está cepillando los dientes' : 'El cepillo sigue en su vaso; la persona aún no empieza'}>
      <rect x="114" y="7" width="64" height="56" rx="7" fill="#d6d7c1" stroke="#ac8058" strokeWidth="5" />
      <path d="M104 78H190M115 82Q147 108 180 82" fill="none" stroke="#997250" strokeWidth="6" />
      <circle cx="55" cy="29" r="16" fill="#cc9a51" /><path d="M55 48V84M39 102L55 84L72 102" fill="none" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
      <path d={active ? 'M55 58L86 46L66 34' : 'M55 58L78 78'} fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" />
      {!active ? <path d="M153 73V58H170V73" fill="#356f65" /> : null}
      <g transform={active ? 'translate(65 33) rotate(-15)' : 'translate(161 42) rotate(90)'}><path d="M0 0H25" stroke="#356f65" strokeWidth="5" strokeLinecap="round" /><path d="M0 -5V0M5 -5V0M10 -5V0" stroke="#fff8df" strokeWidth="3" /></g>
      {active ? <><circle cx="68" cy="33" r="3" fill="#fff8df" /><path d="M80 21L86 17M83 29H91" stroke="#356f65" strokeWidth="2" /></> : null}
    </svg>;
  }
  if (state === 'cooking' || state === 'cook-ready') {
    const active = state === 'cooking';
    return <svg viewBox="0 0 200 110" role="img" aria-label={active ? 'Una persona está removiendo una olla al cocinar' : 'La olla está apartada; la persona aún no empieza a cocinar'}>
      <rect x="91" y="72" width="96" height="32" rx="5" fill="#ac8058" /><path d="M100 70H177" stroke="#383c36" strokeWidth="5" />
      <circle cx="44" cy="29" r="15" fill="#cc9a51" /><path d="M44 48V83M29 103L44 83L60 103" fill="none" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
      <path d={active ? 'M44 56L77 46L119 48' : 'M44 56L66 78'} fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" />
      <g transform={active ? 'translate(110 43)' : 'translate(148 49)'}><path d="M0 0H29V19Q14 29 0 19Z" fill="#356f65" /><path d="M-7 7H0M29 7H36" stroke="#356f65" strokeWidth="4" />{active ? <><path d="M11 7L17 -16" stroke="#997250" strokeWidth="3" /><path d="M2 -8Q-3 -14 2 -20M27 -8Q22 -14 27 -20" fill="none" stroke="#667566" strokeWidth="2" /></> : null}</g>
    </svg>;
  }
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

interface GrammarSituationProps {
  check: LessonCheck; selected: string; feedback: 'idle' | 'help' | 'correct'; onAnswer: (answer: string) => void; onListen: () => void; disabled?: boolean; listenDisabled?: boolean;
  presentationKey?: string;
}
export function GrammarSituation(props: GrammarSituationProps) {
  if (!props.check.situation) return null;
  return <SituationDelivery {...props} key={`${props.presentationKey ?? ''}:${props.check.id}:${props.check.situation.message}`} />;
}

function SituationDelivery({ check, selected, feedback, onAnswer, onListen, disabled = false, listenDisabled = false, presentationKey = '' }: GrammarSituationProps) {
  const root = useRef<HTMLDivElement>(null);
  const destinations = useRef(new Map<string, HTMLButtonElement>());
  const gesture = useRef<{ id: number; x: number; y: number }>();
  const [drag, setDrag] = useState<{ x: number; y: number; over?: string }>();
  const available = useRef({ disabled, feedback, onAnswer });
  available.current = { disabled, feedback, onAnswer };
  const locked = disabled || feedback === 'correct';
  useEffect(() => { if (locked) { gesture.current = undefined; setDrag(undefined); } }, [locked]);
  const situation = check.situation!;
  // Stable across help, feedback and reload, but not always the same side for
  // every message. Presentation only; no new learner store or random answer.
  const hash = [...`${presentationKey}:${check.id}:${situation.message}`].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261);
  const scenes = (hash ^ hash >>> 16) & 1 ? [...situation.scenes].reverse() : situation.scenes;
  function destination(x: number, y: number) {
    return scenes.find((item) => { const box = destinations.current.get(item.choice)?.getBoundingClientRect(); return box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom; })?.choice;
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    event.stopPropagation();
    const box = root.current?.getBoundingClientRect();
    if (box) setDrag({ x: event.clientX - box.left, y: event.clientY - box.top, over: destination(event.clientX, event.clientY) });
  }
  function cancel() { gesture.current = undefined; setDrag(undefined); }
  function release(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (start?.id !== event.pointerId) return;
    event.stopPropagation();
    const choice = destination(event.clientX, event.clientY);
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 8;
    cancel();
    if (choice && moved && !available.current.disabled && available.current.feedback !== 'correct') available.current.onAnswer(choice);
  }
  const scene = situation.scenes.find((item) => item.choice === selected);
  return <div ref={root} className="grammar-situation">
    <p className="situation-instruction">Lleva el mensaje a su escena, o toca la escena.</p>
    <div className={`situation-message situation-token${drag ? ' is-held' : ''}`} lang="en" role="group" aria-label={`Mensaje inglés: ${situation.message}`} draggable={!locked}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => { if (locked || event.button !== 0 || event.isPrimary === false) return; event.preventDefault(); event.stopPropagation(); gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId); move(event); }}
      onPointerMove={move} onPointerUp={release} onPointerCancel={cancel} onLostPointerCapture={cancel}>{situation.message}<small lang="es">↘ Lleva este mensaje</small></div>
    <button type="button" className="quiet-action" disabled={listenDisabled} onClick={onListen} aria-label="Escuchar el mensaje inglés">🔊 Escuchar</button>
    <div className="situation-options" role="group" aria-label="Elige la escena que comunica el mensaje">
      {scenes.map((item) => <button type="button" ref={(node) => { if (node) destinations.current.set(item.choice, node); else destinations.current.delete(item.choice); }} key={item.choice} data-drop-choice={item.choice} className={drag?.over === item.choice ? 'is-drop-target' : ''} aria-pressed={selected === item.choice} disabled={locked} onClick={() => onAnswer(item.choice)}><SituationScreen state={item.state} /><span>{item.choice}</span></button>)}
    </div>
    {drag ? <div className="situation-token-ghost" aria-hidden="true" style={{ left: drag.x, top: drag.y }} lang="en">{situation.message}</div> : null}
    {scene && feedback !== 'idle' ? <div className="situation-result" role="status"><SituationScreen state={scene.state} /><p>{feedback === 'correct' ? 'Mensaje entregado: la escena muestra la acción en marcha.' : scene.state === 'brush-ready' ? 'El cepillo sigue en el vaso. El mensaje cuenta que la persona ya está cepillando.' : scene.state === 'cook-ready' ? 'La olla sigue apartada. El mensaje cuenta que la persona ya está cocinando.' : 'Has dejado el mando guardado. ¿Es eso lo que cuenta el mensaje?'}</p></div> : null}
  </div>;
}
