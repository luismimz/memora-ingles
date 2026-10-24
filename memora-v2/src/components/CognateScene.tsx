import type { CognateSceneKind } from '../domain/wordVisual';
import radioScene from '../assets/cognate-radio-v1.svg';
import musicScene from '../assets/cognate-music-v1.svg';

/** Direct-meaning scenes: no invented sound bridge and no written answer in Arcade. */
export function CognateScene({ kind }: { kind: CognateSceneKind }) {
  if (kind === 'radio' || kind === 'music') return <img className="cognate-scene" data-cognate-scene={kind} src={kind === 'radio' ? radioScene : musicScene} alt="" aria-hidden="true" draggable={false} loading="eager" />;
  return <svg className="cognate-scene" data-cognate-scene={kind} viewBox="0 0 400 250" aria-hidden="true" focusable="false">
    <ellipse cx="201" cy="224" rx="151" ry="12" fill="#a77c5a" opacity=".15" />
    {kind === 'hotel' ? <>
      <circle cx="323" cy="43" r="22" fill="#fff0bb" />
      <path d="M77 212V50q0-13 13-13h169q13 0 13 13v162Z" fill="#e0ab84" stroke="#9a6d58" strokeWidth="4" />
      <path d="M68 43h213" stroke="#906457" strokeWidth="12" strokeLinecap="round" />
      {[99,147,195,243].map((x) => <g key={x}><rect x={x-10} y="64" width="23" height="32" rx="5" fill="#fff0bb" /><rect x={x-10} y="112" width="23" height="32" rx="5" fill="#fff0bb" /><path d={`M${x+1} 65v30m-10-15h21M${x+1} 113v30m-10-15h21`} stroke="#c69876" strokeWidth="3" /></g>)}
      <path d="M145 213v-40q0-15 26-15t26 15v40" fill="#718f8d" stroke="#526f71" strokeWidth="4" />
      <path d="M132 162h78l-11-18h-55Z" fill="#ad6851" /><path d="M170 165v48" stroke="#dce4cb" strokeWidth="3" />
      <g transform="translate(291 161) rotate(9)"><path d="M-12-5v-15h24v15" fill="none" stroke="#806957" strokeWidth="5" /><rect x="-25" y="-6" width="50" height="61" rx="10" fill="#7ba3a0" stroke="#557d7c" strokeWidth="4" /><path d="M-12 5v36m24-36v36" stroke="#a9c6b9" strokeWidth="4" /><circle cx="-15" cy="59" r="5" fill="#655c53" /><circle cx="15" cy="59" r="5" fill="#655c53" /></g>
      <g transform="translate(328 89) rotate(-17)"><circle r="16" fill="none" stroke="#e8ba62" strokeWidth="9" /><path d="M0 17v43m0-9h16m-16-11h13" fill="none" stroke="#e8ba62" strokeWidth="9" strokeLinecap="round" /></g>
      <path d="m296 56 5 8 9 1-7 6 2 9-9-5-8 5 2-9-7-6 9-1Z" fill="#fff5ce" />
    </> : <>
      <path d="M76 211V52q0-11 11-11h184q11 0 11 11v159Z" fill="#769897" stroke="#557474" strokeWidth="4" />
      <rect x="91" y="56" width="176" height="137" rx="9" fill="#fff3d9" />
      <path d="m106 157 28-22 33 8 29-29 46 9" stroke="#d3ad7e" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M110 73h48v39h-48Z" fill="#c0d8c5" /><circle cx="133" cy="92" r="11" fill="#e9c278" />
      <rect x="176" y="73" width="72" height="12" rx="6" fill="#ddad87" /><rect x="176" y="94" width="48" height="9" rx="4" fill="#b5caca" />
      <path d="M106 177h50m11 0h19" stroke="#a7beb0" strokeWidth="7" strokeLinecap="round" />
      <g transform="translate(263 142) rotate(-24)"><circle r="36" fill="#deeee6" fillOpacity=".8" stroke="#886950" strokeWidth="9" /><path d="M0 38v47" stroke="#b17b59" strokeWidth="16" strokeLinecap="round" /><path d="m-15 0 11 11 22-25" stroke="#779c89" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g transform="translate(58 126) rotate(-12)"><rect x="-23" y="-28" width="46" height="58" rx="9" fill="#f9df9c" stroke="#bc9568" strokeWidth="3" /><path d="M-11-13h22m-22 13h22m-22 13h13" stroke="#ba936a" strokeWidth="4" strokeLinecap="round" /></g>
      <path d="m306 55 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="#fff5ce" />
      <path d="m310 112 11-5m-23-9 6-11" stroke="#d9a867" strokeWidth="5" strokeLinecap="round" />
    </>}
  </svg>;
}
