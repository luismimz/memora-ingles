import { expect,it } from 'vitest';
import { storyAccepts,storyBank,storyCards } from './storyJourney';
it('todo montaje combina piezas encontradas antes, sin pedir vocabulario nuevo a ciegas',()=>{
  for(const [index,card] of storyCards.entries()) if(card.kind==='build') {
    for(const piece of card.chunks!) expect(storyCards.slice(0,index).some(previous=>previous.en.toLowerCase().includes(piece.en.toLowerCase()))).toBe(true);
  }
});
it('cada montaje produce su mensaje y no viene ya resuelto',()=>{for(const card of storyCards.filter(item=>item.kind==='build')){expect(storyAccepts(card.chunks!.map(item=>item.en).join(' '),card.en)).toBe(true);expect(storyAccepts(storyBank(card).map(item=>item.en).join(' '),card.en)).toBe(false);}});
it('las opciones son distintas e incluyen una solución',()=>{for(const card of storyCards.filter(item=>item.options)){expect(new Set(card.options!.map(item=>item.value)).size).toBe(card.options!.length);expect(card.options!.some(item=>item.value===card.answer)).toBe(true);}});
it('los mensajes del Arcade han sido enseñados antes y no se temporiza enseñanza',()=>{for(const [index,card]of storyCards.entries()){if(card.timed){expect(['decide','repair']).toContain(card.kind);expect(storyCards.slice(0,index).some(previous=>storyAccepts(previous.en,card.en))).toBe(true);}}});
it('las reparaciones tienen un solo hueco y lo resuelven con una pieza ya enseñada',()=>{for(const [index,card]of storyCards.entries()){if(card.kind==='repair'){expect(card.frame!.split('___')).toHaveLength(2);expect(storyAccepts(card.frame!.replace('___',card.answer!),card.en)).toBe(true);for(const option of card.options!)expect(storyCards.slice(0,index).some(previous=>previous.en.toLowerCase().includes(option.text.toLowerCase()))).toBe(true);}}});
it('cada escritura aparece después de sus piezas y tiene un rescate completo',()=>{for(const [index,card]of storyCards.entries()){if(card.kind==='write'){expect(card.chunks!.every(part=>storyCards.slice(0,index).some(previous=>previous.en.toLowerCase().includes(part.en.toLowerCase())))).toBe(true);expect(storyAccepts(card.chunks!.map(part=>part.en).join(' '),card.en)).toBe(true);}}});
