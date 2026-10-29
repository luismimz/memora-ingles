import type { StoryCard } from '../domain/storyJourney';

/** One stage across teaching and play. Geometry is local SVG, no external media. */
export function StoryScene({card,solved=false}:{card:StoryCard;solved?:boolean}) {
  return <figure className={`story-scene scene-${card.chapter}${solved?' is-alive':''}`} aria-label={solved?card.reaction:card.title}>
    <svg viewBox="0 0 440 200" aria-hidden="true" className="story-scenery">
      <ellipse cx="220" cy="179" rx="180" ry="13" className="scene-shadow"/>
      {card.chapter===0?<g className="scene-architecture"><path d="M42 150V42h122v108M38 42h130l-15-26H52z"/><path d="M52 42v32h25V42m0 0v32h25V42m0 0v32h25V42m0 0v32h25V42"/><path d="M54 117h99M175 145h160m-127 0-8 36m104-36 8 36"/><circle cx="365" cy="40" r="19"/></g>
      :card.chapter===1?<g className="scene-architecture"><path d="M42 179V28h122v151M65 179V56h76v123M72 74h62M202 145h196v34H202zM218 132v-24h53v24"/><circle cx="126" cy="121" r="3"/><path d="M238 108V97m-10 0h20M311 56h59"/></g>
      :<g className="scene-architecture"><path d="M34 177h372M50 187h340M43 87V22h350v65M65 22v132m308-132v132M154 22v35h134V22"/><circle cx="90" cy="61" r="17"/><path d="M90 49v12l8 5M164 43h112"/><path className="scene-train" d="M214 132V83q0-14 14-14h126q14 0 14 14v49zM229 79h30v24h-30zm43 0h30v24h-30zm43 0h30v24h-30z"/></g>}
    </svg>
    <div className="story-actors" aria-hidden="true">{card.scene.map((emoji,index)=><span key={`${card.id}:${index}`} style={{'--actor':index} as React.CSSProperties}>{emoji}</span>)}</div>
  </figure>;
}
