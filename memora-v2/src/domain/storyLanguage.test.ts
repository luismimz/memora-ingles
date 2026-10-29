import {expect,it} from 'vitest';
import {storyRole,storyVariations,storyWritingCue} from './storyLanguage';
import {storyAccepts,storyCards} from './storyJourney';
it('da a la misma función el mismo color independientemente de su posición',()=>{
  expect(storyRole('I')).toBe('subject');
  expect(storyRole('want')).toBe('verb');
  expect(storyRole('a key')).toBe('context');
  expect(storyRole('cold')).toBe('change');
  expect(storyRole('Where is')).toBe('verb');
});
it('las variantes se pueden construir y no introducen piezas desconocidas',()=>{
  for(const [index,card] of storyCards.entries()) {
    for(const variant of storyVariations(card).slice(1)) {
      expect(storyAccepts(variant.card.chunks!.map(part=>part.en).join(' '),variant.card.en)).toBe(true);
      for(const part of variant.card.chunks!) expect(storyCards.slice(0,index+1).some(before=>before.chunks?.some(taught=>taught.en===part.en))).toBe(true);
    }
  }
});
it('espera un borrador completo antes de ofrecer una pista específica sin evaluarlo',()=>{
  const card=storyCards.find(card=>card.id==='recall-cafe')!;
  expect(storyWritingCue('i want',card)).toBeUndefined();
  expect(storyWritingCue('i want cold cof',card)).toBeUndefined();
  expect(storyWritingCue('i want cold coffee',card)).toBeUndefined();
  expect(storyWritingCue('i want warm coffee',card)).toContain('COLD');
  expect(storyWritingCue('i want cold coffee please',card)).toContain('final');
});
