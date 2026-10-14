import { useEffect, useRef, useState } from 'react';
import { playEnglish, playSnap } from '../services/audio';
import { phrasalFamilies, type PhrasalFamily } from '../domain/phrasalFamilies';
import { SceneVisual } from './SceneVisual';

type Particle = string;

function TurnScene({ particle, compact = false }: { particle?: Particle; compact?: boolean }) {
  const off = particle === 'OFF';
  const id = `${particle ?? 'base'}-${compact ? 'small' : 'large'}`;
  return <svg className={`turn-scene ${compact ? 'is-compact' : ''} ${particle ? `is-${particle.toLowerCase()}` : 'is-base'}`} viewBox="0 0 560 260" role="img" aria-label={particle ? `Asociación de TURN ${particle}` : 'Esperas tu turno en el semáforo para girar'}>
    <defs><linearGradient id={`sky-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={off ? '#282825' : '#f5d9b9'} /><stop offset="1" stopColor={off ? '#5b5148' : '#caa17b'} /></linearGradient><filter id={`glow-${id}`}><feGaussianBlur stdDeviation="10" /></filter></defs>
    <rect width="560" height="260" rx="28" fill={`url(#sky-${id})`} />
    <path d="M-20 238 C145 116 338 335 590 116" fill="none" stroke={off ? '#77716a' : '#f4eee6'} strokeWidth="68" />
    <path d="M-20 238 C145 116 338 335 590 116" fill="none" stroke={off ? '#aaa198' : '#b8906e'} strokeWidth="3" strokeDasharray="18 17" opacity=".7" />
    <g transform="translate(250 27)"><rect x="34" y="126" width="10" height="104" rx="5" fill="#56473d" /><rect width="78" height="143" rx="25" fill="#302c29" />{[30, 72, 114].map((cy, index) => <circle key={cy} cx="39" cy={cy} r="15" fill={off ? '#494541' : index === 2 ? '#73d995' : index === 0 ? '#d86658' : '#e6bc62'} opacity={particle === 'ON' || !particle ? 1 : .42} />)}{particle === 'ON' ? <circle cx="39" cy="114" r="30" fill="#7cf2a5" opacity=".45" filter={`url(#glow-${id})`} /> : null}</g>
    <g className="scene-car" transform={particle === 'OVER' ? 'translate(102 165) rotate(165 63 38)' : particle === 'BACK' ? 'translate(228 165) scale(-1 1)' : 'translate(102 165)'}><path d="M8 40 L25 13 Q30 5 43 5 H82 Q94 5 103 17 L116 40" fill="#c66f56" /><rect y="35" width="126" height="40" rx="17" fill="#b85b45" /><circle cx="27" cy="73" r="13" fill="#2f2d2b" /><circle cx="99" cy="73" r="13" fill="#2f2d2b" /></g>
    {particle === 'ON' ? <g transform="translate(397 58)"><rect width="92" height="132" rx="25" fill="#f6eee5" opacity=".94" /><line x1="46" y1="27" x2="46" y2="80" stroke="#ad6549" strokeWidth="13" strokeLinecap="round" /><circle cx="46" cy="93" r="24" fill="none" stroke="#ad6549" strokeWidth="10" /></g> : null}
    {particle === 'OFF' ? <g transform="translate(392 54)"><circle cx="49" cy="49" r="48" fill="#151514" opacity=".72" /><path d="M18 18 L80 80 M80 18 L18 80" stroke="#f5d4b5" strokeWidth="9" strokeLinecap="round" /></g> : null}
    {particle === 'UP' || particle === 'DOWN' ? <g transform="translate(395 67)"><path d="M0 49 H25 L58 19 V111 L25 81 H0Z" fill="#f7efe7" />{[0, 1, 2].map((bar) => <rect key={bar} x={78 + bar * 20} y={particle === 'UP' ? 79 - bar * 25 : 29 + bar * 25} width="11" height={30 + bar * 18} rx="6" fill="#ad6549" />)}</g> : null}
    {particle === 'BACK' ? <path d="M210 132 C140 72 64 102 65 159 M65 159 L42 132 M65 159 L94 137" fill="none" stroke="#ad6549" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {particle === 'INTO' ? <g transform="translate(410 66)"><ellipse cx="30" cy="38" rx="29" ry="40" fill="#d67aa2" transform="rotate(-28 30 38)" /><ellipse cx="82" cy="38" rx="29" ry="40" fill="#7f91d8" transform="rotate(28 82 38)" /><ellipse cx="56" cy="53" rx="8" ry="37" fill="#463d36" /></g> : null}
    {particle === 'OUT' ? <g transform="translate(405 50)"><rect x="10" width="84" height="70" rx="18" fill="#c6d6d3" /><circle cx="36" cy="32" r="8" fill="#ad6549" /><circle cx="70" cy="32" r="8" fill="#ad6549" /><rect x="28" y="50" width="48" height="7" rx="3" fill="#554b44" /><rect y="78" width="104" height="84" rx="22" fill="#9eb8b3" /><path d="M0 100 L-24 139 M104 100 L128 139" stroke="#9eb8b3" strokeWidth="15" strokeLinecap="round" /></g> : null}
    {!particle ? <g transform="translate(0 0)"><circle cx="433" cy="94" r="26" fill="#7d5e48" /><path d="M433 121 V194 M433 144 L397 169 M433 145 L467 166 M433 193 L406 231 M433 193 L464 230" stroke="#7d5e48" strokeWidth="14" strokeLinecap="round" /><path d="M390 46 Q434 16 477 49" fill="none" stroke="#ad6549" strokeWidth="7" strokeDasharray="10 9" /></g> : null}
  </svg>;
}

export function PhrasalFusionDemo({ onBack, onPractice }: { onBack: () => void; onPractice?: (family: PhrasalFamily) => void }) {
  const [selected, setSelected] = useState('TURN');
  const family = phrasalFamilies.find((item) => item.base === selected)!;
  return <div><nav className="review-nav" aria-label="Familias de phrasal verbs"><label htmlFor="fusion-family">Familia</label><select id="fusion-family" value={selected} onChange={(event) => setSelected(event.target.value)}>{phrasalFamilies.map((item) => <option key={item.base} value={item.base}>{item.base} · {item.discoveries.length} expresiones</option>)}</select><small>Laboratorio editorial · no demuestra dominio ni publica contenido.</small></nav><PhrasalFusionFamily key={selected} family={family} onBack={onBack} onPractice={onPractice ? () => onPractice(family) : undefined} /></div>;
}

function PhrasalFusionFamily({ family, onBack, onPractice }: { family: PhrasalFamily; onBack: () => void; onPractice?: () => void }) {
  const discoveries = family.discoveries;
  const storageKey = `memora.fusion.${family.base.toLowerCase()}.discovered`;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [discovered, setDiscovered] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item): item is string => discoveries.some((entry) => entry.particle === item)) : [];
    } catch { return []; }
  });
  const [dragging, setDragging] = useState<{ index: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [overBase, setOverBase] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const fusionTimer = useRef<ReturnType<typeof setTimeout>>();
  const current = discoveries[index];

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(discovered)); }, [discovered, storageKey]);
  useEffect(() => () => clearTimeout(fusionTimer.current), []);

  function discover(nextIndex: number) {
    if (evolving) return;
    const next = discoveries[nextIndex];
    setIndex(nextIndex);
    setRevealed(false);
    setEvolving(true);
    playSnap();
    fusionTimer.current = setTimeout(() => {
      setEvolving(false);
      setRevealed(true);
      setDiscovered((items) => items.includes(next.particle) ? items : [...items, next.particle]);
      void playEnglish(`${family.base.toLowerCase()} ${next.particle.toLowerCase()}`);
    }, 680);
  }

  function isInsideBase(x: number, y: number) {
    const bounds = baseRef.current?.getBoundingClientRect();
    return Boolean(bounds && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom);
  }

  return <main className={`fusion-demo ${evolving ? 'is-evolving' : ''} ${revealed ? 'is-revealed' : ''}`}>
    <header className="fusion-demo-header"><button type="button" onClick={onBack}>← Recorrido</button><span>MEMORA · LABORATORIO</span><strong>{discovered.length}/{discoveries.length}</strong></header>
    <section className="fusion-demo-card">
      <p className="eyebrow">DESCUBRE · FAMILIA {family.base}</p>
      <h1>Une y descubre</h1>
      <p className="fusion-demo-copy">Toca una partícula o arrástrala hasta {family.base}. Cada combinación tiene su propio significado.</p>
      <div className={`fusion-board ${evolving ? 'is-impact' : ''}`} aria-live="polite">
        {!revealed && !evolving ? <div className="fusion-mystery" aria-label="Resultado oculto"><span>?</span><small>Aquí aparecerá<br />la nueva asociación</small></div> : null}
        {evolving ? <div className="fusion-joining" aria-label="Uniendo palabras"><strong>{family.base}</strong><span>+</span><strong>{current.particle}</strong></div> : null}
        {revealed ? <div className="fusion-result">{family.base === 'TURN' ? <TurnScene particle={current.particle} /> : <SceneVisual word={family.word} hideAnswer />}<div className="fusion-result-copy"><strong>{family.base} {current.particle}</strong><small>{current.meaning}</small><p>{current.association}</p><button type="button" onClick={() => void playEnglish(current.sentence)} aria-label={`Escuchar ${current.sentence}`}>🔊 {current.sentence}</button><small>{current.translation}</small><small>{current.sense === 'idiomatic' ? 'Uso idiomático: no se traduce palabra por palabra.' : 'Uso concreto en esta situación.'}</small></div></div> : null}
        {evolving ? <span className="fusion-evolution" aria-hidden="true">✦</span> : null}
      </div>
      <div ref={baseRef} className={`turn-base-card ${overBase ? 'is-drop-target' : ''} ${evolving ? 'is-fusing' : ''}`}>{family.base === 'TURN' ? <TurnScene compact /> : <SceneVisual word={family.word} hideAnswer />}<div className="turn-base-copy"><small className="turn-association-label">ASOCIACIÓN MADRE · {family.word.bridge}</small><strong>{evolving ? `${family.base} ${current.particle}` : family.base}</strong><small>{family.word.es}</small><p>{family.word.scene}</p><button type="button" className="turn-base-audio" onClick={() => void playEnglish(family.base.toLowerCase())} aria-label={`Escuchar ${family.base}`}>🔊 {family.base}</button></div></div>
      <p className="turn-fusion-hint">Toca una partícula o arrástrala sobre <b>{family.base}</b></p>
      <div className="turn-particle-options" aria-label="Partículas disponibles">{discoveries.map((item, itemIndex) => <button
        type="button"
        key={item.particle}
        className={dragging?.index === itemIndex ? 'is-dragging' : ''}
        style={dragging?.index === itemIndex ? { transform: `translate3d(${dragging.x - dragging.startX}px, ${dragging.y - dragging.startY}px, 0)` } : undefined}
        onPointerDown={(event) => {
          if (evolving) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIndex(itemIndex);
          setRevealed(false);
          setDragging({ index: itemIndex, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          if (dragging?.index !== itemIndex) return;
          setOverBase(isInsideBase(event.clientX, event.clientY));
          setDragging({ ...dragging, x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          if (dragging?.index !== itemIndex) return;
          const inside = isInsideBase(event.clientX, event.clientY);
          setDragging(null);
          setOverBase(false);
          if (inside || Math.hypot(dragging.x - dragging.startX, dragging.y - dragging.startY) < 8) discover(itemIndex);
        }}
        onPointerCancel={() => { setDragging(null); setOverBase(false); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); discover(itemIndex); }
        }}
      ><strong>{item.particle}</strong><small>{item.particleMeaning}</small></button>)}</div>
      <div className="fusion-collection"><small>EXPLORADAS · NO EVALUADAS</small><div>{discovered.length ? discovered.map((item) => <span key={item}>{family.base} {item}</span>) : <em>Une la primera palabra.</em>}</div></div>
      {onPractice ? <button type="button" className="primary-action" onClick={onPractice}>Practicar asociaciones de {family.base} →</button> : null}
    </section>
  </main>;
}
