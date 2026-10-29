import {expect,it} from 'vitest';
import {storyCards,storyJourney,storyAccepts} from './storyJourney';
import {pendingStoryReturns,storyTransfer} from './storyReturn';
import type {LearningActivity} from './learningActivity';
const omitted=(id:string,feedback='story:omitted')=>({unitId:storyJourney.id,skill:`story:${id}`,feedback} as LearningActivity);
it('vuelve con otro mensaje formado por piezas ya preparadas y conserva su ID de navegación',()=>{
  for(const [index,card] of storyCards.entries()) {
    const next=storyTransfer(card); if(!next)continue;
    expect(next.id).toBe(card.id);
    expect(storyAccepts(next.en,card.en)).toBe(false);
    expect(storyAccepts(next.chunks!.map(part=>part.en).join(' '),next.en)).toBe(true);
    for(const part of next.chunks!) expect(storyCards.slice(0,index).some(previous=>previous.chunks?.some(piece=>piece.en===part.en))).toBe(true);
  }
});
it('no repite al instante ni devuelve de nuevo una oportunidad ya ofrecida',()=>{
  const index=storyCards.findIndex(card=>card.id==='order-tea');
  const event=omitted('order-tea');
  expect(pendingStoryReturns([event],index+2)).toEqual([]);
  expect(pendingStoryReturns([event],index+3)).toEqual(['order-tea']);
  expect(pendingStoryReturns([event,omitted('order-tea','story:returned')],storyCards.length)).toEqual([]);
  expect(pendingStoryReturns([{...event,unitId:'other'}],storyCards.length)).toEqual([]);
});
it('limita la vuelta a una tarea y no convierte cualquier fallo o consulta en una omisión',()=>{
  expect(pendingStoryReturns([omitted('order-tea'),omitted('cold-coffee')],storyCards.length)).toEqual(['order-tea']);
  expect(pendingStoryReturns([omitted('order-tea','')],storyCards.length)).toEqual([]);
});
