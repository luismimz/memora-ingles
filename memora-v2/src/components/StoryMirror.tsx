import { useState } from 'react';
import type { StoryCard } from '../domain/storyJourney';
import { storyRole, storyVariations } from '../domain/storyLanguage';
import { SpeechModelButton } from './SpeechModelButton';

/** A live grammar demonstration. Changing intention is exposure, never a scored answer. */
export function StoryMirror({card,selectedId,onExplore,onAudioBusy}:{card:StoryCard;selectedId?:string;onExplore:(variant:StoryCard)=>void;onAudioBusy?:(busy:boolean)=>void}) {
  const [choice,setChoice]=useState(0);
  const variants=storyVariations(card);
  const active=selectedId===undefined?choice:Math.max(0,variants.findIndex(variant=>variant.card.id===selectedId));
  const shown=variants[active]?.card ?? card;
  return <section className="story-mirror" aria-label="Espejo del mensaje">
    {variants.length>1?<div className="story-intentions" role="group" aria-label="Cambia la intención del mensaje">
      {variants.map((variant,index)=><button key={variant.card.id} aria-pressed={active===index} onClick={()=>{if(index===active)return;setChoice(index);onExplore(variant.card);}}>{variant.label}</button>)}
    </div>:null}
    <p className="story-target" aria-live="polite">{shown.es}</p>
    <div className="story-mirror-pieces" key={`pieces:${shown.id}`}>{shown.chunks?.map((part,index)=><div key={part.en} className={`story-piece role-${storyRole(part.en)}`} style={{'--piece-index':index} as React.CSSProperties}><strong lang="en">{part.en}</strong><small lang="es">{part.es}</small></div>)}</div>
    <p className="story-insight">{shown.hint}</p>
    <SpeechModelButton key={`audio:${shown.id}`} text={shown.en} label="Escuchar la frase" idleLabel="Oír la frase" onBusyChange={onAudioBusy}/>
  </section>;
}
