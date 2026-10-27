/** The exact KIWI swallowing the KEY story, not an illustration for another cue. */
export function CausalKeyScene({ active }: { active: boolean }) {
  return <svg className={`causal-key${active ? ' is-active' : ''}`} viewBox="0 0 420 250" role="img" aria-label={active ? 'El kiwi se ha tragado la llave y sale rodando' : 'Una llave se acerca al kiwi que va a tragársela'}>
    <rect width="420" height="250" rx="28" fill="#183841" /><ellipse cx="260" cy="209" rx="80" ry="10" fill="#0b252e" />
    <g className="causal-key-fruit"><ellipse cx="267" cy="131" rx="64" ry="73" fill="#9c8158" /><ellipse cx="253" cy="122" rx="51" ry="57" fill="#b5d572" /><ellipse cx="253" cy="122" rx="18" ry="22" fill="#e7ecb7" />{Array.from({ length: 12 }, (_, index) => { const angle = index * Math.PI / 6; return <ellipse key={index} cx={253 + Math.cos(angle) * 32} cy={122 + Math.sin(angle) * 36} rx="2" ry="4" fill="#2d4134" transform={`rotate(${index * 30} ${253 + Math.cos(angle) * 32} ${122 + Math.sin(angle) * 36})`} />; })}<ellipse cx="212" cy="146" rx="14" ry="18" fill="#1a3338" /></g>
    <g className="causal-key-object" transform="translate(94 146)"><circle r="17" fill="none" stroke="#f0ca7a" strokeWidth="8" /><path d="M18 0H75M62 0V16M45 0V11" stroke="#f0ca7a" strokeWidth="8" strokeLinecap="round" /></g>
    <path className="causal-key-trail" d="M298 211H346M321 201H359" fill="none" stroke="#badbb7" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
