/** Same authored disco → escritorio story, with its cause under learner control. */
export function CausalDeskScene({ active, replay = 0 }: { active: boolean; replay?: number }) {
  return <svg key={replay} className={`causal-desk${active ? ' is-active' : ''}`} viewBox="0 0 420 300" role="img" aria-label={active ? 'El disco ha desplegado patas y se ha convertido en escritorio' : 'Un disco espera antes de desplegar sus patas'}>
    <rect width="420" height="300" rx="28" fill="#f8f0dc" />
    <ellipse cx="210" cy="257" rx="135" ry="15" fill="var(--line)" opacity=".3" />
    <g className="causal-desk-legs" stroke="#997250" strokeWidth="15" strokeLinecap="round"><path d="M125 154L105 250M210 168V255M295 154L315 250" /></g>
    <g className="causal-desk-disc">
      <ellipse cx="210" cy="151" rx="112" ry="39" fill="#233f38" />
      <ellipse cx="210" cy="139" rx="112" ry="39" fill="#356f65" />
      <ellipse cx="210" cy="139" rx="93" ry="30" fill="none" stroke="#80a799" strokeWidth="3" />
      <ellipse cx="210" cy="139" rx="21" ry="9" fill="#cc9a51" /><ellipse cx="210" cy="139" rx="5" ry="3" fill="#f8f0dc" />
    </g>
    <g className="causal-desk-tools">
      <path d="M127 133L157 121L185 135L157 148Z" fill="#f8f0dc" stroke="#cc9a51" strokeWidth="3" />
      <path d="M141 134L158 128M147 138L165 132" stroke="#ac8058" strokeWidth="2" />
      <path d="M257 126L270 81L251 67" fill="none" stroke="#997250" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="257" cy="127" rx="18" ry="5" fill="#997250" /><path d="M236 52L255 61L247 86L223 74Z" fill="#cc9a51" />
      <path d="M230 80L213 112L244 110Z" fill="#fff8df" opacity=".8" />
    </g>
  </svg>;
}
