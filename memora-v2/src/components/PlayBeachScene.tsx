/** The familiar PLAYA bridge acts inside the room, rather than unrelated pictograms. */
export function PlayBeachScene() {
  return <svg className="mirror-scene" viewBox="0 0 600 220" role="img" aria-label="Una playa invade el salón; una ola levanta el mando con el que juegas.">
    <rect width="600" height="220" rx="24" fill="#f2dfc9" /><rect x="40" y="28" width="90" height="78" rx="7" fill="#eaf0e8" />
    <path d="M0 159 Q145 117 294 162T600 160 V220H0Z" fill="#e6c087" />
    <rect x="370" y="100" width="180" height="59" rx="19" fill="#718478" /><rect x="385" y="83" width="69" height="55" rx="13" fill="#8ea08f" /><rect x="464" y="83" width="70" height="55" rx="13" fill="#8ea08f" />
    <path d="M0 180Q89 155 156 163 Q233 182 279 123 Q316 70 357 107 Q312 90 306 139 Q290 214 189 213 H0Z" fill="#73b9bd" />
    <path d="M183 181Q275 193 299 124Q313 89 336 101" fill="none" stroke="#d6f1e6" strokeWidth="8" strokeLinecap="round" />
    <path d="M140 59V160" stroke="#89654b" strokeWidth="5" /><path d="M83 69Q140-20 197 69Z" fill="#b86748" /><path d="M109 69Q140-10 165 69Z" fill="#f8d786" />
    <g transform="translate(275 100) rotate(-18)"><path d="M-42-5Q-46-26-23-26H23Q45-26 42-5L51 22Q45 42 24 21H-24Q-47 43-51 22Z" fill="#3c4543" /><path d="M-24-15V7M-35-4H-13" stroke="#d2c6ae" strokeWidth="7" /><circle cx="24" cy="-8" r="5" fill="#f5bc64" /><circle cx="32" cy="5" r="5" fill="#c16b51" /></g>
    <path d="M337 60l10-19m13 35 21-3m-64-25-4-20" stroke="#b86748" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}
