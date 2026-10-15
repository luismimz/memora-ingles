/** Lightweight, code-native scenery. Not an image of the mnemonic or an answer cue. */
export function JourneyScene({ scene = 'home' }: { scene?: string }) {
  const city = scene === 'city';
  const food = scene === 'food';
  const work = scene === 'technology' || scene === 'work';
  return <svg className={`journey-scene scene-${scene}`} viewBox="0 0 400 230" aria-hidden="true" focusable="false">
    <rect width="400" height="230" rx="22" fill={city ? '#b9d9dc' : food ? '#f1d0a7' : work ? '#c7c6e6' : '#c9dbc8'} />
    <circle cx="325" cy="46" r="27" fill="#fff0bb" />
    <path d="M0 177 Q100 135 210 175 T400 166 V230 H0Z" fill={city ? '#84b3ae' : '#a0bda1'} />
    <path d="M160 230 Q270 178 215 144" stroke="#f5dfb9" strokeWidth="42" fill="none" />
    {scene === 'learning' ? <>
      <path d="M82 80q54-21 108 10v84q-55-29-108-8Zm108 10q54-31 108-10v86q-55-21-108 8Z" fill="#fff5da" stroke="#b89571" strokeWidth="5" strokeLinejoin="round" />
      <path d="M106 103h47m-47 20h47m62-20h54m-54 20h54" stroke="#9ab7a0" strokeWidth="6" strokeLinecap="round" /><path d="m189 89 16-43 19 28" stroke="#cf955d" strokeWidth="7" fill="none" />
    </> : scene === 'leisure' ? <>
      <path d="M105 100q-23 65-5 71t45-22h89q27 28 45 21t-5-70q-9-22-36-12l-26 4h-47l-26-4q-25-10-34 12Z" fill="#668b8b" stroke="#527273" strokeWidth="5" />
      <path d="M129 109v28m-14-14h28" stroke="#fff1cb" strokeWidth="8" strokeLinecap="round" /><circle cx="240" cy="113" r="7" fill="#eeb384" /><circle cx="253" cy="132" r="7" fill="#d6dfac" />
    </> : scene === 'health' ? <>
      <rect x="91" y="72" width="188" height="104" rx="16" fill="#fff0d5" /><path d="M156 69V51h58v18" stroke="#9c816b" strokeWidth="9" fill="none" /><path d="M185 92v61m-30-30h60" stroke="#ce886d" strokeWidth="20" strokeLinecap="round" />
    </> : city ? <>
      <path d="M48 174V82L95 58l48 24v92Z" fill="#d89272" /><path d="M52 82h87" stroke="#8b584b" strokeWidth="9" />
      <rect x="159" y="91" width="91" height="82" rx="8" fill="#f0d6a3" /><path d="M151 92l54-35 53 35" fill="#73999f" />
      {[70,105,177,217].map((x) => <rect key={x} x={x} y="112" width="15" height="23" rx="4" fill="#fff3c9" />)}
      <rect x="192" y="144" width="25" height="30" rx="7" fill="#8b735f" />
    </> : food ? <>
      <rect x="68" y="137" width="242" height="17" rx="8" fill="#a57859" /><path d="M82 153v47m214-47v47" stroke="#805e49" strokeWidth="12" />
      <path d="M133 115h110q-8 39-55 39t-55-39Z" fill="#d67c59" /><ellipse cx="188" cy="115" rx="55" ry="12" fill="#f7c870" />
      <path d="M163 91q-15-17 0-33m26 33q-15-17 0-33m26 33q-15-17 0-33" stroke="#fff4dc" strokeWidth="6" fill="none" strokeLinecap="round" />
    </> : work ? <>
      <rect x="70" y="147" width="244" height="15" rx="6" fill="#a78670" /><path d="M84 161v40m216-40v40" stroke="#836b61" strokeWidth="11" />
      <rect x="113" y="65" width="145" height="90" rx="12" fill="#5b697d" /><rect x="123" y="75" width="125" height="67" rx="7" fill="#e3f2ef" />
      <path d="m151 106 14 13 38-27" stroke="#6fafa2" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </> : <>
      <path d="M73 170V99l90-62 90 62v71Z" fill="#f1d6ab" /><path d="m61 104 102-72 103 72" stroke="#a97862" strokeWidth="15" fill="none" strokeLinejoin="round" />
      <rect x="142" y="111" width="43" height="59" rx="17" fill="#7da5a1" /><rect x="96" y="111" width="26" height="29" rx="6" fill="#fff3c2" /><rect x="205" y="111" width="26" height="29" rx="6" fill="#fff3c2" />
    </>}
    <path d="M335 178v-52" stroke="#8c775f" strokeWidth="9" /><circle cx="334" cy="111" r="29" fill="#7fa591" /><circle cx="315" cy="126" r="22" fill="#8db69b" />
    <path d="m40 42 5 10 11 2-8 8 1 11-9-5-10 5 2-11-8-8 11-2Z" fill="#fff5cf" />
  </svg>;
}
