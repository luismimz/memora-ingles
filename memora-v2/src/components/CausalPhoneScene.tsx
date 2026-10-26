import { useId } from 'react';
import './causalPhoneScene.css';

/** Only the authored FONDO swallowing PHONE story. Static help keeps the object visible. */
export function CausalPhoneScene({ active, replay = 0, animate = true, decorative = false }: { active: boolean; replay?: number; animate?: boolean; decorative?: boolean }) {
  const clip = `phone-pocket-${useId().replace(/:/g, '')}`;
  return <svg key={replay} className={`causal-phone${active ? ' is-active' : ''}${animate ? ' is-animated' : ''}`} data-mnemonic-scene="phone-fondo" viewBox="0 0 420 300" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : active ? 'El fondo del bolsillo se ha tragado el móvil' : 'El móvil está a punto de caer dentro del bolsillo'}>
    <defs><clipPath id={clip}><rect x="60" y="0" width="300" height="172" /></clipPath></defs>
    <rect width="420" height="300" rx="28" fill="#eedfcb" />
    <ellipse cx="210" cy="255" rx="96" ry="12" fill="#c5af94" opacity=".4" />
    <path d="M116 159H304L290 238Q210 274 130 238Z" fill="#596f93" stroke="#415878" strokeWidth="3" />
    <ellipse cx="210" cy="161" rx="92" ry="16" fill="#344d64" />
    <ellipse className="causal-phone-depth" cx="210" cy="164" rx="67" ry="8" fill="#203342" />
    <g clipPath={`url(#${clip})`}><g className="causal-phone-object">
      <rect x="178" y="43" width="64" height="123" rx="12" fill="#303d4b" stroke="#1d2b38" strokeWidth="3" />
      <rect x="185" y="57" width="50" height="88" rx="5" fill="#92c6b5" />
      <path d="M192 65L228 65L192 111Z" fill="#badfd2" opacity=".6" />
      <path d="M201 50H219" stroke="#8495a5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="210" cy="155" r="4" fill="#8495a5" />
    </g></g>
    <path d="M120 170Q210 197 300 170M132 189L142 233Q210 262 278 233L288 189" fill="none" stroke="#d5e0e9" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" />
  </svg>;
}
