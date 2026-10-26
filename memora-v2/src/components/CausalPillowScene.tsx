import './causalPillowScene.css';

/** The existing PILOTO landing and bouncing on ALMOHADA, not an invented bridge. */
export function CausalPillowScene({ active, replay = 0, animate = true, decorative = false }: { active: boolean; replay?: number; animate?: boolean; decorative?: boolean }) {
  return <svg key={replay} className={`causal-pillow${active ? ' is-active' : ''}${animate ? ' is-animated' : ''}`} data-mnemonic-scene="pillow-piloto" viewBox="0 0 420 300" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : active ? 'El piloto aterriza sobre la almohada y rebota' : 'El piloto está sobre una gran almohada, preparado para aterrizar'}>
    <rect width="420" height="300" rx="28" fill="#f8f0dc" />
    <path d="M52 242H368" stroke="#d9c9af" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="210" cy="236" rx="124" ry="11" fill="#d9c9af" opacity=".55" />
    <path d="M325 43L356 34L362 38L350 49L365 53L365 58L343 56L331 65L326 63L331 53L318 49Z" fill="#c5ad7d" />
    <g className="causal-pillow-cushion">
      <path d="M99 186Q210 163 321 186L329 222Q210 246 91 222Z" fill="#edf3f8" stroke="#8facc2" strokeWidth="4" strokeLinejoin="round" />
      <path d="M112 191Q210 175 308 191L314 216Q210 233 106 216Z" fill="none" stroke="#c3d4e0" strokeWidth="2" />
      <path d="M99 186L112 199M321 186L307 199M329 222L311 214M91 222L109 214" stroke="#8facc2" strokeWidth="3" strokeLinecap="round" />
    </g>
    <g className="causal-pillow-pilot">
      <path d="M194 101L190 130M226 101L230 130" fill="none" stroke="#344d64" strokeWidth="12" strokeLinecap="round" />
      <path d="M187 132H202M219 132H234" stroke="#263544" strokeWidth="6" strokeLinecap="round" />
      <path d="M191 72Q210 64 229 72L231 109H189Z" fill="#fffdf7" stroke="#c3c8c9" strokeWidth="2" />
      <path d="M193 76L179 98M227 76L241 98" stroke="#c79772" strokeWidth="8" strokeLinecap="round" />
      <path d="M206 73H214L218 100L210 106L202 100Z" fill="#344d64" />
      <path d="M195 78H201M220 78H226" stroke="#c5ad7d" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="210" cy="53" rx="19" ry="22" fill="#c79772" />
      <path d="M190 47Q210 35 230 47L232 35Q210 22 188 35Z" fill="#344d64" />
      <path d="M190 46Q210 56 230 46" fill="none" stroke="#263544" strokeWidth="6" strokeLinecap="round" />
      <path d="M198 38H222M210 34V42" stroke="#d6bb75" strokeWidth="3" strokeLinecap="round" />
      <path d="M202 61Q210 66 218 61" fill="none" stroke="#71503b" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>;
}
