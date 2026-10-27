import { useId } from 'react';

/** Original code-native scene: state changes the object, not just its decoration. */
export function ZeroJourneyScene({ drink = 'water', active = false, cold = false, celebrate = false }: { drink?: 'water' | 'coffee'; active?: boolean; cold?: boolean; celebrate?: boolean }) {
  const id = useId().replace(/:/gu, '');
  return <svg className={`zero-scene${drink === 'coffee' ? ' is-coffee' : ''}${active ? ' is-active' : ''}${cold ? ' is-cold' : ''}${celebrate ? ' is-celebrating' : ''}`} viewBox="0 0 480 280" role="img" aria-label={cold ? active ? 'Una col helada se envuelve en una bufanda; Byte tiembla de frío' : 'Una col se acerca a la bufanda de Byte' : active ? drink === 'water' ? 'Byte sirve agua: el vaso se llena y el robot sonríe' : 'Byte sirve café: la taza se llena y sale vapor' : 'Byte espera tu pedido junto a una taza vacía'}>
    <defs><linearGradient id={`zero-cup-${id}`} x2="0" y2="1"><stop stopColor="#ffffff" stopOpacity=".2" /><stop offset="1" stopColor="#ffffff" stopOpacity=".04" /></linearGradient></defs>
    <ellipse cx="240" cy="244" rx="190" ry="18" fill="#000000" opacity=".18" />
    <path d="M42 234H438" stroke="#536078" strokeWidth="2" />
    <g className="zero-byte"><path d="M120 75V48" stroke="#9fafff" strokeWidth="5" /><circle cx="120" cy="43" r="7" fill="#c5d0ff" />
      <rect x="58" y="73" width="127" height="113" rx="36" fill="#a4b6ee" /><rect x="68" y="85" width="107" height="77" rx="26" fill="#151e38" />
      <path d={celebrate || active ? 'M90 119Q98 107 106 119M139 119Q147 107 155 119' : 'M96 112V122M148 112V122'} stroke="#c7fff0" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={active ? 'M113 140Q123 149 133 140' : 'M116 143H130'} stroke="#c7fff0" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M82 183L75 227M159 183L166 227M182 129Q212 133 221 160" stroke="#a4b6ee" strokeWidth="12" fill="none" strokeLinecap="round" />
    </g>
    {!cold ? <g className="zero-cup"><path d="M349 132H371Q396 132 389 158Q385 177 355 174" stroke="#d5e4ff" strokeWidth="8" fill="none" />
      <path d="M250 114H360L347 211Q305 235 263 211Z" fill={`url(#zero-cup-${id})`} stroke="#d5e4ff" strokeWidth="3" />
      <path className="zero-liquid" d="M260 156Q280 147 304 156T350 156L344 207Q306 224 267 207Z" fill={drink === 'water' ? '#71e0e0' : '#ce9468'} />
      <g className="zero-steam" fill="none" stroke="#e7d4b9" strokeWidth="4" strokeLinecap="round"><path d="M285 93Q271 78 285 60" /><path d="M314 89Q300 74 314 56" /><path d="M342 94Q328 79 342 61" /></g>
      <ellipse cx="304" cy="232" rx="74" ry="7" fill="#8091bb" opacity=".2" />
    </g> : <g className="zero-cabbage"><circle cx="308" cy="162" r="64" fill="#a9ddb6" /><path d="M281 108Q315 150 277 205M315 102Q277 143 338 198M257 137Q312 178 365 145" fill="none" stroke="#538c6f" strokeWidth="5" /><path className="zero-scarf" d="M253 177Q312 213 368 178L363 205Q309 235 249 200Z" fill="#f0b18b" /><path d="M331 207V249H354V203" fill="#f0b18b" /><g fill="#c2eeff"><path d="m378 78 6 9 10-2-5 10 5 8-11-1-7 9-2-11-10-4 10-4Z" /><circle cx="245" cy="83" r="4" /><circle cx="389" cy="218" r="5" /></g></g>}
  </svg>;
}
