import { useId } from 'react';

/** One room throughout the episode; object changes communicate intention. */
export function KeysSituationScene({ object = 'keys', found = false }: { object?: 'keys' | 'phone'; found?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`situation-room${found ? ' is-found' : ''}`} viewBox="0 0 520 290" role="img" aria-label={object === 'keys' ? found ? 'El mensaje señala las llaves en la entrada' : 'Buscas las llaves antes de salir' : found ? 'El mensaje señala el móvil en la entrada' : 'Buscas el móvil antes de salir'}>
    <defs><linearGradient id={`wall-${id}`} x2="1" y2="1"><stop stopColor="#294b57" /><stop offset="1" stopColor="#10262e" /></linearGradient><linearGradient id={`light-${id}`}><stop stopColor="#e4c998" stopOpacity=".25" /><stop offset="1" stopColor="#e4c998" stopOpacity="0" /></linearGradient></defs>
    <rect width="520" height="290" rx="30" fill={`url(#wall-${id})`} /><path d="M0 228H520V290H0Z" fill="#10252d" />
    <path d="M47 0H167L255 228H0Z" fill={`url(#light-${id})`} />
    <rect x="359" y="29" width="112" height="201" rx="9" fill="#46616a" /><rect x="370" y="39" width="90" height="187" rx="5" fill="#24434e" /><path d="M374 44H457V223" stroke="#b6c2b4" strokeOpacity=".3" fill="none" /><circle cx="441" cy="139" r="5" fill="#d8bc7c" />
    <rect x="42" y="36" width="102" height="103" rx="9" fill="#768b8c" /><rect x="49" y="43" width="88" height="89" rx="5" fill="#274953" /><path d="M52 108L80 66L99 89L114 71L135 127H52Z" fill="#99b9a5" opacity=".65" />
    <ellipse cx="226" cy="253" rx="104" ry="15" fill="#07191f" opacity=".4" /><path d="M98 187H335M115 193V258M319 193V258" stroke="#b6a27e" strokeWidth="11" strokeLinecap="round" /><rect x="92" y="174" width="249" height="18" rx="8" fill="#d1bd95" /><ellipse cx="213" cy="172" rx="62" ry="9" fill="#718b87" /><ellipse cx="213" cy="170" rx="51" ry="5" fill="#263f45" />
    <g className="situation-room-object" opacity={found ? 1 : .42}>
      {object === 'keys' ? <g transform="translate(208 166) rotate(-16)"><circle r="12" fill="none" stroke="#f2ca78" strokeWidth="6" /><path d="M12 0H53M46 0V12M34 0V8" stroke="#f2ca78" strokeWidth="6" strokeLinecap="round" /></g> : <g transform="translate(272 105) rotate(11)"><rect width="40" height="69" rx="8" fill="#15232d" stroke="#94b6b5" strokeWidth="2" /><rect x="5" y="8" width="30" height="48" rx="4" fill="#abd7c6" /><path d="M13 4H27" stroke="#94b6b5" strokeWidth="2" /><circle cx="20" cy="63" r="2" fill="#94b6b5" /></g>}
    </g>
    {!found ? <circle className="situation-search-ring" cx={object === 'keys' ? 217 : 294} cy={object === 'keys' ? 167 : 140} r="37" stroke="#bcdece" strokeDasharray="4 7" strokeWidth="2" fill="none" /> : null}
  </svg>;
}
