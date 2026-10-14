/** A code-native scene, so the functional pilot does not wait for paid image generation. */
export function KeysScene({ found = false, focus = 'key' }: { found?: boolean; focus?: 'key' | 'phone' | 'pocket' | 'lock' }) {
  return <svg className={`keys-scene ${found ? 'is-found' : ''}`} viewBox="0 0 640 280" aria-hidden="true">
    <rect width="640" height="280" rx="24" fill="#eedfcb" /><path d="M0 218H640V280H0Z" fill="#ccab83" />
    <rect x="460" y="27" width="105" height="190" rx="10" fill="#85745f" /><rect x="472" y="40" width="80" height="165" rx="6" fill="#c6b291" /><circle cx="537" cy="129" r="5" fill="#614d3d" />
    <path d="M39 35h142v104H39Z" fill="#f9f0dd" /><path d="M51 119l42-55 27 28 23-35 26 62Z" fill="#87a077" />
    <ellipse cx="238" cy="233" rx="110" ry="18" fill="#907252" opacity=".2" />
    <rect x="111" y="159" width="241" height="20" rx="9" fill="#815c43" /><path d="M130 179v65m198-65v65" stroke="#815c43" strokeWidth="13" />
    <ellipse cx="210" cy="155" rx="68" ry="10" fill="#d4bc93" /><ellipse cx="210" cy="155" rx="53" ry="6" fill="#eee0c5" />
    {focus === 'key' ? <g className="kiwi-character" style={{ transform: found ? 'translateX(48px)' : undefined }}>
      <ellipse cx="390" cy="191" rx="49" ry="59" fill="#89704e" /><ellipse cx="390" cy="178" rx="39" ry="41" fill="#92b745" /><ellipse cx="390" cy="179" rx="27" ry="29" fill="#c9d584" />
      {[0, 1, 2, 3, 4, 5].map((seed) => <ellipse key={seed} cx={390 + Math.cos(seed) * 22} cy={180 + Math.sin(seed) * 22} rx="2.5" ry="4" fill="#3c4230" transform={`rotate(${seed * 45} ${390 + Math.cos(seed) * 22} ${180 + Math.sin(seed) * 22})`} />)}
      <ellipse cx="379" cy="168" rx="5" ry="7" fill="#282b25" /><ellipse cx="402" cy="168" rx="5" ry="7" fill="#282b25" />
      <path d={found ? 'M376 194q14 12 29 0' : 'M378 194q13-9 27 0'} fill="none" stroke="#403a2a" strokeWidth="4" strokeLinecap="round" />
      <path d="M348 194l-23 16m101-13 20 10m-74 31-9 17m46-17 10 17" stroke="#89704e" strokeWidth="9" strokeLinecap="round" />
      {!found ? <g transform="translate(358 194) rotate(-15)"><circle r="13" fill="none" stroke="#e4b64a" strokeWidth="7" /><path d="M12 0h39m-7 0v11m-13-11v8" stroke="#e4b64a" strokeWidth="7" /></g> : null}
    </g> : focus === 'phone' ? <g><path d="M361 136h77l-8 82q-29 29-59 0Z" fill="#596f93" /><path d="M367 172q29 20 63 0" fill="none" stroke="#cad8e6" strokeWidth="3" strokeDasharray="5 5" /><g transform="rotate(13 410 129)"><rect x="386" y="78" width="44" height="89" rx="8" fill="#383b43" /><rect x="392" y="90" width="32" height="59" rx="3" fill="#92c6b5" /><circle cx="408" cy="157" r="3" fill="#d0d9d9" /></g></g> : focus === 'pocket' ? <g><path d="M345 142q45-24 90 0l-9 82q-36 20-72 0Z" fill="#596f93" /><path d="M353 165q36 22 74 0" fill="none" stroke="#d6e0e9" strokeWidth="4" /><rect x="365" y="103" width="58" height="55" rx="5" transform="rotate(-14 394 130)" fill="#b77c50" /><path d="M367 113h54m-25-10v54" stroke="#f0d3a8" strokeWidth="7" /></g> : <g><circle cx="391" cy="161" r="43" fill="#e1bf65" stroke="#9c7442" strokeWidth="8" /><circle cx="391" cy="161" r="16" fill="#5d4d3b" /><path d="M386 161l-17 29m22-14l13 23m-8-21l20 17" stroke="#5d4d3b" strokeWidth="6" strokeLinecap="round" /><path d="M363 114l-13-18m57 15l14-19" stroke="#bd8150" strokeWidth="6" strokeLinecap="round" /></g>}
    {found ? <g transform="translate(207 150)"><circle r="10" fill="none" stroke="#d0a336" strokeWidth="6" /><path d="M9 0h32m-6 0v9m-11-9v6" stroke="#d0a336" strokeWidth="6" /></g> : null}
  </svg>;
}
