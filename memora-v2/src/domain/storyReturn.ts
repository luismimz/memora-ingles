import { storyCards, storyJourney, type StoryCard } from './storyJourney';
import type { LearningActivity } from './learningActivity';

// Prepared transfer, not an infinite random generator. Every source precedes
// the skipped task; the new message changes an object or communicative intent.
const transfers: Record<string,{source:string;title:string}> = {
  'order-tea':{source:'want',title:'Esta vez, pide algo para ti.'},
  'cold-coffee':{source:'cold-tea',title:'El dinosaurio también quiere una bebida fría.'},
  'hotel-message':{source:'have',title:'En recepción, cuenta lo que ya tienes.'},
  'refuse-tea':{source:'wrong-drink',title:'Ahora te ofrecen café. No lo quieres.'},
  'recall-cafe':{source:'cold-tea',title:'En la terraza, pide té frío.'},
  'ticket-message':{source:'need',title:'Vuelves al hotel y necesitas entrar.'},
  'polite-ticket':{source:'polite-request',title:'Pide la llave con amabilidad.'},
  'find-key':{source:'where',title:'La llave aparece; ahora falta tu billete.'},
  'recall-key':{source:'have',title:'Ya encontraste la llave. Cuéntalo.'},
};
export function storyTransfer(original:StoryCard):StoryCard|undefined {
  const variant=transfers[original.id];
  const source=variant && storyCards.find(card=>card.id===variant.source);
  if(!source) return;
  return {...source,id:original.id,chapter:original.chapter,kind:original.kind==='write'?'write':'build',title:variant.title,
    reaction:'Has usado las piezas para otro mensaje.',timed:false,answer:undefined};
}

/** Navigation only. Memory dates and learning evidence remain in their engines. */
export function pendingStoryReturns(events:LearningActivity[],through:number,limit=1):string[] {
  const latest=new Map<string,LearningActivity>();
  for(const event of events) if(event.unitId===storyJourney.id && event.skill.startsWith('story:')) latest.set(event.skill.slice(6),event);
  return storyCards.slice(0,Math.max(0,through-2)).filter(card=>storyTransfer(card) && latest.get(card.id)?.feedback==='story:omitted')
    .map(card=>card.id).slice(0,limit);
}
