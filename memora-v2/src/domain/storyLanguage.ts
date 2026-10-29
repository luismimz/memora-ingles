import { storyCards, type StoryCard } from './storyJourney';
import type { LessonPiece } from './grammarLesson';
import { normalizeSentenceAnswer, sentenceSpellingRepair } from './sentenceAnswer';

/** Meaning, not position, determines colour in both the mirror and the builder. */
export function storyRole(english: string): LessonPiece['role'] {
  if (/^(I|you|we|he|she|they)$/i.test(english)) return 'subject';
  if (/^(want|have|need|am|don't want|can i have|where is)$/i.test(english)) return 'verb';
  if (/^(cold|my|please|with milk|without milk)$/i.test(english)) return 'change';
  return 'context';
}

export interface StoryVariation { label: string; card: StoryCard }
/** Only previously taught pieces. These are authored alternatives, not generated claims. */
const alternatives: Record<string, {label:string; source:string}[]> = {
  have:[{label:'Lo quiero',source:'hotel-message'}],
  need:[{label:'Lo tengo',source:'have'},{label:'Lo quiero',source:'hotel-message'}],
  'cold-tea':[{label:'Sin frío',source:'order-tea'}],
  'wrong-drink':[{label:'Sí quiero',source:'want'}],
  'train-question':[{label:'Mi billete',source:'where'}],
  'without-milk':[{label:'Con leche',source:'with-milk'}],
};
export function storyVariations(card: StoryCard): StoryVariation[] {
  return [{label:card.id==='without-milk'?'Sin leche':card.id==='cold-tea'?'Con frío':card.id==='wrong-drink'?'No quiero':card.id==='train-question'?'El tren':card.id==='have'?'Lo tengo':'Lo necesito',card},
    ...(alternatives[card.id] ?? []).map(({label,source})=>({label,card:storyCards.find(item=>item.id===source)!}))];
}

/** A stopped, complete draft may get a hint; an unfinished prefix is not an error. */
export function storyWritingCue(input:string,card:StoryCard):string|undefined {
  const repair=sentenceSpellingRepair(input,card.en);
  if(repair) return card.hint;
  const actual=normalizeSentenceAnswer(input).split(/\s+/);
  const expected=normalizeSentenceAnswer(card.en).split(/\s+/);
  if(!input.trim() || actual.length<expected.length || normalizeSentenceAnswer(card.en).startsWith(normalizeSentenceAnswer(input))) return;
  const mismatch=expected.findIndex((word,index)=>word!==actual[index]);
  if(mismatch<0) return 'El mensaje ya está completo. Revisa las palabras que has añadido al final.';
  let offset=0;
  for(const piece of card.chunks ?? []) {
    const length=normalizeSentenceAnswer(piece.en).split(/\s+/).length;
    if(mismatch<offset+length) return `Para «${piece.es}», usa ${piece.en.toUpperCase()}. Conserva el resto de tu mensaje.`;
    offset+=length;
  }
  return card.hint;
}
