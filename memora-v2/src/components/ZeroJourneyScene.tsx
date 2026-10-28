import { useId } from 'react';

/** Original code-native scene: state changes the object, not just its decoration. */
export function ZeroJourneyScene({ drink = 'water', active = false, cold = false, celebrate = false, mnemonic, rejected = false, iced = false, served = false }: { drink?: 'water' | 'coffee'; active?: boolean; cold?: boolean; celebrate?: boolean; mnemonic?: 'water' | 'coffee'; rejected?: boolean; iced?: boolean; served?: boolean }) {
  const id = useId().replace(/:/gu, '');
  const happy = celebrate || active && !cold && !rejected;
  const description = cold ? celebrate ? 'La bufanda vuelve a Byte, que ya no tiembla' : active ? 'La col ha robado la bufanda de Byte, que tiembla de frío' : 'Byte lleva una bufanda; una col helada se acerca'
    : rejected ? `Byte aparta la taza de ${drink === 'coffee' ? 'café' : 'agua'}: no la quiere`
    : iced ? `Hay hielo en la ${drink === 'coffee' ? 'taza de café frío' : 'taza de agua fría'}`
    : mnemonic === 'water' ? active ? 'Un wáter estornuda: el agua salta, llena la taza e inunda el suelo' : 'Un wáter junto a una taza vacía'
    : mnemonic === 'coffee' && active ? 'El café salta fuera de la taza y vuelve a caer dentro'
    : active || served ? drink === 'water' ? 'La taza se llena de agua' : 'La taza está llena de café caliente' : 'Byte espera tu pedido junto a una taza vacía';
  return <svg className={`zero-scene${drink === 'coffee' ? ' is-coffee' : ''}${active ? ' is-active' : ''}${cold ? ' is-cold' : ''}${celebrate ? ' is-celebrating' : ''}${mnemonic ? ` mnemonic-${mnemonic}` : ''}${rejected ? ' is-rejected' : ''}${iced ? ' is-iced' : ''}${served ? ' is-served' : ''}`} viewBox="0 0 480 280" role="img" aria-label={description}>
    <defs><linearGradient id={`zero-cup-${id}`} x2="0" y2="1"><stop stopColor="#ffffff" stopOpacity=".2" /><stop offset="1" stopColor="#ffffff" stopOpacity=".04" /></linearGradient></defs>
    <ellipse cx="240" cy="244" rx="190" ry="18" fill="#000000" opacity=".18" />
    <path d="M42 234H438" stroke="#536078" strokeWidth="2" />
    {mnemonic === 'water' ? <g className="zero-wc"><rect x="70" y="90" width="92" height="77" rx="14" fill="#e0e8fc" /><rect x="64" y="85" width="104" height="10" rx="5" fill="#9fafff" /><path d="M64 167H175Q169 211 113 211Q70 211 64 167Z" fill="#e0e8fc" /><path d="M98 205V234H147L138 205" fill="#b8c9e9" /><path d="M147 114H159" stroke="#6b84b6" strokeWidth="6" strokeLinecap="round" /><path d="M92 143Q98 136 104 143M129 143Q135 136 141 143" stroke="#31436a" strokeWidth="3" fill="none" /><text className="zero-sneeze" x="60" y="65" fill="#a2e8d2" fontSize="24" fontWeight="750">¡ACHÍS!</text><path className="zero-water-arc" d="M160 155Q223 25 300 158" stroke="#71e0e0" strokeWidth="9" strokeLinecap="round" fill="none" /><path className="zero-flood" d="M52 232Q80 220 110 232T175 232T240 232T305 232T380 232L408 252H42Z" fill="#71e0e0" opacity=".65" /></g> : <g className="zero-byte"><path d="M120 75V48" stroke="#9fafff" strokeWidth="5" /><circle cx="120" cy="43" r="7" fill="#c5d0ff" />
      <rect x="58" y="73" width="127" height="113" rx="36" fill="#a4b6ee" /><rect x="68" y="85" width="107" height="77" rx="26" fill="#151e38" />
      <path d={happy ? 'M90 119Q98 107 106 119M139 119Q147 107 155 119' : 'M96 112V122M148 112V122'} stroke="#c7fff0" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={happy ? 'M113 140Q123 149 133 140' : 'M116 143H130'} stroke="#c7fff0" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M82 183L75 227M159 183L166 227M182 129Q212 133 221 160" stroke="#a4b6ee" strokeWidth="12" fill="none" strokeLinecap="round" />
      {cold ? <path className="zero-byte-scarf" d="M67 168Q121 197 178 168V185Q126 216 67 187ZM148 193V235H168V190" fill="#f0b18b" /> : null}
    </g>}
    {!cold ? <g className="zero-cup"><path d="M349 132H371Q396 132 389 158Q385 177 355 174" stroke="#d5e4ff" strokeWidth="8" fill="none" />
      <path d="M250 114H360L347 211Q305 235 263 211Z" fill={`url(#zero-cup-${id})`} stroke="#d5e4ff" strokeWidth="3" />
      <path className="zero-liquid" d="M260 156Q280 147 304 156T350 156L344 207Q306 224 267 207Z" fill={drink === 'water' ? '#71e0e0' : '#ce9468'} />
      {mnemonic === 'coffee' ? <g className="zero-coffee-splash" fill="#ce9468"><path d="M278 155Q280 125 304 132Q329 125 333 155Z" /><circle cx="272" cy="141" r="5" /><circle cx="340" cy="138" r="4" /></g> : null}
      <g className="zero-ice" fill="#ddf8ff" stroke="#8acbe4" strokeWidth="2"><rect x="277" y="149" width="23" height="23" rx="5" transform="rotate(-12 288 160)" /><rect x="309" y="158" width="24" height="24" rx="5" transform="rotate(12 320 170)" /></g>
      <g className="zero-steam" fill="none" stroke="#e7d4b9" strokeWidth="4" strokeLinecap="round"><path d="M285 93Q271 78 285 60" /><path d="M314 89Q300 74 314 56" /><path d="M342 94Q328 79 342 61" /></g>
      <ellipse cx="304" cy="232" rx="74" ry="7" fill="#8091bb" opacity=".2" />
    </g> : <g className="zero-cabbage"><circle cx="308" cy="162" r="64" fill="#a9ddb6" /><path d="M281 108Q315 150 277 205M315 102Q277 143 338 198M257 137Q312 178 365 145" fill="none" stroke="#538c6f" strokeWidth="5" /><g className="zero-scarf" fill="#f0b18b"><path d="M253 177Q312 213 368 178L363 205Q309 235 249 200Z" /><path d="M331 207V249H354V203" /></g><g fill="#c2eeff"><path d="m378 78 6 9 10-2-5 10 5 8-11-1-7 9-2-11-10-4 10-4Z" /><circle cx="245" cy="83" r="4" /><circle cx="389" cy="218" r="5" /></g></g>}
  </svg>;
}

/** A different action/context, not another coloured cup. The key has a consequence. */
export function ZeroDoorScene({ discovered = false, owned = false, opened = false, mnemonic = false }: { discovered?: boolean; owned?: boolean; opened?: boolean; mnemonic?: boolean }) {
  return <svg className={`zero-scene zero-door-scene${discovered ? ' is-discovered' : ''}${owned ? ' is-owned' : ''}${opened ? ' is-open' : ''}`} viewBox="0 0 480 280" role="img" aria-label={opened ? 'La llave gira y la puerta se abre' : owned ? 'Ya tienes una llave en la mano, junto a la puerta cerrada' : mnemonic ? discovered ? 'El kiwi se convierte en una llave al girar en la cerradura' : 'Un kiwi intenta girar en la cerradura de una puerta' : 'La puerta está cerrada. Necesitas pedir una llave'}>
    <path d="M55 250H440" stroke="#536078" strokeWidth="2" />
    <rect x="264" y="33" width="142" height="214" rx="12" fill="#d2f1df" />
    <g className="zero-door-panel"><rect x="270" y="39" width="130" height="208" rx="8" fill="#ab8278" /><rect x="286" y="60" width="97" height="70" rx="5" fill="#926b67" /><rect x="286" y="183" width="97" height="46" rx="5" fill="#926b67" /><circle cx="294" cy="158" r="13" fill="#f6d69b" /><path d="M294 152V165" stroke="#584b50" strokeWidth="5" strokeLinecap="round" /></g>
    <path d="M401 40V248" stroke="#647e8d" strokeWidth="3" />
    <g className="zero-hand" fill="#b5c4ff"><path d="M77 219L110 178Q116 172 125 178L153 188L183 175Q198 171 201 181Q204 193 190 201L156 227Q144 238 127 229L113 224L99 242Z" /><path d="M112 181V152Q112 139 123 141Q135 142 134 154V185" /></g>
    {mnemonic && !discovered ? <g className="zero-kiwi"><ellipse cx="254" cy="155" rx="39" ry="30" fill="#a67d52" transform="rotate(-16 254 155)" /><ellipse cx="259" cy="153" rx="30" ry="23" fill="#b8dc79" transform="rotate(-16 259 153)" /><ellipse cx="260" cy="153" rx="12" ry="9" fill="#edf2b4" /><g fill="#334328"><circle cx="245" cy="148" r="2" /><circle cx="249" cy="162" r="2" /><circle cx="271" cy="143" r="2" /><circle cx="277" cy="158" r="2" /></g></g> : discovered || owned ? <g className="zero-door-key" fill="none" stroke="#f6d69b" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"><circle cx="223" cy="156" r="20" /><path d="M244 156H290M274 156V169M287 156V168" /></g> : null}
    <g className="zero-door-light" fill="#f6d69b"><path d="m215 60 5 12 13 1-10 9 3 13-11-7-12 7 3-13-10-9 14-1Z" /><circle cx="178" cy="94" r="4" /></g>
  </svg>;
}
