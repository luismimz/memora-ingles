import { expect, it } from 'vitest';
import { sentenceDraftCue } from './sentenceAnswer';

it('señala solo piezas propias casi completas sin escribir la solución', () => {
  expect(sentenceDraftCue('j am cooking meet', 'I am cooking meat.')).toBe('Revisa «j» y «meet».');
  expect(sentenceDraftCue('I am cookign meat', 'I am cooking meat.')).toBe('Revisa «cookign».');
});
it.each(['I am', 'I am cooking mea', 'I am cooking meat', "I'm cooking meat", 'wrong wrong wrong word', 'I am cooking meat extra'])('no diagnostica un prefijo, contracción, respuesta correcta o texto lejano: %s', (draft) => {
  expect(sentenceDraftCue(draft, 'I am cooking meat.')).toBeUndefined();
});
