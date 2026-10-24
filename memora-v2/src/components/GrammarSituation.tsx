import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { LessonCheck, SituationState } from '../domain/grammarLesson';
import './grammarSituation.css';

/** A scene describes a meaning; it does not assess or write learner progress. */
export function SituationScreen({ state }: { state: SituationState }) {
  if (state === 'mirror-brushing' || state === 'window-brushing') {
    const mirror = state === 'mirror-brushing';
    return <svg viewBox="0 0 200 110" role="img" aria-label={mirror ? 'Una persona se cepilla los dientes junto a un espejo que refleja su cara y cepillo' : 'Una persona se cepilla los dientes junto a una ventana que muestra un árbol y el sol'}>
      <rect x="104" y="7" width="80" height="68" rx="6" fill="#d6d7c1" stroke="#997250" strokeWidth="5" />
      {mirror ? <><circle cx="144" cy="31" r="12" fill="#cc9a51" /><path d="M144 47V69M144 54L126 44L138 34" fill="none" stroke="#997250" strokeWidth="5" strokeLinecap="round" /><path d="M136 34H151" stroke="#356f65" strokeWidth="3" /></>
        : <><circle cx="162" cy="24" r="7" fill="#cc9a51" /><path d="M126 52V69" stroke="#997250" strokeWidth="4" /><circle cx="126" cy="42" r="12" fill="#356f65" /><path d="M144 10V72M108 44H180" stroke="#997250" strokeWidth="3" /></>}
      <circle cx="48" cy="29" r="15" fill="#cc9a51" /><path d="M48 47V82M33 103L48 82L65 103M48 57L80 44L61 33" fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" /><path d="M60 33H79" stroke="#356f65" strokeWidth="4" /><path d="M60 29V33M65 29V33M70 29V33" stroke="#fff8df" strokeWidth="2" />
      <path d="M96 88H190M114 88Q143 107 173 88M9 105H192" fill="none" stroke="#667566" strokeWidth="3" />
    </svg>;
  }
  if (state === 'kitchen-cooking' || state === 'garden-cooking') {
    const inside = state === 'kitchen-cooking';
    return <svg viewBox="0 0 200 110" role="img" aria-label={inside ? 'Una persona cocina dentro de una habitación con armarios y fogones de cocina' : 'Una persona cocina al aire libre en el jardín, junto a un árbol'}>
      {inside ? <><path d="M7 102V8H193V102" fill="none" stroke="#667566" strokeWidth="4" /><rect x="108" y="16" width="68" height="30" rx="3" fill="#d6d7c1" /><path d="M142 16V46M135 28V34M149 28V34" stroke="#997250" strokeWidth="3" /><path d="M97 80H188M103 82V102M182 82V102" stroke="#997250" strokeWidth="6" /></>
        : <><path d="M166 60V102" stroke="#997250" strokeWidth="8" /><circle cx="164" cy="31" r="25" fill="#356f65" /><circle cx="142" cy="42" r="19" fill="#356f65" /><circle cx="182" cy="45" r="14" fill="#356f65" /><circle cx="93" cy="16" r="9" fill="#cc9a51" /><path d="M91 80H134M97 82V102M128 82V102" stroke="#997250" strokeWidth="6" /></>}
      <path d="M8 103H192" stroke="#667566" strokeWidth="3" />
      <circle cx="40" cy="27" r="13" fill="#cc9a51" /><path d="M40 44V77M25 101L40 77L55 101M40 53L67 43L108 55" fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" />
      <path d="M101 60H130V76Q115 88 101 76Z" fill="#356f65" /><path d="M109 67L116 44" stroke="#997250" strokeWidth="3" /><path d="M99 51Q94 42 99 35M130 51Q125 42 130 35" fill="none" stroke="#667566" strokeWidth="2" />
    </svg>;
  }
  if (state === 'cooking-dinner' || state === 'dinner-served') {
    const cooking = state === 'cooking-dinner';
    return <svg viewBox="0 0 200 110" role="img" aria-label={cooking ? 'Una persona remueve la olla mientras prepara la cena; los platos siguen vacíos' : 'La cena está servida en dos platos sobre la mesa; nadie está cocinando'}>
      <path d="M8 103H192" stroke="#667566" strokeWidth="3" />
      <path d="M100 72H190M109 74V102M181 74V102" stroke="#997250" strokeWidth="6" />
      <ellipse cx="123" cy="68" rx="15" ry="5" fill="#fff8df" /><ellipse cx="166" cy="68" rx="15" ry="5" fill="#fff8df" />
      {cooking ? <><circle cx="31" cy="22" r="13" fill="#cc9a51" /><path d="M31 39V76M18 102L31 76L48 102M31 49L57 43L73 50" fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" /><rect x="53" y="74" width="42" height="27" rx="4" fill="#997250" /><path d="M57 58H91V74Q74 85 57 74Z" fill="#356f65" /><path d="M70 65L78 39" stroke="#997250" strokeWidth="3" /><path d="M59 49Q52 40 59 31M88 49Q81 40 88 31" fill="none" stroke="#667566" strokeWidth="2" /></>
        : <><ellipse cx="123" cy="65" rx="10" ry="4" fill="#356f65" /><ellipse cx="166" cy="65" rx="10" ry="4" fill="#cc9a51" /><circle cx="37" cy="28" r="13" fill="#cc9a51" /><path d="M37 45V77M24 102L37 77L51 102M37 54L70 64" fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" /><path d="M76 63L87 63" stroke="#356f65" strokeWidth="3" /></>}
    </svg>;
  }
  if (state === 'desk-playing' || state === 'floor-playing') {
    const desk = state === 'desk-playing';
    return <svg viewBox="0 0 200 110" role="img" aria-label={desk ? 'Una persona juega sentada ante su escritorio' : 'Una persona juega sentada en el suelo, lejos del escritorio'}>
      <path d="M9 103H191" stroke="#667566" strokeWidth="3" />
      <g transform={desk ? 'translate(0 0)' : 'translate(0 29)'}><circle cx="47" cy="25" r="14" fill="#cc9a51" /><path d={desk ? 'M47 44V72L79 74L84 99M47 54L73 61M47 54L62 65' : 'M47 44V67L29 74H81M47 54L73 61M47 54L62 65'} fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" /><rect x="63" y="57" width="29" height="15" rx="5" fill="#383c36" /><path d="M68 64H76M72 60V68" stroke="#fff8df" strokeWidth="2" /><circle cx="84" cy="64" r="2" fill="#cc9a51" /></g>
      {desk ? <><path d="M84 73H185M95 73V103M174 73V103M29 75H53M32 75V101" stroke="#997250" strokeWidth="6" strokeLinecap="round" /><rect x="113" y="23" width="58" height="39" rx="5" fill="#383c36" /><rect x="119" y="29" width="46" height="27" rx="2" fill="#356f65" /><circle cx="142" cy="41" r="5" fill="#cc9a51" /><path d="M142 62V70" stroke="#383c36" strokeWidth="4" /></>
        : <><rect x="116" y="63" width="60" height="39" rx="5" fill="#383c36" /><rect x="122" y="69" width="48" height="27" rx="2" fill="#356f65" /><circle cx="146" cy="82" r="5" fill="#cc9a51" /></>}
    </svg>;
  }
  if (state === 'computer-playing' || state === 'console-playing') {
    const computer = state === 'computer-playing';
    return <svg viewBox="0 0 200 110" role="img" aria-label={computer ? 'Una persona juega usando teclado y ratón de un ordenador' : 'Una persona juega con un mando y una consola, sin ordenador'}>
      <rect x="92" y="12" width="86" height="52" rx="5" fill="#383c36" /><rect x="98" y="18" width="74" height="38" rx="3" fill="#356f65" /><circle cx="134" cy="37" r="7" fill="#cc9a51" />
      <path d="M74 82H187M84 82V103M177 82V103" stroke="#997250" strokeWidth="6" strokeLinecap="round" />
      <circle cx="35" cy="32" r="14" fill="#cc9a51" /><path d="M35 50V82M20 103L35 82L53 103" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
      {computer ? <><path d="M35 58L67 71L114 72M35 60L58 77L147 77" fill="none" stroke="#997250" strokeWidth="6" strokeLinecap="round" /><rect x="101" y="68" width="37" height="10" rx="2" fill="#667566" /><ellipse cx="151" cy="75" rx="7" ry="4" fill="#383c36" /><rect x="161" y="66" width="17" height="13" rx="2" fill="#383c36" /><path d="M135 64V68" stroke="#383c36" strokeWidth="5" /></>
        : <><path d="M35 58L65 66M35 59L54 70" stroke="#997250" strokeWidth="7" strokeLinecap="round" /><rect x="53" y="62" width="30" height="15" rx="5" fill="#383c36" /><path d="M58 69H66M62 65V73" stroke="#fff8df" strokeWidth="2" /><circle cx="75" cy="69" r="2" fill="#cc9a51" /><rect x="119" y="68" width="48" height="10" rx="3" fill="#667566" /></>}
    </svg>;
  }
  if (state === 'making-bed' || state === 'resting-bed') {
    const making = state === 'making-bed';
    return <svg viewBox="0 0 200 110" role="img" aria-label={making ? 'Una persona está estirando la ropa de cama y colocando la almohada' : 'Una persona está tumbada descansando sobre la cama'}>
      <path d="M62 49V101M187 73V101M62 90H187" stroke="#997250" strokeWidth="7" strokeLinecap="round" />
      <rect x="66" y="61" width="119" height="23" rx="8" fill="#d6d7c1" /><path d={making ? 'M82 60L139 43L184 66L184 81H81Z' : 'M99 60H184V81H99Z'} fill="#356f65" />
      <rect x="69" y="55" width="32" height="13" rx="5" fill="#fff8df" />
      {making ? <><circle cx="35" cy="22" r="13" fill="#cc9a51" /><path d="M36 39L51 66M43 50L83 57M44 51L77 40M51 66L32 101M51 66L66 101" fill="none" stroke="#997250" strokeWidth="7" strokeLinecap="round" /></> : <><circle cx="86" cy="47" r="12" fill="#cc9a51" /><path d="M101 50H147L174 58M115 49L137 58" fill="none" stroke="#997250" strokeWidth="8" strokeLinecap="round" /></>}
    </svg>;
  }
  if (state === 'search-keys' || state === 'search-phone') return <svg viewBox="0 0 200 110" role="img" aria-label={state === 'search-keys' ? 'Una persona está buscando sus llaves' : 'Una persona está buscando su móvil'}>
    <circle cx="39" cy="28" r="14" fill="#cc9a51" /><path d="M39 45V80M24 101L39 80L56 101M39 54L69 69" fill="none" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
    <circle cx="82" cy="58" r="15" fill="none" stroke="#356f65" strokeWidth="5" /><path d="M91 70L104 85" stroke="#356f65" strokeWidth="7" />
    <rect x="108" y="10" width="80" height="75" rx="18" fill="#d6d7c1" /><path d="M111 68L94 78L111 42" fill="#d6d7c1" />
    {state === 'search-keys' ? <g stroke="#997250" strokeWidth="5" fill="none"><circle cx="133" cy="36" r="10" /><path d="M139 44L158 66L166 60M151 58L160 51" /><circle cx="157" cy="35" r="9" /><path d="M157 44V67H169M157 58H166" /></g> : <g><rect x="134" y="22" width="29" height="49" rx="5" fill="#383c36" /><rect x="138" y="28" width="21" height="31" rx="2" fill="#356f65" /><circle cx="148" cy="65" r="2" fill="#fff8df" /></g>}
  </svg>;
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
  const situation = check.situation!;
  const scene = situation.scenes.find((item) => item.choice === selected);
  return <SceneDelivery message={situation.message} presentationKey={`${presentationKey}:${check.id}`} selected={selected} feedback={feedback} onAnswer={onAnswer} onListen={onListen} disabled={disabled} listenDisabled={listenDisabled} options={situation.scenes.map((item) => ({ choice: item.choice, label: item.choice, visual: <SituationScreen state={item.state} /> }))}>
    {scene && feedback !== 'idle' ? <div className="situation-result" role="status"><SituationScreen state={scene.state} /><p>{scene.state === 'mirror-brushing' ? 'Mensaje entregado: se está cepillando los dientes junto al espejo.' : scene.state === 'window-brushing' ? 'Ambas personas se cepillan los dientes, pero esta está junto a una ventana. BY THE MIRROR indica el espejo.' : scene.state === 'kitchen-cooking' ? 'Mensaje entregado: está cocinando dentro de la cocina.' : scene.state === 'garden-cooking' ? 'Las dos personas cocinan, pero esta está en el jardín. IN THE KITCHEN indica la cocina.' : scene.state === 'cooking-dinner' ? 'Mensaje entregado: está cocinando la cena, todavía no está servida.' : scene.state === 'dinner-served' ? 'Aquí la cena ya está servida. COOKING DINNER cuenta que sigue preparándose.' : scene.state === 'desk-playing' ? 'Mensaje entregado: está jugando en su escritorio.' : scene.state === 'floor-playing' ? 'Esta persona juega en el suelo. AT MY DESK indica el escritorio.' : scene.state === 'computer-playing' ? 'Mensaje entregado: está jugando usando su ordenador.' : scene.state === 'console-playing' ? 'Las dos personas juegan, pero esta usa una consola. ON MY COMPUTER indica el ordenador.' : feedback === 'correct' ? scene.state === 'search-keys' ? 'Mensaje entregado: el personaje busca las llaves, no el móvil.' : scene.state === 'making-bed' ? 'Mensaje entregado: la persona está haciendo la cama, no descansando en ella.' : 'Mensaje entregado: la escena muestra la acción en marcha.' : scene.state === 'resting-bed' ? 'En esta imagen la persona descansa. MAKING MY BED cuenta que está haciendo su cama.' : scene.state === 'search-phone' ? 'Has señalado el móvil. MY KEYS indica que busca sus llaves.' : scene.state === 'brush-ready' ? 'El cepillo sigue en el vaso. El mensaje cuenta que la persona ya está cepillando.' : scene.state === 'cook-ready' ? 'La olla sigue apartada. El mensaje cuenta que la persona ya está cocinando.' : 'Has dejado el mando guardado. ¿Es eso lo que cuenta el mensaje?'}</p></div> : null}
  </SceneDelivery>;
}

/** Shared presentation gesture only. The caller owns attempts, help and progress. */
export function SceneDelivery({ message, options, selected, feedback, onAnswer, onListen, disabled = false, listenDisabled = false, presentationKey = '', instruction = 'Lleva el mensaje a su escena, o toca la escena.', children }: {
  message: string; options: { choice: string; label: string; visual: ReactNode }[];
  selected: string; feedback: 'idle' | 'help' | 'correct'; onAnswer: (answer: string) => void; onListen: () => void;
  disabled?: boolean; listenDisabled?: boolean; presentationKey?: string; instruction?: string; children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const destinations = useRef(new Map<string, HTMLButtonElement>());
  const gesture = useRef<{ id: number; x: number; y: number }>();
  const [drag, setDrag] = useState<{ x: number; y: number; over?: string }>();
  const available = useRef({ disabled, feedback, onAnswer });
  available.current = { disabled, feedback, onAnswer };
  const locked = disabled || feedback === 'correct';
  useEffect(() => { if (locked) { gesture.current = undefined; setDrag(undefined); } }, [locked]);
  // Stable across help, feedback and reload, but not always the same side for
  // every message. Presentation only; no new learner store or random answer.
  const hash = [...`${presentationKey}:${message}`].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261);
  const scenes = (hash ^ hash >>> 16) & 1 ? [...options].reverse() : options;
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
  return <div ref={root} className="grammar-situation">
    <p className="situation-instruction">{instruction}</p>
    <div className={`situation-message situation-token${drag ? ' is-held' : ''}`} lang="en" role="group" aria-label={`Mensaje inglés: ${message}`} draggable={!locked}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => { if (locked || event.button !== 0 || event.isPrimary === false) return; event.preventDefault(); event.stopPropagation(); gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId); move(event); }}
      onPointerMove={move} onPointerUp={release} onPointerCancel={cancel} onLostPointerCapture={cancel}>{message}<small lang="es">↘ Lleva este mensaje</small></div>
    <button type="button" className="quiet-action" disabled={listenDisabled} onClick={onListen} aria-label="Escuchar el mensaje inglés">🔊 Escuchar</button>
    <div className="situation-options" role="group" aria-label="Elige la escena que comunica el mensaje">
      {scenes.map((item) => <button type="button" ref={(node) => { if (node) destinations.current.set(item.choice, node); else destinations.current.delete(item.choice); }} key={item.choice} data-drop-choice={item.choice} className={drag?.over === item.choice ? 'is-drop-target' : ''} aria-pressed={selected === item.choice} disabled={locked} onClick={() => onAnswer(item.choice)}>{item.visual}<span>{item.label}</span></button>)}
    </div>
    {drag ? <div className="situation-token-ghost" aria-hidden="true" style={{ left: drag.x, top: drag.y }} lang="en">{message}</div> : null}
    {children}
  </div>;
}
