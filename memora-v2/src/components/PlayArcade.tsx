import { useRef, useState, type PointerEvent } from 'react';
import { SceneDelivery } from './GrammarSituation';
import { SpeechModelButton } from './SpeechModelButton';

export function PlayDrink({ coffee = false, empty = false }: { coffee?: boolean; empty?: boolean }) {
  return <svg viewBox="0 0 180 150" role="img" aria-label={empty ? 'La bandeja queda sin café' : coffee ? 'Una taza de café' : 'Un vaso de agua'}>
    <ellipse cx="90" cy="130" rx="68" ry="9" fill="currentColor" opacity=".1" />
    {!empty ? <><path d="M132 49H147Q170 50 159 76Q154 88 138 86" fill="none" stroke="currentColor" strokeWidth="6" /><path d="M41 32H139L128 114Q90 133 52 114Z" fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeWidth="3" /><path d="M49 68Q72 61 91 68T132 68L124 110Q90 125 56 110Z" fill={coffee ? '#d69662' : '#5bbbd5'} />{coffee ? <path d="M72 19Q63 9 72 1M107 19Q98 9 107 1" stroke="#d69662" strokeWidth="3" fill="none" /> : <path d="M76 78L80 96M94 77L98 95" stroke="#c9f7ff" strokeWidth="10" strokeLinecap="round" />}</> : <path d="M57 102L80 120L121 76" fill="none" stroke="#70cfb0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

/** Two visibly different games, using existing answer/clock/journal ownership.
 * The swipe is just a presentation gesture with equivalent keyboard buttons. */
export function PlayArcade({ kind, message, selected, feedback, onAnswer, presentationKey }: {
  kind: 'serve' | 'remove'; message: string; selected: string; feedback: 'idle' | 'help' | 'correct';
  onAnswer: (value: string) => void; presentationKey: string;
}) {
  const gesture = useRef<{ id: number; x: number; y: number }>();
  const [offset, setOffset] = useState(0);
  const locked = feedback === 'correct';
  function cancel() { gesture.current = undefined; setOffset(0); }
  function release(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    cancel();
    if (!locked && Math.abs(x) >= 44 && Math.abs(x) > Math.abs(y) * 1.25) onAnswer(x < 0 ? 'RETIRAR' : 'DEJAR');
  }
  if (kind === 'serve') return <div className="play-arcade-game arcade-serve"><SceneDelivery message={message} presentationKey={presentationKey} selected={selected} feedback={feedback} onAnswer={onAnswer} instruction="Arrastra el pedido a su bebida, o tócala." listenControl={<SpeechModelButton text={message} label="Escuchar el pedido" idleLabel="Escuchar" />} options={[
    { choice: 'WATER', label: 'Agua', visual: <PlayDrink /> }, { choice: 'COFFEE', label: 'Café', visual: <PlayDrink coffee /> },
  ]} /></div>;
  return <section className="play-arcade-game arcade-remove" aria-label="Retira o conserva el café">
    <p className="arcade-message" lang="en">{message}</p>
    <SpeechModelButton text={message} label="Escuchar el rechazo" idleLabel="Escuchar" />
    <div className={`arcade-swipe-cup${locked ? ' is-removed' : ''}`} style={{ transform: offset ? `translateX(${offset}px) rotate(${offset / 12}deg)` : undefined }}
      onPointerDown={(event) => { if (locked || event.button > 0 || event.isPrimary === false) return; gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerMove={(event) => { const start = gesture.current; if (!start || start.id !== event.pointerId) return; const x = event.clientX - start.x, y = event.clientY - start.y; if (Math.abs(x) > Math.abs(y) * 1.25 && Math.abs(x) > 8) { event.currentTarget.setPointerCapture?.(event.pointerId); setOffset(Math.max(-100, Math.min(100, x))); } }}
      onPointerUp={release} onPointerCancel={cancel} onLostPointerCapture={cancel}><PlayDrink coffee empty={locked} /><span aria-hidden="true">← &nbsp; ☕ &nbsp; →</span></div>
    <div className="arcade-swipe-actions">{(['RETIRAR', 'DEJAR'] as const).map((value) => <button type="button" key={value} disabled={locked} aria-pressed={selected === value} className={selected === value && feedback !== 'idle' ? feedback === 'correct' ? 'is-answer-correct' : 'is-answer-wrong' : undefined} onClick={() => onAnswer(value)}>{value === 'RETIRAR' ? '← Retirar' : 'Dejar →'}</button>)}</div>
    {!locked ? <p className="arcade-instruction">Desliza la taza o toca una acción.</p> : null}
  </section>;
}
